import React, { useState } from 'react';
import { X, BookOpen, Layers, Check, Sliders, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { MarginConfig } from '../types';

interface MarginsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: MarginConfig;
  onSave: (newConfig: MarginConfig) => void;
}

export const DEFAULT_MARGIN_CONFIG: MarginConfig = {
  preset: 'empaste',
  marginTop: 56,        // ~18mm (espacio superior generoso para guillotina y encabezados oficiales)
  marginBottom: 64,     // ~20.5mm (espacio inferior generoso para proteger numeración y pie de página)
  marginLeft: 42,       // ~13.5mm
  marginRight: 42,      // ~13.5mm
  bindingGutter: 58,    // ~18.5mm margen de lomo amplio para empaste profesional sin que el texto se oculte
  mirrorMargins: true,  // márgenes alternados par/impar para libro físico
  showBindingGuide: false,
};

export const MarginsModal: React.FC<MarginsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
}) => {
  const [currentConfig, setCurrentConfig] = useState<MarginConfig>(() => {
    return {
      ...DEFAULT_MARGIN_CONFIG,
      ...(config || {}),
    };
  });

  if (!isOpen) return null;

  const applyPreset = (presetKey: 'empaste' | 'empaste_amplio' | 'anillado' | 'normal' | 'compacto') => {
    if (presetKey === 'empaste') {
      setCurrentConfig({
        preset: 'empaste',
        marginTop: 56,
        marginBottom: 64,
        marginLeft: 42,
        marginRight: 42,
        bindingGutter: 58,
        mirrorMargins: true,
        showBindingGuide: currentConfig.showBindingGuide,
      });
    } else if (presetKey === 'empaste_amplio') {
      setCurrentConfig({
        preset: 'empaste',
        marginTop: 68,
        marginBottom: 76,
        marginLeft: 48,
        marginRight: 48,
        bindingGutter: 68,
        mirrorMargins: true,
        showBindingGuide: currentConfig.showBindingGuide,
      });
    } else if (presetKey === 'anillado') {
      setCurrentConfig({
        preset: 'anillado',
        marginTop: 54,
        marginBottom: 62,
        marginLeft: 40,
        marginRight: 40,
        bindingGutter: 62,
        mirrorMargins: false,
        showBindingGuide: currentConfig.showBindingGuide,
      });
    } else if (presetKey === 'normal') {
      setCurrentConfig({
        preset: 'normal',
        marginTop: 48,
        marginBottom: 56,
        marginLeft: 42,
        marginRight: 42,
        bindingGutter: 0,
        mirrorMargins: false,
        showBindingGuide: false,
      });
    } else if (presetKey === 'compacto') {
      setCurrentConfig({
        preset: 'compacto',
        marginTop: 36,
        marginBottom: 42,
        marginLeft: 34,
        marginRight: 34,
        bindingGutter: 0,
        mirrorMargins: false,
        showBindingGuide: false,
      });
    }
  };

  const adjustAllMargins = (deltaPx: number) => {
    setCurrentConfig(prev => ({
      ...prev,
      preset: 'custom',
      marginTop: Math.max(20, Math.min(100, (prev.marginTop || 56) + deltaPx)),
      marginBottom: Math.max(24, Math.min(110, (prev.marginBottom || 64) + deltaPx)),
      marginLeft: Math.max(20, Math.min(80, (prev.marginLeft || 42) + deltaPx)),
      marginRight: Math.max(20, Math.min(80, (prev.marginRight || 42) + deltaPx)),
      bindingGutter: (prev.bindingGutter || 0) > 0 ? Math.max(20, Math.min(100, (prev.bindingGutter || 58) + deltaPx)) : 0,
    }));
  };

  const pxToMm = (px: number) => Math.round((px * 25.4) / 96);

  const handleSave = () => {
    onSave(currentConfig);
    try {
      localStorage.setItem('nash_book_margins', JSON.stringify(currentConfig));
    } catch {}
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-linear-to-r from-sky-50/70 via-white to-indigo-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Regulación de Márgenes y Espacio para Empaste
              </h3>
              <p className="text-xs text-slate-500">
                Ajusta el margen vertical y el espacio de lomo para libros impresos, anillados o empastados.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Presets Selection */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Plantillas Rápidas de Encuadernación
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => adjustAllMargins(8)}
                  className="px-2.5 py-1 text-[11px] font-bold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                  title="Aumentar todos los márgenes un poco más (+2.5mm / 8px)"
                >
                  <span>+ Aumentar Márgenes</span>
                </button>
                <button
                  type="button"
                  onClick={() => adjustAllMargins(-8)}
                  className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors shadow-2xs"
                  title="Reducir márgenes (-2.5mm / 8px)"
                >
                  <span>- Reducir</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {/* Preset Empaste Oficial */}
              <button
                type="button"
                onClick={() => applyPreset('empaste')}
                className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                  currentConfig.preset === 'empaste' && (currentConfig.marginTop || 0) <= 60
                    ? 'border-sky-500 bg-sky-50/80 shadow-xs ring-2 ring-sky-400/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] font-bold text-slate-800">📚 Empaste</span>
                    {currentConfig.preset === 'empaste' && (currentConfig.marginTop || 0) <= 60 && (
                      <Check className="w-3.5 h-3.5 text-sky-600" />
                    )}
                  </div>
                  <div className="text-[9.5px] text-slate-500 mt-1 leading-tight">
                    Lomo 18mm con doble cara alternada.
                  </div>
                </div>
                <span className="text-[9px] font-bold text-sky-700 mt-2 inline-block">Recomendado</span>
              </button>

              {/* Preset Empaste Extra Amplio */}
              <button
                type="button"
                onClick={() => applyPreset('empaste_amplio')}
                className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                  currentConfig.preset === 'empaste' && (currentConfig.marginTop || 0) > 60
                    ? 'border-amber-500 bg-amber-50/80 shadow-xs ring-2 ring-amber-400/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] font-bold text-amber-900">📖 Lomo Extra</span>
                    {currentConfig.preset === 'empaste' && (currentConfig.marginTop || 0) > 60 && (
                      <Check className="w-3.5 h-3.5 text-amber-600" />
                    )}
                  </div>
                  <div className="text-[9.5px] text-slate-500 mt-1 leading-tight">
                    Márgenes más amplios (21mm) para tomos.
                  </div>
                </div>
                <span className="text-[9px] font-bold text-amber-700 mt-2 inline-block">Extra Amplio</span>
              </button>

              {/* Preset Anillado */}
              <button
                type="button"
                onClick={() => applyPreset('anillado')}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  currentConfig.preset === 'anillado'
                    ? 'border-sky-500 bg-sky-50/80 shadow-xs ring-2 ring-sky-400/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] font-bold text-slate-800">🌀 Anillado</span>
                    {currentConfig.preset === 'anillado' && (
                      <Check className="w-3.5 h-3.5 text-sky-600" />
                    )}
                  </div>
                  <div className="text-[9.5px] text-slate-500 mt-1 leading-tight">
                    Margen espiral amplio (20mm).
                  </div>
                </div>
                <span className="text-[9px] font-bold text-slate-400 mt-2 inline-block">Espiral</span>
              </button>

              {/* Preset Normal */}
              <button
                type="button"
                onClick={() => applyPreset('normal')}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  currentConfig.preset === 'normal'
                    ? 'border-sky-500 bg-sky-50/80 shadow-xs ring-2 ring-sky-400/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] font-bold text-slate-800">📄 Estándar</span>
                    {currentConfig.preset === 'normal' && (
                      <Check className="w-3.5 h-3.5 text-sky-600" />
                    )}
                  </div>
                  <div className="text-[9.5px] text-slate-500 mt-1 leading-tight">
                    Márgenes simétricos 15/18mm.
                  </div>
                </div>
                <span className="text-[9px] font-bold text-slate-400 mt-2 inline-block">Grapa</span>
              </button>

              {/* Preset Compacto */}
              <button
                type="button"
                onClick={() => applyPreset('compacto')}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  currentConfig.preset === 'compacto'
                    ? 'border-sky-500 bg-sky-50/80 shadow-xs ring-2 ring-sky-400/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] font-bold text-slate-800">⚡ Compacto</span>
                    {currentConfig.preset === 'compacto' && (
                      <Check className="w-3.5 h-3.5 text-sky-600" />
                    )}
                  </div>
                  <div className="text-[9.5px] text-slate-500 mt-1 leading-tight">
                    Aprovechamiento máximo.
                  </div>
                </div>
                <span className="text-[9px] font-bold text-slate-400 mt-2 inline-block">Económico</span>
              </button>
            </div>
          </div>

          {/* Interactive Spread Preview (Left & Right Book Pages) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-600" />
                Vista Previa de Encuadernación (Página Abierta / Doble Cara)
              </span>
              <span className="text-[11px] text-slate-400">
                Lomo central: {pxToMm(currentConfig.bindingGutter || 0)} mm
              </span>
            </div>

            <div className="bg-slate-200/60 p-4 rounded-lg flex items-center justify-center gap-3">
              {/* Página Izquierda (Par) */}
              <div 
                className="w-40 h-52 bg-white rounded-sm shadow-md border border-slate-300 flex flex-col relative transition-all"
                style={{
                  paddingTop: `${Math.round((currentConfig.marginTop || 30) * 0.35)}px`,
                  paddingBottom: `${Math.round((currentConfig.marginBottom || 36) * 0.35)}px`,
                  paddingLeft: `${Math.round((currentConfig.marginLeft || 24) * 0.35)}px`,
                  paddingRight: currentConfig.mirrorMargins 
                    ? `${Math.round(((currentConfig.marginRight || 24) + (currentConfig.bindingGutter || 0)) * 0.35)}px`
                    : `${Math.round((currentConfig.marginRight || 24) * 0.35)}px`,
                }}
              >
                {/* Lomo Indicator (on right side if mirror margins) */}
                {currentConfig.mirrorMargins && (currentConfig.bindingGutter || 0) > 0 && (
                  <div 
                    className="absolute top-0 right-0 bottom-0 bg-amber-400/25 border-l border-dashed border-amber-500 pointer-events-none flex items-center justify-center"
                    style={{ width: `${Math.round((currentConfig.bindingGutter || 0) * 0.35)}px` }}
                    title="Espacio reservado para empaste/lomo"
                  >
                    <span className="text-[7px] text-amber-800 font-bold -rotate-90 select-none">LOMO</span>
                  </div>
                )}

                {/* Simulated Header */}
                <div className="h-2 bg-slate-300 rounded-xs mb-1.5 w-full shrink-0" />
                {/* Simulated Two Columns */}
                <div className="flex-1 flex gap-1 overflow-hidden">
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="h-1 bg-slate-200 rounded-xs w-full" />
                    <div className="h-1 bg-slate-200 rounded-xs w-4/5" />
                    <div className="h-1 bg-slate-200 rounded-xs w-full" />
                  </div>
                  <div className="w-px bg-slate-300 h-full" />
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="h-1 bg-slate-200 rounded-xs w-full" />
                    <div className="h-1 bg-slate-200 rounded-xs w-3/4" />
                    <div className="h-1 bg-slate-200 rounded-xs w-full" />
                  </div>
                </div>
                {/* Simulated Footer */}
                <div className="h-1.5 bg-slate-300 rounded-xs mt-1.5 w-1/3 self-start shrink-0" />
                <span className="absolute bottom-1 left-2 text-[8px] font-bold text-slate-400">Pág. 2 (Par)</span>
              </div>

              {/* Lomo Central Book Spine Divider */}
              <div className="flex flex-col items-center justify-center gap-1 text-slate-400">
                <div className="w-0.5 h-14 bg-slate-400 rounded-full" />
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest -rotate-90">Costura</span>
                <div className="w-0.5 h-14 bg-slate-400 rounded-full" />
              </div>

              {/* Página Derecha (Impar) */}
              <div 
                className="w-40 h-52 bg-white rounded-sm shadow-md border border-slate-300 flex flex-col relative transition-all"
                style={{
                  paddingTop: `${Math.round((currentConfig.marginTop || 30) * 0.35)}px`,
                  paddingBottom: `${Math.round((currentConfig.marginBottom || 36) * 0.35)}px`,
                  paddingLeft: `${Math.round(((currentConfig.marginLeft || 24) + (currentConfig.bindingGutter || 0)) * 0.35)}px`,
                  paddingRight: `${Math.round((currentConfig.marginRight || 24) * 0.35)}px`,
                }}
              >
                {/* Lomo Indicator (on left side) */}
                {(currentConfig.bindingGutter || 0) > 0 && (
                  <div 
                    className="absolute top-0 left-0 bottom-0 bg-amber-400/25 border-r border-dashed border-amber-500 pointer-events-none flex items-center justify-center"
                    style={{ width: `${Math.round((currentConfig.bindingGutter || 0) * 0.35)}px` }}
                    title="Espacio reservado para empaste/lomo"
                  >
                    <span className="text-[7px] text-amber-800 font-bold -rotate-90 select-none">LOMO</span>
                  </div>
                )}

                {/* Simulated Header */}
                <div className="h-2 bg-slate-300 rounded-xs mb-1.5 w-full shrink-0" />
                {/* Simulated Two Columns */}
                <div className="flex-1 flex gap-1 overflow-hidden">
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="h-1 bg-slate-200 rounded-xs w-full" />
                    <div className="h-1 bg-slate-200 rounded-xs w-5/6" />
                    <div className="h-1 bg-slate-200 rounded-xs w-full" />
                  </div>
                  <div className="w-px bg-slate-300 h-full" />
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="h-1 bg-slate-200 rounded-xs w-full" />
                    <div className="h-1 bg-slate-200 rounded-xs w-3/4" />
                    <div className="h-1 bg-slate-200 rounded-xs w-full" />
                  </div>
                </div>
                {/* Simulated Footer */}
                <div className="h-1.5 bg-slate-300 rounded-xs mt-1.5 w-1/3 self-end shrink-0" />
                <span className="absolute bottom-1 right-2 text-[8px] font-bold text-slate-400">Pág. 3 (Impar)</span>
              </div>
            </div>

            <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>
                La zona sombreada en dorado representa el espacio seguro para empaste o anillado. Ningún texto quedará oculto al encuadernar.
              </span>
            </div>
          </div>

          {/* Detailed Sliders & Controls */}
          <div className="space-y-4">
            {/* Margen Vertical (Superior e Inferior) */}
            <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-sky-600" />
                  Regulación de Margen Vertical (Superior e Inferior)
                </span>
                <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  {pxToMm(currentConfig.marginTop || 30)} mm / {pxToMm(currentConfig.marginBottom || 36)} mm
                </span>
              </div>

              {/* Margen Superior */}
              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>Margen Superior (Encabezado y Guillotina):</span>
                  <span className="font-mono font-bold text-slate-800">{currentConfig.marginTop} px (~{pxToMm(currentConfig.marginTop || 56)} mm)</span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="96"
                  step="2"
                  value={currentConfig.marginTop || 56}
                  onChange={(e) => {
                    setCurrentConfig(prev => ({
                      ...prev,
                      preset: 'custom',
                      marginTop: Number(e.target.value),
                    }));
                  }}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                />
              </div>

              {/* Margen Inferior */}
              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>Margen Inferior (Pie de Página y Número):</span>
                  <span className="font-mono font-bold text-slate-800">{currentConfig.marginBottom} px (~{pxToMm(currentConfig.marginBottom || 64)} mm)</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="2"
                  value={currentConfig.marginBottom || 64}
                  onChange={(e) => {
                    setCurrentConfig(prev => ({
                      ...prev,
                      preset: 'custom',
                      marginBottom: Number(e.target.value),
                    }));
                  }}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                />
              </div>

              {/* Margen Lateral Base (Izquierdo y Derecho) */}
              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>Margen Lateral Externo (Izquierdo y Derecho):</span>
                  <span className="font-mono font-bold text-slate-800">{currentConfig.marginLeft || 42} px (~{pxToMm(currentConfig.marginLeft || 42)} mm)</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="80"
                  step="2"
                  value={currentConfig.marginLeft || 42}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setCurrentConfig(prev => ({
                      ...prev,
                      preset: 'custom',
                      marginLeft: val,
                      marginRight: val,
                    }));
                  }}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                />
              </div>
            </div>

            {/* Margen de Empaste / Lomo (Gutter) */}
            <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                  Margen de Empaste / Lomo (Gutter)
                </span>
                <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {pxToMm(currentConfig.bindingGutter || 0)} mm
                </span>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>Espacio extra para cosido, pegado o anillado:</span>
                  <span className="font-mono font-bold text-slate-800">{currentConfig.bindingGutter} px (~{pxToMm(currentConfig.bindingGutter || 0)} mm)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="96"
                  step="2"
                  value={currentConfig.bindingGutter || 0}
                  onChange={(e) => {
                    setCurrentConfig(prev => ({
                      ...prev,
                      preset: 'custom',
                      bindingGutter: Number(e.target.value),
                    }));
                  }}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
              </div>

              {/* Mirror Margins Checkbox */}
              <div className="pt-2 border-t border-slate-200 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="chk-mirror-margins"
                  checked={Boolean(currentConfig.mirrorMargins)}
                  onChange={(e) => {
                    setCurrentConfig(prev => ({
                      ...prev,
                      preset: 'custom',
                      mirrorMargins: e.target.checked,
                    }));
                  }}
                  className="mt-0.5 w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
                />
                <label htmlFor="chk-mirror-margins" className="text-xs text-slate-700 cursor-pointer">
                  <span className="font-bold text-slate-900 block">Márgenes simétricos para doble cara (Páginas pares e impares)</span>
                  <span className="text-slate-500">
                    Alterna el lomo a la izquierda en páginas impares y a la derecha en páginas pares, igual que en libros impresos oficiales.
                  </span>
                </label>
              </div>

              {/* Show Binding Guide on screen Checkbox */}
              <div className="pt-2 border-t border-slate-200 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="chk-show-guide"
                  checked={Boolean(currentConfig.showBindingGuide)}
                  onChange={(e) => {
                    setCurrentConfig(prev => ({
                      ...prev,
                      showBindingGuide: e.target.checked,
                    }));
                  }}
                  className="mt-0.5 w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
                />
                <label htmlFor="chk-show-guide" className="text-xs text-slate-700 cursor-pointer">
                  <span className="font-semibold text-slate-900 block">Mostrar guía visual de lomo en la vista de edición</span>
                  <span className="text-slate-500">
                    Muestra una suave franja rayada en pantalla que indica el borde exacto de empaste (no aparece al imprimir).
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={() => setCurrentConfig(DEFAULT_MARGIN_CONFIG)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Valores Recomendados</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              id="btn-save-margins"
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-md shadow-sky-600/20 transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Guardar y Aplicar al Libro</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
