import React, { useState } from 'react';
import { Settings, Shield, CheckCircle2, Save, Printer, Image, FileText, Sparkles, Upload } from 'lucide-react';
import { WatermarkModal } from './WatermarkModal';
import { WatermarkConfig } from '../types';

export const SettingsView: React.FC = () => {
  const [academyName, setAcademyName] = useState('Academia Preuniversitaria John Nash');
  const [slogan, setSlogan] = useState('Creemos en tu esfuerzo');
  const [showWatermark, setShowWatermark] = useState(true);
  const [showDividerLine, setShowDividerLine] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig>(() => {
    try {
      const saved = localStorage.getItem('nash_watermark_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { type: 'default', opacity: 0.05, imageScale: 0.9, washout: true };
  });

  const handleSaveWatermark = (newConfig: WatermarkConfig) => {
    setWatermarkConfig(newConfig);
    try {
      localStorage.setItem('nash_watermark_settings', JSON.stringify(newConfig));
    } catch {}
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSave = () => {
    localStorage.setItem('nash_settings', JSON.stringify({
      academyName,
      slogan,
      showWatermark,
      showDividerLine
    }));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-68px)] overflow-y-auto bg-slate-50 text-slate-800 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-600 flex items-center justify-center font-bold">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-wide">
              Ajustes Institucionales y de Impresión
            </h2>
            <p className="text-xs text-slate-500">
              Personaliza el membrete, marca de agua al estilo Word y parámetros de maquetación para tu institución.
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Ajustes guardados correctamente en el navegador.</span>
          </div>
        )}

        {/* Branding card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
            <Shield className="w-4 h-4 text-sky-600" />
            <span>Membrete y Encabezado de Exámenes</span>
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre de la Academia / Institución
              </label>
              <input 
                type="text" 
                value={academyName}
                onChange={(e) => setAcademyName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lema o Slogan
              </label>
              <input 
                type="text" 
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Watermark Card (Word Style) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-600" />
              <span>Marca de Agua del Documento (Estilo Word)</span>
            </h3>

            <button
              onClick={() => setShowWatermarkModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Configurar / Subir Marca</span>
            </button>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                <span>Estado actual:</span>
                <span className="capitalize px-2 py-0.5 rounded text-[11px] bg-sky-100 text-sky-800 font-mono">
                  {watermarkConfig?.type === 'image' && 'Imagen Personalizada'}
                  {watermarkConfig?.type === 'text' && `Texto: "${watermarkConfig.text || 'PREUNIVERSITARIO'}"`}
                  {watermarkConfig?.type === 'default' && 'Logo Institucional John Nash'}
                  {watermarkConfig?.type === 'none' && 'Desactivada (Sin Marca)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Puedes subir la imagen de tu colegio/academia o ingresar cualquier texto diagonal como en Word.
              </p>
            </div>

            <button
              onClick={() => setShowWatermarkModal(true)}
              className="text-xs text-sky-700 hover:underline font-bold"
            >
              Cambiar
            </button>
          </div>
        </div>

        {/* Print rules card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
            <Printer className="w-4 h-4 text-emerald-600" />
            <span>Formato de Libro y PDF Sin Espacios Malgastados</span>
          </h3>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
              <div>
                <div className="font-bold text-slate-800">Marca de agua en fotocopias e impresión</div>
                <div className="text-slate-500 text-[11px]">Muestra la marca tenue en el fondo de las 2 columnas para proteger autoría</div>
              </div>
              <input 
                type="checkbox"
                checked={showWatermark}
                onChange={(e) => setShowWatermark(e.target.checked)}
                className="w-4 h-4 rounded accent-sky-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
              <div>
                <div className="font-bold text-slate-800">Línea divisoria vertical continua</div>
                <div className="text-slate-500 text-[11px]">Divide nítidamente la columna izquierda de la derecha en formato A4</div>
              </div>
              <input 
                type="checkbox"
                checked={showDividerLine}
                onChange={(e) => setShowDividerLine(e.target.checked)}
                className="w-4 h-4 rounded accent-sky-500"
              />
            </label>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Preferencias</span>
          </button>
        </div>

      </div>

      {/* Watermark Modal */}
      {showWatermarkModal && (
        <WatermarkModal
          isOpen={showWatermarkModal}
          onClose={() => setShowWatermarkModal(false)}
          config={watermarkConfig}
          onSave={handleSaveWatermark}
        />
      )}
    </div>
  );
};
