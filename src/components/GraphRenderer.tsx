import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as math from 'mathjs';

export interface GraphProps {
  expression: string;
  domain?: [number, number];
  yDomain?: [number, number] | 'auto';
  xLabel?: string;
  yLabel?: string;
  color?: string;
  strokeWidth?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  showGrid?: boolean;
  height?: number;
  title?: string;
  graphType?: 'function' | 'geometry' | 'svg';
  svgContent?: string;
  geometryType?: 'right-triangle' | 'circle' | 'parallel-lines' | 'triangle-height' | 'cartesian-vector' | 'trapezoid';
  geometryParams?: {
    labelA?: string;
    labelB?: string;
    labelC?: string;
    labelAngle?: string;
    labelSideA?: string;
    labelSideB?: string;
    labelHypotenuse?: string;
    radiusLabel?: string;
    angleLabel?: string;
    color?: string;
    customText?: string;
  };
}

export const GraphRenderer: React.FC<GraphProps> = ({ 
  expression, 
  domain = [-10, 10],
  yDomain = 'auto',
  xLabel = 'x',
  yLabel = 'y',
  color = '#1e3a8a', // Default Nash Academy Blue
  strokeWidth = 3,
  lineStyle = 'solid',
  showGrid = true,
  height = 240,
  title,
  graphType = 'function',
  svgContent,
  geometryType = 'right-triangle',
  geometryParams = {},
}) => {
  // Check if content itself is an SVG string or if graphType is svg/geometry
  const isDirectSvg = (expression && expression.trim().startsWith('<svg')) || graphType === 'svg';
  const isGeometry = graphType === 'geometry' || (!isDirectSvg && geometryType && expression?.startsWith('geometry:'));

  // 1. Render Direct SVG
  if (isDirectSvg) {
    const rawSvg = svgContent || expression;
    return (
      <div className="w-full flex flex-col items-center justify-center p-3 bg-white/90 rounded-xl border border-slate-200 shadow-sm print:shadow-none">
        {title && <div className="text-xs font-bold text-slate-700 mb-2">{title}</div>}
        <div 
          className="w-full max-w-md flex items-center justify-center overflow-x-auto" 
          style={{ minHeight: `${height}px` }}
          dangerouslySetInnerHTML={{ __html: rawSvg }} 
        />
      </div>
    );
  }

  // 2. Render Geometry Preset
  if (isGeometry) {
    const p = geometryParams;
    const geomColor = p.color || color || '#1e3a8a';
    const activeType = geometryType || (expression?.replace('geometry:', '') as any) || 'right-triangle';

    let svgEl: React.ReactNode = null;

    if (activeType === 'right-triangle') {
      svgEl = (
        <svg viewBox="0 0 320 200" className="w-full max-w-sm h-auto">
          {/* Grid background subtle */}
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={geomColor} />
            </marker>
          </defs>
          {/* Triangle ABC */}
          <polygon points="50,160 260,160 50,40" fill={`${geomColor}15`} stroke={geomColor} strokeWidth={strokeWidth} />
          {/* Right Angle Square */}
          <rect x="50" y="140" width="20" height="20" fill="none" stroke={geomColor} strokeWidth="1.5" />
          <circle cx="60" cy="150" r="2" fill={geomColor} />
          {/* Angle Alpha Arc at C (260, 160) */}
          <path d="M 220,160 A 40,40 0 0,0 235,145" fill="none" stroke="#dc2626" strokeWidth="2" />
          <text x="200" y="152" fontSize="13" fontWeight="bold" fill="#dc2626">{p.labelAngle || 'α'}</text>
          {/* Vertices */}
          <text x="35" y="175" fontSize="13" fontWeight="bold" fill="#1e293b">{p.labelA || 'A'}</text>
          <text x="270" y="165" fontSize="13" fontWeight="bold" fill="#1e293b">{p.labelB || 'B'}</text>
          <text x="40" y="32" fontSize="13" fontWeight="bold" fill="#1e293b">{p.labelC || 'C'}</text>
          {/* Side Labels */}
          <text x="25" y="105" fontSize="13" fontWeight="bold" fill={geomColor}>{p.labelSideA || 'a'}</text>
          <text x="150" y="180" fontSize="13" fontWeight="bold" fill={geomColor}>{p.labelSideB || 'b'}</text>
          <text x="165" y="90" fontSize="13" fontWeight="bold" fill="#b45309">{p.labelHypotenuse || 'c'}</text>
        </svg>
      );
    } else if (activeType === 'circle') {
      svgEl = (
        <svg viewBox="0 0 320 200" className="w-full max-w-sm h-auto">
          {/* Circle */}
          <circle cx="160" cy="100" r="70" fill={`${geomColor}10`} stroke={geomColor} strokeWidth={strokeWidth} />
          {/* Center */}
          <circle cx="160" cy="100" r="3.5" fill="#dc2626" />
          <text x="165" y="95" fontSize="12" fontWeight="bold" fill="#dc2626">O</text>
          {/* Radius line */}
          <line x1="160" y1="100" x2="225" y2="70" stroke={geomColor} strokeWidth="2" strokeDasharray="4 2" />
          <circle cx="225" cy="70" r="3" fill={geomColor} />
          <text x="195" y="80" fontSize="12" fontWeight="bold" fill={geomColor}>{p.radiusLabel || 'R'}</text>
          {/* Sector Arc */}
          <line x1="160" y1="100" x2="230" y2="100" stroke={geomColor} strokeWidth="2" />
          <path d="M 190,100 A 30,30 0 0,0 187,87" fill="none" stroke="#d97706" strokeWidth="2" />
          <text x="195" y="100" fontSize="11" fontWeight="bold" fill="#d97706">{p.angleLabel || 'θ'}</text>
          {/* Tangent line */}
          <line x1="230" y1="30" x2="230" y2="170" stroke="#059669" strokeWidth="2" strokeDasharray="3 3" />
          <text x="236" y="45" fontSize="11" fontWeight="bold" fill="#059669">Recta Tangente</text>
        </svg>
      );
    } else if (activeType === 'parallel-lines') {
      svgEl = (
        <svg viewBox="0 0 320 200" className="w-full max-w-sm h-auto">
          {/* Parallel Line 1 */}
          <line x1="40" y1="60" x2="280" y2="60" stroke={geomColor} strokeWidth={strokeWidth} />
          <text x="286" y="64" fontSize="12" fontWeight="bold" fill={geomColor}>L₁</text>
          {/* Parallel Line 2 */}
          <line x1="40" y1="140" x2="280" y2="140" stroke={geomColor} strokeWidth={strokeWidth} />
          <text x="286" y="144" fontSize="12" fontWeight="bold" fill={geomColor}>L₂</text>
          {/* Transversal Line */}
          <line x1="90" y1="180" x2="230" y2="20" stroke="#dc2626" strokeWidth="2.5" />
          <text x="235" y="24" fontSize="12" fontWeight="bold" fill="#dc2626">S</text>
          {/* Angle Alpha at top intersection (195, 60) */}
          <path d="M 175,60 A 20,20 0 0,1 185,48" fill="none" stroke="#d97706" strokeWidth="2" />
          <text x="160" y="52" fontSize="12" fontWeight="bold" fill="#d97706">{p.labelAngle || 'α'}</text>
          {/* Angle Beta at bottom intersection (125, 140) */}
          <path d="M 145,140 A 20,20 0 0,1 135,152" fill="none" stroke="#059669" strokeWidth="2" />
          <text x="148" y="156" fontSize="12" fontWeight="bold" fill="#059669">{p.labelB || 'β'}</text>
          <text x="70" y="30" fontSize="11" fontStyle="italic" fill="#64748b">L₁ ∥ L₂  ⇒  α = β</text>
        </svg>
      );
    } else if (activeType === 'triangle-height') {
      svgEl = (
        <svg viewBox="0 0 320 200" className="w-full max-w-sm h-auto">
          {/* Triangle */}
          <polygon points="50,160 270,160 180,40" fill={`${geomColor}15`} stroke={geomColor} strokeWidth={strokeWidth} />
          {/* Height Line */}
          <line x1="180" y1="40" x2="180" y2="160" stroke="#dc2626" strokeWidth="2" strokeDasharray="4 3" />
          {/* Right Angle at Base */}
          <rect x="180" y="145" width="15" height="15" fill="none" stroke="#dc2626" strokeWidth="1.5" />
          <circle cx="187" cy="152" r="2" fill="#dc2626" />
          {/* Labels */}
          <text x="185" y="100" fontSize="13" fontWeight="bold" fill="#dc2626">h</text>
          <text x="35" y="170" fontSize="13" fontWeight="bold" fill="#1e293b">A</text>
          <text x="275" y="170" fontSize="13" fontWeight="bold" fill="#1e293b">B</text>
          <text x="175" y="30" fontSize="13" fontWeight="bold" fill="#1e293b">C</text>
          <text x="150" y="180" fontSize="13" fontWeight="bold" fill={geomColor}>b (base)</text>
        </svg>
      );
    } else if (activeType === 'cartesian-vector') {
      svgEl = (
        <svg viewBox="0 0 320 200" className="w-full max-w-sm h-auto">
          <defs>
            <marker id="axisArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
            </marker>
            <marker id="vecArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={geomColor} />
            </marker>
          </defs>
          {/* Axes */}
          <line x1="40" y1="160" x2="280" y2="160" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#axisArrow)" />
          <line x1="60" y1="180" x2="60" y2="25" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#axisArrow)" />
          <text x="285" y="165" fontSize="12" fontWeight="bold" fill="#64748b">X</text>
          <text x="55" y="20" fontSize="12" fontWeight="bold" fill="#64748b">Y</text>
          {/* Vector */}
          <line x1="60" y1="160" x2="220" y2="60" stroke={geomColor} strokeWidth={strokeWidth} markerEnd="url(#vecArrow)" />
          {/* Projections */}
          <line x1="220" y1="60" x2="220" y2="160" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="60" y1="60" x2="220" y2="60" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
          {/* Angle Arc */}
          <path d="M 100,160 A 40,40 0 0,0 95,138" fill="none" stroke="#d97706" strokeWidth="2" />
          <text x="105" y="148" fontSize="12" fontWeight="bold" fill="#d97706">θ</text>
          <text x="140" y="95" fontSize="13" fontWeight="bold" fill={geomColor}>v⃗ = (x, y)</text>
          <text x="215" y="175" fontSize="11" fontWeight="bold" fill="#64748b">x₀</text>
          <text x="40" y="65" fontSize="11" fontWeight="bold" fill="#64748b">y₀</text>
        </svg>
      );
    } else {
      // Trapezoid
      svgEl = (
        <svg viewBox="0 0 320 200" className="w-full max-w-sm h-auto">
          <polygon points="40,160 280,160 220,50 100,50" fill={`${geomColor}15`} stroke={geomColor} strokeWidth={strokeWidth} />
          <line x1="100" y1="50" x2="100" y2="160" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="3 3" />
          <rect x="100" y="148" width="12" height="12" fill="none" stroke="#dc2626" strokeWidth="1.5" />
          <text x="85" y="110" fontSize="12" fontWeight="bold" fill="#dc2626">h</text>
          <text x="155" y="40" fontSize="12" fontWeight="bold" fill={geomColor}>b (base menor)</text>
          <text x="150" y="180" fontSize="12" fontWeight="bold" fill={geomColor}>B (base mayor)</text>
        </svg>
      );
    }

    return (
      <div className="w-full flex flex-col items-center justify-center p-3 bg-white/90 rounded-xl border border-slate-200 shadow-sm print:shadow-none">
        {title && <div className="text-xs font-bold text-slate-700 mb-2">{title}</div>}
        <div className="w-full flex justify-center">{svgEl}</div>
      </div>
    );
  }

  // 3. Render Cartesian Math Function Graph (via mathjs & recharts)
  const data = useMemo(() => {
    const points: { x: number; y: number }[] = [];
    const [min, max] = domain;
    if (min >= max) return points;
    const step = (max - min) / 100;
    
    try {
      // Normalize common functions: 'sin' -> 'sin', 'sen' -> 'sin', '^' etc.
      const cleanExpr = expression.replace(/sen\(/gi, 'sin(');
      const node = math.parse(cleanExpr);
      const code = node.compile();
      
      for (let x = min; x <= max; x += step) {
        try {
          const y = code.evaluate({ x });
          if (!isNaN(y) && isFinite(y)) {
             // constrain y for visual sanity if it explodes
             if (y > 1000 || y < -1000) continue; 
             points.push({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) });
          }
        } catch (e) {
          // Ignore eval errors for specific discontinuity points
        }
      }
    } catch (err) {
       console.error("Invalid math expression", err);
    }
    return points;
  }, [expression, domain]);

  if (data.length === 0) {
    return (
      <div className="p-4 bg-amber-50 text-amber-800 rounded-xl text-sm border border-amber-200 flex flex-col gap-1">
        <span className="font-bold">Ecuación de gráfica no válida o sin puntos:</span>
        <code className="font-mono text-xs text-amber-900 bg-white/80 p-1.5 rounded">{expression}</code>
        <span className="text-xs text-amber-700">Ejemplo válido: <code>x^2 - 4</code>, <code>2*x + 1</code>, <code>sin(x)</code></span>
      </div>
    );
  }

  const dashArray = lineStyle === 'dashed' ? '6 4' : lineStyle === 'dotted' ? '2 2' : undefined;

  return (
    <div 
      className="w-full bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl p-3 relative group shadow-sm print:shadow-none"
      style={{ height: `${height}px` }}
    >
      {title && (
        <div className="text-xs font-bold text-slate-700 text-center mb-1">
          {title}
        </div>
      )}
      <ResponsiveContainer width="100%" height={title ? '90%' : '100%'}>
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.8} />}
          <XAxis 
            dataKey="x" 
            type="number" 
            domain={domain}
            label={{ value: xLabel, position: 'insideBottom', offset: -10, style: { fontSize: 11, fill: '#475569', fontWeight: 'bold' } }}
            tick={{ fontSize: 10, fill: '#64748b' }}
            stroke="#94a3b8"
          />
          <YAxis 
            domain={yDomain === 'auto' ? ['auto', 'auto'] : yDomain}
            label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 0, style: { fontSize: 11, fill: '#475569', fontWeight: 'bold' } }}
            tick={{ fontSize: 10, fill: '#64748b' }}
            stroke="#94a3b8"
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
            labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
            formatter={(value: any) => [value, `f(x)`]}
            labelFormatter={(label: any) => `x = ${label}`}
          />
          <Line 
            type="monotone" 
            dataKey="y" 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray}
            dot={false}
            isAnimationActive={false} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
