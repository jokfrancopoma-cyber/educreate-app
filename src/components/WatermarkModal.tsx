import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  Type as TypeIcon, 
  ShieldCheck, 
  EyeOff, 
  Check, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { WatermarkConfig } from '../types';

interface WatermarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WatermarkConfig;
  onSave: (config: WatermarkConfig) => void;
}

export const WatermarkModal: React.FC<WatermarkModalProps> = ({
  isOpen,
  onClose,
  config: initialConfig,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'image' | 'text' | 'default' | 'none'>(
    initialConfig?.type || 'default'
  );
  
  // Image state
  const [imageUrl, setImageUrl] = useState<string>(initialConfig?.imageUrl || '');
  const [imageScale, setImageScale] = useState<number>(initialConfig?.imageScale ?? 0.9);
  const [imageOpacity, setImageOpacity] = useState<number>(initialConfig?.opacity ?? 0.08);
  const [washout, setWashout] = useState<boolean>(initialConfig?.washout !== false);

  // Text state
  const [text, setText] = useState<string>(initialConfig?.text || 'PREUNIVERSITARIO');
  const [textLayout, setTextLayout] = useState<'diagonal' | 'horizontal'>(initialConfig?.layout || 'diagonal');
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans'>(initialConfig?.fontFamily || 'serif');
  const [textColor, setTextColor] = useState<string>(initialConfig?.textColor || '#1e293b');
  const [textOpacity, setTextOpacity] = useState<number>(initialConfig?.opacity ?? 0.07);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImageUrl(reader.result);
          setActiveTab('image');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApply = () => {
    const newConfig: WatermarkConfig = {
      type: activeTab,
      imageUrl: activeTab === 'image' ? imageUrl : undefined,
      imageScale: activeTab === 'image' ? imageScale : undefined,
      washout: activeTab === 'image' ? washout : undefined,
      text: activeTab === 'text' ? text.trim() : undefined,
      layout: activeTab === 'text' ? textLayout : undefined,
      fontFamily: activeTab === 'text' ? fontFamily : undefined,
      textColor: activeTab === 'text' ? textColor : undefined,
      opacity: activeTab === 'image' ? imageOpacity : activeTab === 'text' ? textOpacity : 0.05,
    };

    onSave(newConfig);
    onClose();
  };

  const handleResetToDefault = () => {
    setActiveTab('default');
    setImageOpacity(0.06);
    setTextOpacity(0.07);
    setImageScale(0.9);
    setWashout(true);
    setText('PREUNIVERSITARIO');
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-sky-50/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                Marca de Agua del Documento
              </h3>
              <p className="text-[11px] text-slate-500">
                Personaliza la marca de agua al estilo Word para impresión y PDF
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="p-3 bg-slate-50/70 border-b border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('image')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'image'
                ? 'bg-white text-sky-700 shadow-sm border border-sky-200'
                : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-sky-600" />
            <span>Imagen Propia</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'text'
                ? 'bg-white text-sky-700 shadow-sm border border-sky-200'
                : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <TypeIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span>Texto Personalizado</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('default')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'default'
                ? 'bg-white text-sky-700 shadow-sm border border-sky-200'
                : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Logo John Nash</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('none')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'none'
                ? 'bg-white text-rose-700 shadow-sm border border-rose-200'
                : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5 text-slate-400" />
            <span>Sin Marca</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* TAB 1: CUSTOM IMAGE WATERMARK */}
          {activeTab === 'image' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="border-2 border-dashed border-sky-200 hover:border-sky-400 rounded-2xl p-4 bg-sky-50/30 text-center transition-colors">
                {imageUrl ? (
                  <div className="space-y-3 flex flex-col items-center">
                    <div className="w-36 h-36 border border-slate-200 bg-white rounded-xl p-2 flex items-center justify-center shadow-inner overflow-hidden relative group">
                      <img 
                        src={imageUrl} 
                        alt="Marca de agua cargada" 
                        className={`max-w-full max-h-full object-contain ${washout ? 'grayscale contrast-75' : ''}`}
                        style={{ opacity: imageOpacity * 4 }}
                      />
                    </div>
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-500 transition-colors shadow-xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Cambiar Imagen</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageUpload} 
                      />
                    </label>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center py-4 space-y-2">
                    <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-sky-800">
                        Haz clic aquí para subir tu imagen de marca de agua
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Soporta logo de tu academia o institución (PNG con fondo transparente, JPG o SVG)
                      </p>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageUpload} 
                    />
                  </label>
                )}
              </div>

              {/* Sliders & Controls */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold text-slate-700">Tamaño / Escala:</label>
                    <span className="font-mono text-slate-500 font-semibold">{Math.round(imageScale * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.4" 
                    max="1.6" 
                    step="0.05"
                    value={imageScale} 
                    onChange={(e) => setImageScale(parseFloat(e.target.value))}
                    className="w-full accent-sky-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>Pequeño</span>
                    <span>Mediano</span>
                    <span>Grande</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold text-slate-700">Opacidad (Suavidad de fondo):</label>
                    <span className="font-mono text-slate-500 font-semibold">{Math.round(imageOpacity * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.02" 
                    max="0.25" 
                    step="0.01"
                    value={imageOpacity} 
                    onChange={(e) => setImageOpacity(parseFloat(e.target.value))}
                    className="w-full accent-sky-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>Casi invisible (3%)</span>
                    <span>Recomendado (7-9%)</span>
                    <span>Marcado (20%)</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={washout} 
                      onChange={(e) => setWashout(e.target.checked)}
                      className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                    />
                    <div>
                      <span className="font-bold text-slate-800">Decolorar (Efecto marca de agua suave)</span>
                      <p className="text-[10px] text-slate-500">Convierte a escala de grises para que no interfiera con los enunciados matemáticos.</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TEXT WATERMARK */}
          {activeTab === 'text' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Texto de la Marca de Agua:
                </label>
                <input 
                  type="text" 
                  value={text} 
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Ej: PREUNIVERSITARIO, ADMISIÓN UNI, etc."
                  className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500 shadow-2xs uppercase tracking-wider"
                />

                {/* Quick chip presets */}
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <span className="text-[10px] text-slate-400 font-semibold">Sugerencias:</span>
                  {['PREUNIVERSITARIO', 'ACADEMIA JOHN NASH', 'NO COPIAR', 'MATERIAL ADMISIÓN', 'CONFIDENCIAL'].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setText(suggestion)}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-sky-100 text-slate-600 hover:text-sky-700 text-[10px] font-bold transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {/* Layout: Diagonal vs Horizontal */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Distribución:</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTextLayout('diagonal')}
                      className={`p-2 rounded-xl text-center font-bold border transition-all ${
                        textLayout === 'diagonal'
                          ? 'border-sky-500 bg-sky-50 text-sky-800'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Diagonal (45°)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextLayout('horizontal')}
                      className={`p-2 rounded-xl text-center font-bold border transition-all ${
                        textLayout === 'horizontal'
                          ? 'border-sky-500 bg-sky-50 text-sky-800'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Horizontal
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipografía:</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFontFamily('serif')}
                      className={`p-2 rounded-xl text-center font-bold border font-serif transition-all ${
                        fontFamily === 'serif'
                          ? 'border-sky-500 bg-sky-50 text-sky-800'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Serif Clásico
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontFamily('sans')}
                      className={`p-2 rounded-xl text-center font-bold border font-sans transition-all ${
                        fontFamily === 'sans'
                          ? 'border-sky-500 bg-sky-50 text-sky-800'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Sans Moderno
                    </button>
                  </div>
                </div>
              </div>

              {/* Opacity slider */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700">Opacidad del texto:</label>
                  <span className="font-mono text-slate-500 font-semibold">{Math.round(textOpacity * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.03" 
                  max="0.25" 
                  step="0.01"
                  value={textOpacity} 
                  onChange={(e) => setTextOpacity(parseFloat(e.target.value))}
                  className="w-full accent-sky-600"
                />
              </div>
            </div>
          )}

          {/* TAB 3: DEFAULT NASH */}
          {activeTab === 'default' && (
            <div className="p-5 text-center bg-sky-50/40 rounded-2xl border border-sky-100 space-y-3 animate-in fade-in duration-100">
              <div className="w-20 h-20 mx-auto rounded-full bg-white p-2 border border-slate-200 flex items-center justify-center shadow-xs">
                <img src="/logo_nash.png" alt="Nash Logo" className="w-14 h-14 object-contain grayscale opacity-60" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">
                  Marca de Agua Institucional Academia John Nash
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                  Muestra el escudo oficial y el lema <i>"Creemos en tu esfuerzo"</i> centrado suavemente en cada página del compendio.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: NONE */}
          {activeTab === 'none' && (
            <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2 animate-in fade-in duration-100">
              <EyeOff className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">Sin Marca de Agua</h4>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Las páginas se imprimirán limpias sin marcas ni sellos de fondo.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1.5 px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/25 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Aplicar Marca de Agua</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
