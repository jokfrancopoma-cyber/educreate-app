import React, { useState, useRef } from 'react';
import { 
  FileUp, 
  Link as LinkIcon, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  Trash2, 
  Plus, 
  Send, 
  Copy, 
  Download, 
  Presentation, 
  Layers, 
  HelpCircle, 
  Loader2, 
  Check, 
  ExternalLink,
  BookOpen,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { NotebookSource, ExtractedExercise, DocumentInfo, Block } from '../types';
import { TextWithMath } from './TextWithMath';
import { robustJsonParse } from '../utils/jsonParser';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface NotebookLMHubProps {
  onAddExercisesToDoc: (exercises: ExtractedExercise[]) => void;
  onCreateExamFromExercises: (title: string, exercises: ExtractedExercise[]) => void;
  onCreateSlidesFromSources: (title: string, exercises: ExtractedExercise[]) => void;
  activeDocTitle?: string;
}

export const NotebookLMHub: React.FC<NotebookLMHubProps> = ({
  onAddExercisesToDoc,
  onCreateExamFromExercises,
  onCreateSlidesFromSources,
  activeDocTitle
}) => {
  // Sources state
  const [sources, setSources] = useState<NotebookSource[]>([
    {
      id: 'src-sample-1',
      name: 'Ejercicios_Cinematica_MRUV_UNI.pdf (Muestra)',
      type: 'pdf',
      size: '240 KB',
      isActive: true,
      content: `1. Un móvil parte del reposo con aceleración constante de 4 m/s². Calcule la distancia recorrida en el quinto segundo de su movimiento. a) 16m b) 18m c) 20m d) 22m e) 24m. Clave: b.
2. Dos móviles A y B parten simultáneamente al encuentro desde dos puntos distantes 200 m con velocidades constantes de 15 m/s y 25 m/s. ¿Al cabo de cuánto tiempo se cruzan? a) 5s b) 6s c) 8s d) 10s e) 12s. Clave: a.
3. Un proyectil es lanzado verticalmente hacia arriba con una rapidez de 50 m/s (g = 10 m/s²). Determine la altura máxima alcanzada y el tiempo que tarda en regresar al punto de lanzamiento. a) 125m y 10s b) 100m y 8s c) 150m y 12s d) 80m y 5s e) 120m y 10s. Clave: a.`,
      addedAt: new Date()
    }
  ]);

  // Modal / Inputs
  const [linkInput, setLinkInput] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [showTextModal, setShowTextModal] = useState(false);
  const [isProcessingSource, setIsProcessingSource] = useState(false);

  // AI Extraction state
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [extractedExercises, setExtractedExercises] = useState<ExtractedExercise[]>([]);
  const [extractionSummary, setExtractionSummary] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Chat with sources state
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; text: string }>>([
    {
      id: 'welcome',
      role: 'assistant',
      text: '¡Hola! Soy tu asistente de **NotebookLM Preuniversitario**. Sube exámenes o libros en PDF, o ingresa enlaces web. Analizaré los ejercicios y crearé preguntas similares (clones) con el mismo rigor matemático y claves automáticas.'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  // Exercise count & difficulty
  const [exerciseCount, setExerciseCount] = useState<number>(6);
  const [difficulty, setDifficulty] = useState<'Básico' | 'Intermedio' | 'Avanzado' | 'Tarea Domiciliaria'>('Intermedio');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // 1. Handle PDF Upload
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      showToast('Por favor selecciona un archivo en formato PDF.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      showToast('El archivo supera los 25MB.');
      return;
    }

    setIsProcessingSource(true);
    setStatusMessage('Cargando y procesando PDF...');

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      const newSource: NotebookSource = {
        id: `pdf-${Date.now()}`,
        name: file.name,
        type: 'pdf',
        size: `${(file.size / 1024).toFixed(0)} KB`,
        base64: base64Data,
        isActive: true,
        addedAt: new Date()
      };

      setSources(prev => [...prev, newSource]);
      setIsProcessingSource(false);
      setStatusMessage('');
      showToast(`PDF "${file.name}" cargado exitosamente.`);
    };

    reader.onerror = () => {
      setIsProcessingSource(false);
      setStatusMessage('');
      showToast('Error al leer el archivo PDF.');
    };

    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 2. Handle Link Insertion
  const handleAddLink = async () => {
    if (!linkInput.trim()) return;

    setIsProcessingSource(true);
    setStatusMessage('Extrayendo contenido del enlace...');

    try {
      const res = await fetch('/api/fetch-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkInput.trim() })
      });

      let pageText = '';
      if (res.ok) {
        const data = await res.json();
        pageText = data.text || '';
      }

      const urlObj = new URL(linkInput.trim());
      const newSource: NotebookSource = {
        id: `link-${Date.now()}`,
        name: `${urlObj.hostname}${urlObj.pathname.slice(0, 20)}...`,
        type: 'link',
        url: linkInput.trim(),
        content: pageText || `Enlace web: ${linkInput.trim()}`,
        size: pageText ? `${(pageText.length / 1024).toFixed(1)} KB` : 'Web',
        isActive: true,
        addedAt: new Date()
      };

      setSources(prev => [...prev, newSource]);
      setLinkInput('');
      setShowLinkModal(false);
      showToast('Enlace agregado exitosamente.');
    } catch (e: any) {
      // Fallback: save URL as reference
      const newSource: NotebookSource = {
        id: `link-${Date.now()}`,
        name: linkInput.trim(),
        type: 'link',
        url: linkInput.trim(),
        content: `URL de referencia: ${linkInput.trim()}`,
        isActive: true,
        addedAt: new Date()
      };
      setSources(prev => [...prev, newSource]);
      setLinkInput('');
      setShowLinkModal(false);
      showToast('Enlace guardado.');
    } finally {
      setIsProcessingSource(false);
      setStatusMessage('');
    }
  };

  // 3. Handle Text Insertion
  const handleAddText = () => {
    if (!textInput.trim()) return;
    const newSource: NotebookSource = {
      id: `text-${Date.now()}`,
      name: textTitle.trim() || 'Nota / Ejercicios pegados',
      type: 'text',
      content: textInput.trim(),
      size: `${(textInput.length / 1024).toFixed(1)} KB`,
      isActive: true,
      addedAt: new Date()
    };
    setSources(prev => [...prev, newSource]);
    setTextInput('');
    setTextTitle('');
    setShowTextModal(false);
    showToast('Fuente de texto agregada.');
  };

  const toggleSource = (id: string) => {
    setSources(prev => prev.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
  };

  const removeSource = (id: string) => {
    setSources(prev => prev.filter(s => s.id !== id));
  };

  // 4. Extract Similar Exercises (Core NotebookLM feature)
  const handleExtractSimilar = async () => {
    const activeSources = sources.filter(s => s.isActive);
    if (activeSources.length === 0) {
      showToast('Selecciona al menos una fuente activa (PDF o enlace).');
      return;
    }

    setIsGenerating(true);
    setStatusMessage('Analizando fuentes y extrayendo ejercicios similares con IA...');

    try {
      const res = await fetch('/api/notebook-lm/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sources: activeSources,
          action: 'extract_similar',
          count: exerciseCount,
          level: 'Pre-universitario'
        })
      });

      if (!res.ok) {
        throw new Error('Error en el servidor al extraer ejercicios');
      }

      const data = await res.json();
      let parsed = data;
      if (typeof data.content === 'string') {
        try {
          parsed = robustJsonParse(data.content);
        } catch {
          // regex fallback
          const jsonMatch = data.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              parsed = robustJsonParse(jsonMatch[0]);
            } catch {}
          }
        }
      }

      if (parsed.exercises && Array.isArray(parsed.exercises)) {
        setExtractedExercises(parsed.exercises);
        setExtractionSummary(parsed.summary || 'Ejercicios matemáticos estructurados y calibrados según las fuentes.');
        showToast(`¡Se extrajeron ${parsed.exercises.length} ejercicios similares!`);
      } else {
        throw new Error('Formato de respuesta no reconocido');
      }
    } catch (error: any) {
      console.error(error);
      showToast('No se pudo completar la extracción. Verifica tu conexión.');
    } finally {
      setIsGenerating(false);
      setStatusMessage('');
    }
  };

  // 5. Chat with Sources
  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatting) return;

    const userText = chatInput.trim();
    setChatInput('');
    const userMsgId = `msg-${Date.now()}`;
    setChatMessages(prev => [...prev, { id: userMsgId, role: 'user', text: userText }]);

    setIsChatting(true);

    try {
      const activeSources = sources.filter(s => s.isActive);
      const res = await fetch('/api/notebook-lm/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sources: activeSources,
          action: 'chat',
          prompt: userText
        })
      });

      if (!res.ok) throw new Error('Error al consultar a las fuentes');

      const data = await res.json();
      let parsed = data;
      if (typeof data.content === 'string') {
        try {
          parsed = robustJsonParse(data.content);
        } catch {
          const match = data.content.match(/\{[\s\S]*\}/);
          if (match) {
            try {
              parsed = robustJsonParse(match[0]);
            } catch {
              parsed = { answer: data.content };
            }
          } else {
            parsed = { answer: data.content };
          }
        }
      }

      const assistantMsg = parsed.answer || 'He analizado las fuentes para responder a tu consulta.';
      setChatMessages(prev => [
        ...prev,
        { id: `asst-${Date.now()}`, role: 'assistant', text: assistantMsg }
      ]);
    } catch (e: any) {
      setChatMessages(prev => [
        ...prev,
        { id: `err-${Date.now()}`, role: 'assistant', text: 'Ocurrió un error al procesar tu pregunta con las fuentes.' }
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  const copyExerciseToClipboard = (ex: ExtractedExercise) => {
    const text = `${ex.question}\n\n${ex.options.join('\n')}\n\nRespuesta correcta: ${String.fromCharCode(65 + ex.correctAnswer)}\nExplicación: ${ex.explanation || ''}`;
    navigator.clipboard.writeText(text);
    setCopiedId(ex.id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('Ejercicio copiado al portapapeles.');
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-68px)] overflow-hidden bg-slate-50 text-slate-800">
      
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 bg-sky-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Grid: Sources Column (Left) + Studio & Results (Right) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* ============================================================ */}
        {/* LEFT COLUMN: GESTIÓN DE FUENTES (NOTEBOOKLM SOURCES) */}
        {/* ============================================================ */}
        <div className="w-full lg:w-80 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-sm text-slate-800 tracking-wide uppercase">Fuentes Activas</h3>
            </div>
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">
              {sources.filter(s => s.isActive).length}/{sources.length}
            </span>
          </div>

          {/* Action Buttons to Add Sources */}
          <div className="p-3 grid grid-cols-2 gap-2 border-b border-slate-200 bg-white/40">
            {/* Upload PDF */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePdfUpload} 
              accept=".pdf" 
              className="hidden" 
            />
            <button
              id="btn-upload-pdf-source"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingSource}
              className="flex items-center justify-center gap-2 p-2.5 bg-slate-100 hover:bg-slate-200 text-sky-700 rounded-xl border border-slate-300 text-xs font-bold transition-all hover:scale-102"
              title="Subir archivo PDF (libros, exámenes, libros)"
            >
              <FileUp className="w-4 h-4 text-sky-600" />
              <span>Subir PDF</span>
            </button>

            {/* Add Link */}
            <button
              id="btn-add-link-source"
              onClick={() => setShowLinkModal(true)}
              disabled={isProcessingSource}
              className="flex items-center justify-center gap-2 p-2.5 bg-slate-100 hover:bg-slate-200 text-amber-600 rounded-xl border border-slate-300 text-xs font-bold transition-all hover:scale-102"
              title="Insertar enlace web con ejercicios o teoría"
            >
              <LinkIcon className="w-4 h-4 text-amber-600" />
              <span>Insertar Link</span>
            </button>

            {/* Paste Text */}
            <button
              id="btn-add-text-source"
              onClick={() => setShowTextModal(true)}
              disabled={isProcessingSource}
              className="col-span-2 flex items-center justify-center gap-2 p-2 bg-slate-100/60 hover:bg-slate-200 text-slate-600 rounded-xl border border-slate-200 text-xs font-semibold transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pegar Texto / Ejercicios</span>
            </button>
          </div>

          {/* Processing Indicator */}
          {isProcessingSource && (
            <div className="p-3 bg-sky-50 border-b border-sky-200 text-xs text-sky-800 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Sources List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {sources.map((src) => (
              <div 
                key={src.id}
                className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-2 group ${
                  src.isActive 
                    ? 'bg-slate-100 border-slate-300 text-slate-800' 
                    : 'bg-slate-50/50 border-slate-200/80 text-slate-500 opacity-60'
                }`}
              >
                <div className="flex items-start gap-2.5 overflow-hidden">
                  <input 
                    type="checkbox" 
                    checked={src.isActive} 
                    onChange={() => toggleSource(src.id)}
                    className="mt-1 rounded accent-sky-500 cursor-pointer"
                    title={src.isActive ? 'Desactivar fuente' : 'Activar fuente'}
                  />
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      {src.type === 'pdf' && <FileUp className="w-3.5 h-3.5 text-sky-600 shrink-0" />}
                      {src.type === 'link' && <LinkIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                      {src.type === 'text' && <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      <span className="text-xs font-bold truncate">{src.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>{src.type.toUpperCase()}</span>
                      {src.size && <span>• {src.size}</span>}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => removeSource(src.id)}
                  className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Eliminar fuente"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {sources.length === 0 && (
              <div className="text-center py-10 px-4 text-slate-500 text-xs">
                <FileUp className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p className="font-semibold text-slate-500">Sin fuentes cargadas</p>
                <p className="mt-1">Sube un PDF de Lumbreras, examen de admisión o pega un enlace para comenzar.</p>
              </div>
            )}
          </div>

          {/* Sources Footer / Hint */}
          <div className="p-3 bg-white border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Formato: NotebookLM IA</span>
            <span className="text-sky-600 font-semibold">Gemini 3.7 Flash</span>
          </div>

        </div>

        {/* ============================================================ */}
        {/* CENTER / RIGHT: NOTEBOOKLM STUDIO & EXTRACTION RESULTS */}
        {/* ============================================================ */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">

          {/* Studio Action Bar (NotebookLM style quick cards) */}
          <div className="p-4 sm:p-6 border-b border-slate-200/80 bg-slate-50/60">
            <div className="max-w-5xl mx-auto">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                    <h2 className="text-lg font-bold text-slate-800 tracking-wide">
                      Estudio de Fuentes (NotebookLM)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Extrae ejercicios matemáticos espejo, genera libros oficiales a 2 columnas o crea diapositivas para clase.
                  </p>
                </div>

                {/* Configuration Controls */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-300 text-xs">
                    <span className="text-slate-500 font-medium">Cantidad:</span>
                    <select 
                      value={exerciseCount} 
                      onChange={(e) => setExerciseCount(Number(e.target.value))}
                      className="bg-transparent text-sky-600 font-bold focus:outline-none cursor-pointer"
                    >
                      <option value={4} className="bg-slate-100">4 preguntas</option>
                      <option value={6} className="bg-slate-100">6 preguntas</option>
                      <option value={8} className="bg-slate-100">8 preguntas</option>
                      <option value={10} className="bg-slate-100">10 preguntas</option>
                      <option value={14} className="bg-slate-100">14 preguntas</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-300 text-xs">
                    <span className="text-slate-500 font-medium">Dificultad:</span>
                    <select 
                      value={difficulty} 
                      onChange={(e) => setDifficulty(e.target.value as any)}
                      className="bg-transparent text-amber-600 font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="Básico" className="bg-slate-100">Básico (cepreUNAS / UNHEVAL)</option>
                      <option value="Intermedio" className="bg-slate-100">Intermedio (UNMSM)</option>
                      <option value="Avanzado" className="bg-slate-100">Avanzado (UNI)</option>
                      <option value="Tarea Domiciliaria" className="bg-slate-100">Tarea Domiciliaria</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* NotebookLM Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                {/* 1. Extraer Ejercicios Similares (Primary Action) */}
                <button
                  id="btn-action-extract-similar"
                  onClick={handleExtractSimilar}
                  disabled={isGenerating}
                  className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl shadow-md transition-all hover:scale-102 text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    {isGenerating ? (
                      <Loader2 className="w-5 h-5 animate-spin text-slate-800" />
                    ) : (
                      <Sparkles className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm">Extraer Ejercicios Similares</div>
                    <div className="text-[10px] text-sky-100/80">Genera preguntas clon con misma dificultad y claves</div>
                  </div>
                </button>

                {/* 2. Generar Examen Completo */}
                <button
                  id="btn-action-exam-from-sources"
                  onClick={() => {
                    if (extractedExercises.length > 0) {
                      onCreateExamFromExercises('Examen Basado en Fuentes', extractedExercises);
                    } else {
                      handleExtractSimilar();
                    }
                  }}
                  disabled={isGenerating}
                  className="flex items-center gap-3 p-3.5 bg-slate-100 hover:bg-slate-200/80 text-slate-800 rounded-xl border border-slate-300 shadow-sm transition-all hover:scale-102 text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <FileText className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm">Crear Examen (2 Columnas)</div>
                    <div className="text-[10px] text-slate-500">Libro oficial John Nash sin cuadros</div>
                  </div>
                </button>

                {/* 3. Generar Diapositivas */}
                <button
                  id="btn-action-slides-from-sources"
                  onClick={() => {
                    onCreateSlidesFromSources('Clase Basada en Fuentes', extractedExercises);
                  }}
                  disabled={isGenerating}
                  className="flex items-center gap-3 p-3.5 bg-slate-100 hover:bg-slate-200/80 text-slate-800 rounded-xl border border-slate-300 shadow-sm transition-all hover:scale-102 text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-900/60 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Presentation className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm">Generar Diapositivas</div>
                    <div className="text-[10px] text-slate-500">Presentación 16:9 con pasos de solución</div>
                  </div>
                </button>

              </div>

            </div>
          </div>

          {/* Results Area + Chat */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <div className="max-w-5xl mx-auto space-y-6">

              {/* Extraction Summary if available */}
              {extractionSummary && (
                <div className="bg-sky-950/40 border border-sky-200/80 rounded-xl p-4 flex items-start gap-3">
                  <BookOpen className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-sky-800 leading-relaxed">
                    <strong className="text-sky-700 font-bold">Diagnóstico Pedagógico de las Fuentes:</strong> {extractionSummary}
                  </div>
                </div>
              )}

              {/* Extracted Exercises Header & Bulk Actions */}
              {extractedExercises.length > 0 ? (
                <div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">
                        {extractedExercises.length} Ejercicios Similares Generados
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onAddExercisesToDoc(extractedExercises)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                        title="Insertar estos ejercicios en el documento de trabajo actual"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Insertar en mi Libro</span>
                      </button>

                      <button
                        onClick={() => onCreateExamFromExercises('Libro Oficial desde Fuentes', extractedExercises)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                        title="Abrir como nuevo examen en formato 2 columnas sin cuadros"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Ver como Examen Oficial</span>
                      </button>
                    </div>
                  </div>

                  {/* List of Extracted Exercises */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {extractedExercises.map((ex, idx) => {
                      const letters = ['A)', 'B)', 'C)', 'D)', 'E)'];
                      return (
                        <div 
                          key={ex.id || idx}
                          className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-all flex flex-col justify-between group shadow-sm"
                        >
                          <div>
                            {/* Exercise Number & Topic */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="font-bold text-amber-600 text-xs font-mono">
                                Ejercicio {idx + 1}
                              </span>
                              {ex.difficulty && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                                  {ex.difficulty}
                                </span>
                              )}
                            </div>

                            {/* Question statement with Math */}
                            <div className="text-slate-800 text-sm font-normal mb-3 leading-relaxed">
                              <TextWithMath text={ex.question} />
                            </div>

                            {/* Options A-E */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-3 text-xs text-slate-600">
                              {ex.options.map((opt, optIdx) => {
                                const isCorrect = optIdx === ex.correctAnswer;
                                return (
                                  <div 
                                    key={optIdx}
                                    className={`p-1.5 rounded-lg border flex items-start gap-1.5 ${
                                      isCorrect 
                                        ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300 font-semibold' 
                                        : 'bg-white/40 border-slate-200 text-slate-500'
                                    }`}
                                  >
                                    <span className="font-bold shrink-0">{letters[optIdx]}</span>
                                    <div className="overflow-x-auto"><TextWithMath text={opt} /></div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Step-by-step Solution */}
                            {ex.explanation && (
                              <details className="mt-2 text-xs bg-white/60 border border-slate-200/80 rounded-lg p-2 text-slate-500">
                                <summary className="cursor-pointer font-bold text-slate-600 hover:text-sky-700">
                                  Ver Solución Paso a Paso
                                </summary>
                                <div className="mt-2 pt-2 border-t border-slate-200 text-slate-600 leading-relaxed">
                                  <TextWithMath text={ex.explanation} />
                                </div>
                              </details>
                            )}
                          </div>

                          {/* Exercise Card Actions */}
                          <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between">
                            <span className="text-[10px] text-emerald-400 font-bold">
                              Clave: {letters[ex.correctAnswer]}
                            </span>
                            <button
                              onClick={() => copyExerciseToClipboard(ex)}
                              className="text-slate-500 hover:text-slate-800 p-1 rounded hover:bg-slate-100 text-xs flex items-center gap-1 transition-colors"
                              title="Copiar ejercicio"
                            >
                              {copiedId === ex.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span className="text-[10px]">Copiar</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50/40 border border-slate-200 rounded-2xl p-8 text-center">
                  <Sparkles className="w-10 h-10 text-amber-600/80 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-slate-800 mb-1">
                    Listo para extraer ejercicios similares
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
                    Sube un PDF o inserta un enlace en el panel izquierdo y haz clic en <strong>"Extraer Ejercicios Similares"</strong> para que la IA genere clones didácticos con claves A-E.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <button
                      onClick={handleExtractSimilar}
                      disabled={isGenerating}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                    >
                      Probar con la Fuente de Muestra
                    </button>
                  </div>
                </div>
              )}

              {/* Chat / Consultation Section with Sources */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-3 border-b border-slate-200 bg-white/60 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-sky-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Pregunta o solicita a tus Fuentes (NotebookLM Chat)
                  </h4>
                </div>

                <div className="p-4 max-h-60 overflow-y-auto space-y-3">
                  {chatMessages.map((msg) => (
                    <div 
                      key={msg.id}
                      className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                          msg.role === 'user' 
                            ? 'bg-sky-600 text-white' 
                            : 'bg-slate-100 text-slate-200 border border-slate-300'
                        }`}
                      >
                        <TextWithMath text={msg.text} />
                      </div>
                    </div>
                  ))}
                  {isChatting && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 p-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                      <span>Consultando fuentes...</span>
                    </div>
                  )}
                </div>

                {/* Input Bar */}
                <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
                  <input 
                    type="text" 
                    value={chatInput} 
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ej: Extrae un problema de proyectiles similar al de la fuente con ángulo de 37°..."
                    className="flex-1 bg-slate-100 border border-slate-300 text-slate-800 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-sky-500 placeholder-slate-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isChatting || !chatInput.trim()}
                    className="p-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* ============================================================ */}
      {/* MODAL: INSERTAR ENLACE (LINK) */}
      {/* ============================================================ */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-50 border border-slate-300 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 mb-3">
              <LinkIcon className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-slate-800 text-sm">Insertar Enlace Web</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Ingresa la URL de una página con ejercicios, problemas resueltos o teoría matemática. La IA extraerá su contenido para generar ejercicios similares.
            </p>
            <input 
              type="url" 
              value={linkInput} 
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder="https://es.wikipedia.org/... o blog con problemas"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 placeholder-slate-500 focus:outline-none focus:border-amber-400 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowLinkModal(false)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddLink}
                disabled={!linkInput.trim()}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-lg"
              >
                Agregar Enlace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: PEGAR TEXTO */}
      {/* ============================================================ */}
      {showTextModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-50 border border-slate-300 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-slate-800 text-sm">Pegar Enunciados de Ejercicios o Texto</h3>
            </div>
            <input 
              type="text" 
              value={textTitle} 
              onChange={(e) => setTextTitle(e.target.value)}
              placeholder="Título de la nota (ej. Examen Parcial de Álgebra)"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-500 focus:outline-none focus:border-emerald-400 mb-3"
            />
            <textarea 
              rows={6}
              value={textInput} 
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Pega aquí preguntas, ejercicios con alternativas o teoría..."
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-500 focus:outline-none focus:border-emerald-400 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowTextModal(false)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddText}
                disabled={!textInput.trim()}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg"
              >
                Guardar Fuente
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
