import React, { useState } from 'react';
import { GraphRenderer, GraphProps } from './GraphRenderer';
import { Palette, Sliders, Shapes, Code, Sparkles, Check } from 'lucide-react';

interface GraphEditorProps {
  content: string;
  metadata?: any;
  onChange: (content: string, metadata: any) => void;
}

const COLOR_PALETTE = [
  { name: 'Azul Nash', hex: '#1e3a8a' },
  { name: 'Índigo', hex: '#4f46e5' },
  { name: 'Esmeralda', hex: '#059669' },
  { name: 'Rojo Carmesí', hex: '#dc2626' },
  { name: 'Ámbar Cálido', hex: '#d97706' },
  { name: 'Púrpura', hex: '#7c3aed' },
  { name: 'Gris Carbón', hex: '#334155' },
];

const FUNCTION_PRESETS = [
  { label: 'Parábola', expr: 'x^2 - 4' },
  { label: 'Cúbica', expr: 'x^3 - 3*x' },
  { label: 'Seno', expr: 'sin(x)' },
  { label: 'Coseno', expr: 'cos(x)' },
  { label: 'Raíz', expr: 'sqrt(x + 5)' },
  { label: 'Racional (1/x)', expr: '1/x' },
  { label: 'Exponencial', expr: '2^x' },
  { label: 'Lineal', expr: '2*x - 1' },
];

export const GraphEditor: React.FC<GraphEditorProps> = ({
  content,
  metadata = {},
  onChange,
}) => {
  const [activeTab, setActiveTab] = useState<'function' | 'geometry' | 'svg'>(
    metadata?.graphType || (content?.trim().startsWith('<svg') ? 'svg' : content?.startsWith('geometry:') ? 'geometry' : 'function')
  );

  // Function parameters
  const expression = activeTab === 'function' ? (content?.startsWith('geometry:') || content?.startsWith('<svg') ? 'x^2' : content || 'x^2 - 4') : content;
  const domain = metadata?.domain || [-10, 10];
  const color = metadata?.color || '#1e3a8a';
  const strokeWidth = metadata?.strokeWidth || 3;
  const lineStyle = metadata?.lineStyle || 'solid';
  const showGrid = metadata?.showGrid !== false;
  const height = metadata?.height || 240;
  const xLabel = metadata?.xLabel || 'x';
  const yLabel = metadata?.yLabel || 'y';
  const title = metadata?.title || '';

  // Geometry parameters
  const geometryType = metadata?.geometryType || 'right-triangle';
  const geometryParams = metadata?.geometryParams || {
    labelA: 'A',
    labelB: 'B',
    labelC: 'C',
    labelAngle: 'α',
    labelSideA: 'a',
    labelSideB: 'b',
    labelHypotenuse: 'c',
    radiusLabel: 'R',
    angleLabel: 'θ',
  };

  const handleUpdate = (newContent: string, newMeta: any) => {
    onChange(newContent, { ...metadata, ...newMeta });
  };

  return (
    <div className="flex flex-col gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-200 shadow-sm">
      {/* Editor Mode Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
          <button
            id="tab-graph-function"
            onClick={() => {
              setActiveTab('function');
              handleUpdate(expression || 'x^2', { graphType: 'function' });
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'function'
                ? 'bg-blue-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Función f(x)
          </button>

          <button
            id="tab-graph-geometry"
            onClick={() => {
              setActiveTab('geometry');
              handleUpdate(`geometry:${geometryType}`, { graphType: 'geometry', geometryType });
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'geometry'
                ? 'bg-blue-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Shapes className="w-3.5 h-3.5" />
            Geometría & Figuras
          </button>

          <button
            id="tab-graph-svg"
            onClick={() => {
              setActiveTab('svg');
              handleUpdate(content?.startsWith('<svg') ? content : '<svg viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg"><circle cx="150" cy="75" r="50" fill="#1e3a8a20" stroke="#1e3a8a" stroke-width="2"/></svg>', { graphType: 'svg' });
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'svg'
                ? 'bg-blue-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Código SVG
          </button>
        </div>

        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
          Editor de Gráficos Nash
        </span>
      </div>

      {/* TAB 1: FUNCTION GRAPH CONTROLS */}
      {activeTab === 'function' && (
        <div className="flex flex-col gap-3">
          {/* Function expression input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span>Ecuación de la función:</span>
                <span className="font-mono text-blue-800">f(x) =</span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Usa operadores: +, -, *, /, ^, sin(), cos(), sqrt()</span>
            </div>
            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-2 shadow-sm focus-within:border-blue-700">
              <span className="font-mono font-bold text-blue-900 text-sm">f(x) =</span>
              <input
                id="input-graph-expression"
                type="text"
                className="flex-1 font-mono text-sm bg-transparent focus:outline-none text-slate-900"
                value={expression}
                onChange={(e) => handleUpdate(e.target.value, { graphType: 'function' })}
                placeholder="ej: x^2 - 4, sin(x), 2*x + 1"
              />
            </div>
          </div>

          {/* Quick Presets Buttons */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Preajustes:</span>
            {FUNCTION_PRESETS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleUpdate(p.expr, { graphType: 'function' })}
                className="px-2 py-1 bg-white hover:bg-blue-50 text-blue-900 text-xs font-medium rounded-md border border-slate-200 transition-colors shadow-2xs hover:border-blue-300"
              >
                {p.label} <span className="font-mono text-[10px] text-slate-400">({p.expr})</span>
              </button>
            ))}
          </div>

          {/* Customization Grid: Domain, Color, Style, Grid, Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-slate-200">
            {/* Domain X */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-600">Dominio X [mín, máx]:</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  className="w-1/2 p-1.5 text-xs font-mono border border-slate-200 rounded text-center"
                  value={domain[0]}
                  onChange={(e) => handleUpdate(expression, { domain: [Number(e.target.value), domain[1]] })}
                />
                <span className="text-slate-400 text-xs">a</span>
                <input
                  type="number"
                  className="w-1/2 p-1.5 text-xs font-mono border border-slate-200 rounded text-center"
                  value={domain[1]}
                  onChange={(e) => handleUpdate(expression, { domain: [domain[0], Number(e.target.value)] })}
                />
              </div>
            </div>

            {/* Color Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                <Palette className="w-3 h-3 text-slate-400" /> Color de Curva:
              </label>
              <div className="flex items-center gap-1.5 pt-0.5">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => handleUpdate(expression, { color: c.hex })}
                    title={c.name}
                    className={`w-5 h-5 rounded-full border transition-all ${
                      color === c.hex ? 'ring-2 ring-blue-700 ring-offset-1 scale-110' : 'border-slate-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            {/* Line Style & Stroke Width */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-600">Grosor y Trazo:</label>
              <div className="flex items-center gap-1.5">
                <select
                  value={strokeWidth}
                  onChange={(e) => handleUpdate(expression, { strokeWidth: Number(e.target.value) })}
                  className="p-1 text-xs border border-slate-200 rounded bg-white font-medium"
                >
                  <option value="1">1px (Fino)</option>
                  <option value="2">2px (Normal)</option>
                  <option value="3">3px (Destacado)</option>
                  <option value="4">4px (Grueso)</option>
                </select>
                <select
                  value={lineStyle}
                  onChange={(e) => handleUpdate(expression, { lineStyle: e.target.value })}
                  className="p-1 text-xs border border-slate-200 rounded bg-white font-medium flex-1"
                >
                  <option value="solid">Sólida</option>
                  <option value="dashed">Guiones</option>
                  <option value="dotted">Puntos</option>
                </select>
              </div>
            </div>

            {/* Height & Grid Toggle */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-600">Altura & Cuadrícula:</label>
              <div className="flex items-center gap-2">
                <select
                  value={height}
                  onChange={(e) => handleUpdate(expression, { height: Number(e.target.value) })}
                  className="p-1 text-xs border border-slate-200 rounded bg-white font-medium flex-1"
                >
                  <option value="180">180px (Compacto)</option>
                  <option value="240">240px (Estándar)</option>
                  <option value="300">300px (Grande)</option>
                </select>
                <label className="flex items-center gap-1 text-xs text-slate-600 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => handleUpdate(expression, { showGrid: e.target.checked })}
                    className="rounded text-blue-700"
                  />
                  <span>Grid</span>
                </label>
              </div>
            </div>
          </div>

          {/* Labels & Title */}
          <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1 flex-1">
              <span className="text-xs font-bold text-slate-500">Título:</span>
              <input
                type="text"
                placeholder="ej: Gráfica de la función cuadrática"
                className="w-full text-xs p-1 border-b border-slate-200 focus:outline-none focus:border-blue-700"
                value={title}
                onChange={(e) => handleUpdate(expression, { title: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-slate-500">Eje X:</span>
              <input
                type="text"
                className="w-12 text-xs p-1 text-center border border-slate-200 rounded"
                value={xLabel}
                onChange={(e) => handleUpdate(expression, { xLabel: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-slate-500">Eje Y:</span>
              <input
                type="text"
                className="w-12 text-xs p-1 text-center border border-slate-200 rounded"
                value={yLabel}
                onChange={(e) => handleUpdate(expression, { yLabel: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GEOMETRY PRESETS CONTROLS */}
      {activeTab === 'geometry' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-700">Seleccionar Figura Geométrica Preuniversitaria:</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'right-triangle', label: 'Triángulo Rectángulo', desc: 'Con catetos y ángulo α' },
                { id: 'circle', label: 'Circunferencia', desc: 'Con radio R, centro y tangente' },
                { id: 'parallel-lines', label: 'Rectas Paralelas L₁ ∥ L₂', desc: 'Cortadas por secante' },
                { id: 'triangle-height', label: 'Triángulo con Altura', desc: 'Vértices A, B, C y altura h' },
                { id: 'cartesian-vector', label: 'Vector en el Plano', desc: 'Ejes X-Y y ángulo θ' },
                { id: 'trapezoid', label: 'Trapecio', desc: 'Bases mayor, menor y altura' },
              ].map((geom) => (
                <button
                  key={geom.id}
                  onClick={() => {
                    handleUpdate(`geometry:${geom.id}`, { graphType: 'geometry', geometryType: geom.id });
                  }}
                  className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                    geometryType === geom.id
                      ? 'bg-blue-50/80 border-blue-600 shadow-sm'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className={`text-xs font-bold ${geometryType === geom.id ? 'text-blue-900' : 'text-slate-800'}`}>
                    {geom.label}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">{geom.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Customizable parameters for the chosen geometry */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-600">Color:</span>
              <div className="flex items-center gap-1">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => {
                      const newParams = { ...geometryParams, color: c.hex };
                      handleUpdate(`geometry:${geometryType}`, { geometryParams: newParams });
                    }}
                    className={`w-4 h-4 rounded-full border transition-all ${
                      (geometryParams.color || color) === c.hex ? 'ring-2 ring-blue-700 scale-110' : 'border-slate-300'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            {geometryType === 'right-triangle' && (
              <div className="flex flex-wrap gap-2 text-xs">
                <label className="flex items-center gap-1">
                  <span className="font-bold text-slate-500">Ángulo:</span>
                  <input
                    type="text"
                    value={geometryParams.labelAngle || 'α'}
                    onChange={(e) => {
                      const newParams = { ...geometryParams, labelAngle: e.target.value };
                      handleUpdate(`geometry:${geometryType}`, { geometryParams: newParams });
                    }}
                    className="w-10 p-1 border rounded text-center font-bold text-red-600"
                  />
                </label>
                <label className="flex items-center gap-1">
                  <span className="font-bold text-slate-500">Cateto a:</span>
                  <input
                    type="text"
                    value={geometryParams.labelSideA || 'a'}
                    onChange={(e) => {
                      const newParams = { ...geometryParams, labelSideA: e.target.value };
                      handleUpdate(`geometry:${geometryType}`, { geometryParams: newParams });
                    }}
                    className="w-10 p-1 border rounded text-center font-bold"
                  />
                </label>
                <label className="flex items-center gap-1">
                  <span className="font-bold text-slate-500">Cateto b:</span>
                  <input
                    type="text"
                    value={geometryParams.labelSideB || 'b'}
                    onChange={(e) => {
                      const newParams = { ...geometryParams, labelSideB: e.target.value };
                      handleUpdate(`geometry:${geometryType}`, { geometryParams: newParams });
                    }}
                    className="w-10 p-1 border rounded text-center font-bold"
                  />
                </label>
                <label className="flex items-center gap-1">
                  <span className="font-bold text-slate-500">Hipotenusa c:</span>
                  <input
                    type="text"
                    value={geometryParams.labelHypotenuse || 'c'}
                    onChange={(e) => {
                      const newParams = { ...geometryParams, labelHypotenuse: e.target.value };
                      handleUpdate(`geometry:${geometryType}`, { geometryParams: newParams });
                    }}
                    className="w-10 p-1 border rounded text-center font-bold text-amber-700"
                  />
                </label>
              </div>
            )}

            {geometryType === 'circle' && (
              <div className="flex flex-wrap gap-2 text-xs">
                <label className="flex items-center gap-1">
                  <span className="font-bold text-slate-500">Radio:</span>
                  <input
                    type="text"
                    value={geometryParams.radiusLabel || 'R'}
                    onChange={(e) => {
                      const newParams = { ...geometryParams, radiusLabel: e.target.value };
                      handleUpdate(`geometry:${geometryType}`, { geometryParams: newParams });
                    }}
                    className="w-10 p-1 border rounded text-center font-bold"
                  />
                </label>
                <label className="flex items-center gap-1">
                  <span className="font-bold text-slate-500">Ángulo central:</span>
                  <input
                    type="text"
                    value={geometryParams.angleLabel || 'θ'}
                    onChange={(e) => {
                      const newParams = { ...geometryParams, angleLabel: e.target.value };
                      handleUpdate(`geometry:${geometryType}`, { geometryParams: newParams });
                    }}
                    className="w-10 p-1 border rounded text-center font-bold text-amber-700"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: RAW SVG CONTROLS */}
      {activeTab === 'svg' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">Código SVG Vectorial:</label>
            <span className="text-[10px] text-slate-400">Edición libre de diagramas SVG</span>
          </div>
          <textarea
            className="w-full font-mono text-xs p-3 bg-slate-900 text-emerald-400 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500 min-h-[120px]"
            value={content}
            onChange={(e) => handleUpdate(e.target.value, { graphType: 'svg' })}
            placeholder='<svg viewBox="0 0 300 200">...</svg>'
          />
        </div>
      )}

      {/* LIVE PREVIEW BOX */}
      <div className="flex flex-col gap-1 pt-1">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Vista Previa en Vivo:
        </span>
        <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs bg-white">
          <GraphRenderer
            expression={activeTab === 'function' ? expression : content}
            domain={domain}
            color={geometryParams.color || color}
            strokeWidth={strokeWidth}
            lineStyle={lineStyle as any}
            showGrid={showGrid}
            height={height}
            xLabel={xLabel}
            yLabel={yLabel}
            title={title}
            graphType={activeTab}
            geometryType={geometryType}
            geometryParams={geometryParams}
          />
        </div>
      </div>
    </div>
  );
};
