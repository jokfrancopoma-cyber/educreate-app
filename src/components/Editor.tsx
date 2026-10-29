import React, { useState, useEffect } from 'react';
import { DocumentInfo, Block, BlockType } from '../types';
import { exportToDocx } from '../utils/docxExport';
import { exportToPdf } from '../utils/pdfExport';
import { GraphRenderer } from './GraphRenderer';
import { GraphEditor } from './GraphEditor';
import { EquationRibbon } from './EquationRibbon';
import { WordEquationBox } from './WordEquationBox';
import { 
  Download, Plus, Trash2, ArrowLeft, GripVertical, Sparkles, Loader2, 
  Printer, FileText, Upload, ChevronDown, Type, Minus, Sliders, X,
  Edit3, Eye, Check, BookOpen
} from 'lucide-react';
import { BlockMath, InlineMath } from 'react-katex';
import { useLanguage } from '../context/LanguageContext';
import { TextWithMath } from './TextWithMath';
import { ExerciseEditor } from './ExerciseEditor';
import { ExamView } from './ExamView';
import { WatermarkModal } from './WatermarkModal';
import { MarginsModal } from './MarginsModal';
import { parseOptionMath } from '../utils/mathUtils';

interface EditorProps {
  document: DocumentInfo;
  onUpdate: (doc: DocumentInfo) => void;
  onBack: () => void;
}

const MATH_TEMPLATES = [
  { label: 'Fracción', tex: '\\frac{a}{b}' },
  { label: 'Raíz', tex: '\\sqrt{x}' },
  { label: 'Potencia', tex: 'x^{2}' },
  { label: 'Suma', tex: '\\sum_{i=1}^{n} x_i' },
  { label: 'Integral', tex: '\\int_{a}^{b} x dx' },
  { label: 'Límite', tex: '\\lim_{x \\to \\infty} f(x)' },
  { label: 'Cuadrática', tex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
];

const PRIMARY_LEVELS = [
  '1° de Primaria',
  '2° de Primaria',
  '3° de Primaria',
  '4° de Primaria',
  '5° de Primaria',
  '6° de Primaria',
];

const SECONDARY_LEVELS = [
  '1° de Secundaria',
  '2° de Secundaria',
  '3° de Secundaria',
  '4° de Secundaria',
  '5° de Secundaria',
];

const HIGHER_LEVELS = [
  'Pre-universitario',
  'Universitario (Superior)',
];

export const Editor: React.FC<EditorProps> = ({ document: doc, onUpdate, onBack }) => {
  const [activeBlock, setActiveBlock] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'exam'>(doc.isBook ? 'exam' : 'edit');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiLevel, setAiLevel] = useState('1° de Secundaria');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfExportStatus, setPdfExportStatus] = useState('');
  const [pdfProgressPercent, setPdfProgressPercent] = useState<number>(0);
  const pdfAbortControllerRef = React.useRef<AbortController | null>(null);
  const [showPdfOptions, setShowPdfOptions] = useState(false);
  const [fontSize, setFontSize] = useState<number>(12); // Default font size 12 as requested
  const [showGlobalEquationRibbon, setShowGlobalEquationRibbon] = useState(false);
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [showMarginsModal, setShowMarginsModal] = useState(false);
  const [textBlockModes, setTextBlockModes] = useState<Record<string, 'visual' | 'code'>>({});
  const [ribbonTargetBlockId, setRibbonTargetBlockId] = useState<string | null>(null);
  const { t, language } = useLanguage();

  // Cancel export if user presses Escape key
  useEffect(() => {
    if (!isExportingPdf) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancelPdfExport();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExportingPdf]);

  const handleCancelPdfExport = () => {
    if (pdfAbortControllerRef.current) {
      pdfAbortControllerRef.current.abort();
      pdfAbortControllerRef.current = null;
    }
    setIsExportingPdf(false);
    setPdfExportStatus('');
    setPdfProgressPercent(0);
  };

  useEffect(() => {
    if (doc.isBook) {
      setViewMode('exam');
    }
  }, [doc.id, doc.isBook]);

  useEffect(() => {
    const originalTitle = document.title;
    document.title = `${doc.title} - EduCreate`;
    return () => { document.title = originalTitle; };
  }, [doc.title]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...doc, title: e.target.value, updatedAt: new Date() });
  };

  const handleDownloadPdf = async (options?: { orientation?: 'portrait' | 'landscape'; customFontSize?: number; pageSize?: 'a4' | 'letter' | 'legal' }) => {
    const chosenFontSize = options?.customFontSize || fontSize;
    setActiveBlock(null);
    setShowPdfOptions(false);

    // Cancel any ongoing export
    if (pdfAbortControllerRef.current) {
      pdfAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    pdfAbortControllerRef.current = abortController;

    setIsExportingPdf(true);
    setPdfProgressPercent(5);
    setPdfExportStatus(t('generatingPdf') || 'Preparando documento...');

    // Small delay so React clears any active block inputs before cloning and capturing
    await new Promise((resolve) => setTimeout(resolve, 200));

    if (abortController.signal.aborted) {
      setIsExportingPdf(false);
      setPdfExportStatus('');
      setPdfProgressPercent(0);
      return;
    }

    try {
      await exportToPdf(doc, {
        orientation: options?.orientation || 'portrait',
        pageSize: options?.pageSize || 'a4',
        includeHeaderFooter: true,
        fontSize: chosenFontSize,
        signal: abortController.signal,
        onProgress: (status, current, total) => {
          setPdfExportStatus(status);
          if (current !== undefined && total !== undefined && total > 0) {
            const pct = Math.min(98, Math.max(8, Math.round((current / total) * 100)));
            setPdfProgressPercent(pct);
          }
        },
      });
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.toLowerCase().includes('cancelad')) {
        console.info('Exportación PDF cancelada por el usuario.');
        return;
      }
      console.error('Error al exportar PDF:', err);
      const tryBrowserPrint = window.confirm(
        `Hubo un problema al generar el archivo PDF: ${err?.message || 'Error inesperado'}.\n\n¿Deseas abrir la vista de impresión del sistema (Guardar como PDF)?`
      );
      if (tryBrowserPrint) {
        setTimeout(() => window.print(), 200);
      }
    } finally {
      if (pdfAbortControllerRef.current === abortController) {
        pdfAbortControllerRef.current = null;
      }
      setIsExportingPdf(false);
      setPdfExportStatus('');
      setPdfProgressPercent(0);
    }
  };

  const handlePrintBrowser = () => {
    setActiveBlock(null);
    setShowPdfOptions(false);
    setTimeout(() => {
      window.print();
    }, 120);
  };

  const handleGenerateAI = async () => {
    if (!aiTopic || isGenerating) return;
    
    setShowAiModal(false);
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: aiTopic, 
          course: doc.subject,
          language: language,
          level: aiLevel
        })
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        alert(`Error: ${errData.error || 'Failed to generate content. The service might be experiencing high demand. Please try again later.'}`);
        return;
      }
      
      const data = await response.json();
      
      if (data.content) {
        try {
          let cleanContent = data.content;
          if (cleanContent.startsWith('```')) {
             cleanContent = cleanContent.replace(/^```(json)?/, '').replace(/```$/, '');
          }
          const parsed = JSON.parse(cleanContent.trim());
          if (parsed && Array.isArray(parsed.blocks)) {
            const newGeneratedBlocks: Block[] = parsed.blocks.map((b: any, index: number) => {
              let cleanText = b.content || '';
              if (typeof cleanText === 'string') {
                cleanText = cleanText
                  .replace(
                    /<div class="ficha-title">\s*Recursos Didácticos\s*<\/div>/gi,
                    `<div class="ficha-header-top"><img src="/logo_nash.png" alt="Logo Academia John Nash" class="nash-header-logo" /><div class="nash-header-info"><div class="nash-academy-name">Academia John Nash</div><div class="nash-slogan">Creemos en tu esfuerzo</div></div></div>`
                  )
                  .replace(/Recursos Didácticos/gi, 'Academia John Nash');
              }
              return {
                id: `b-${Date.now()}-${index}`,
                type: b.type,
                content: cleanText,
                metadata: b.metadata || {}
              };
            });
            const newBlocks = [...doc.blocks, ...newGeneratedBlocks];
            onUpdate({ ...doc, blocks: newBlocks, updatedAt: new Date() });
            setActiveBlock(newGeneratedBlocks[0]?.id || null);
          }
        } catch (e) {
          const newBlock: Block = {
            id: `b-${Date.now()}`,
            type: 'text',
            content: data.content
          };
          const newBlocks = [...doc.blocks, newBlock];
          onUpdate({ ...doc, blocks: newBlocks, updatedAt: new Date() });
          setActiveBlock(newBlock.id);
        }
      }
    } catch (error) {
      console.error('Error generating content:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const updateBlock = (id: string, updates: Partial<Block>) => {
    const newBlocks = doc.blocks.map(b => b.id === id ? { ...b, ...updates } : b);
    onUpdate({ ...doc, blocks: newBlocks, updatedAt: new Date() });
  };

  const addBlock = (type: BlockType, index: number) => {
    const newBlock: Block = {
      id: `b-${Date.now()}`,
      type,
      content: type === 'text' ? '' : type === 'math' ? 'c^2 = a^2 + b^2' : type === 'graph' ? 'x^2 - 4' : type === 'image' ? '' : 'Calcule el valor de la incógnita...',
      metadata: type === 'graph' ? { 
        graphType: 'function',
        domain: [-10, 10], 
        color: '#1e3a8a',
        strokeWidth: 3,
        lineStyle: 'solid',
        showGrid: true,
        height: 240,
        xLabel: 'x',
        yLabel: 'y'
      } : type === 'exercise' ? { 
        options: ['10', '20', '30', '40', '50'], 
        correctAnswer: 0 
      } : {}
    };
    const newBlocks = [...doc.blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    onUpdate({ ...doc, blocks: newBlocks, updatedAt: new Date() });
    setActiveBlock(newBlock.id);
  };

  const removeBlock = (id: string) => {
    const newBlocks = doc.blocks.filter(b => b.id !== id);
    onUpdate({ ...doc, blocks: newBlocks, updatedAt: new Date() });
  };

  const renderBlockEditor = (block: Block, exerciseNumber?: number) => {
    const blockFontSize = block.metadata?.fontSize || fontSize;
    const showRibbonForThis = ribbonTargetBlockId === block.id;

    switch (block.type) {
      case 'text':
        return (
          <div className="flex flex-col gap-2">
            {/* Text block toolbar */}
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 no-print">
              <div className="flex items-center gap-2">
                <button
                  id={`btn-toggle-equation-ribbon-${block.id}`}
                  onClick={() => setRibbonTargetBlockId(showRibbonForThis ? null : block.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                    showRibbonForThis
                      ? 'bg-blue-800 text-white border-blue-900 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-900'
                  }`}
                  title="Abrir Cinta de Ecuaciones estilo Word para insertar fórmulas y símbolos"
                >
                  <span className="font-serif italic font-bold text-sm">π</span>
                  <span>Insertar Ecuación</span>
                </button>
              </div>

              {/* Block font size selector */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Type className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Letra:</span>
                <select
                  value={block.metadata?.fontSize || ''}
                  onChange={(e) => updateBlock(block.id, { metadata: { ...block.metadata, fontSize: e.target.value ? Number(e.target.value) : undefined } })}
                  className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-bold text-slate-700"
                >
                  <option value="">Doc ({fontSize}pt)</option>
                  <option value="9">9 pt (Micro)</option>
                  <option value="10">10 pt</option>
                  <option value="11">11 pt</option>
                  <option value="12">12 pt (Normal)</option>
                  <option value="13">13 pt</option>
                  <option value="14">14 pt</option>
                  <option value="16">16 pt</option>
                  <option value="18">18 pt</option>
                </select>
              </div>
            </div>

            {/* Embedded Equation Ribbon */}
            {showRibbonForThis && (
              <div className="mb-2 rounded-xl overflow-hidden border border-slate-300 shadow-md">
                <EquationRibbon
                  onInsertLatex={(latex) => {
                    const current = block.content || '';
                    const toInsert = `$${latex}$`;
                    updateBlock(block.id, { content: current ? `${current} ${toInsert}` : toInsert });
                  }}
                  onClose={() => setRibbonTargetBlockId(null)}
                />
              </div>
            )}

            {/* Theory / Text Visual and Code Controls */}
            {(() => {
              const hasHtml = /<[a-z][\s\S]*>/i.test(block.content || '');
              const currentMode = textBlockModes[block.id] || (hasHtml ? 'visual' : 'code');

              if (hasHtml && currentMode === 'visual') {
                return (
                  <div className="flex flex-col gap-2.5">
                    {/* Header Bar */}
                    <div className="flex items-center justify-between p-2.5 bg-sky-50 border border-sky-200 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-sky-600" />
                        <span className="text-xs font-bold text-sky-900">
                          {block.metadata?.isTheory ? 'Marco Teórico del Capítulo' : 'Bloque con Formato Maquetado'}
                        </span>
                        <span className="bg-sky-600 text-white text-[9px] px-1.5 py-0.2 rounded font-sans font-bold">
                          Vista Formateada
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Clean HTML tags into clean, human-readable text
                            const clean = (block.content || '')
                              .replace(/<div class=['"]capitulo-tag['"]>([\s\S]*?)<\/div>/gi, '$1\n')
                              .replace(/<h3 class=['"]capitulo-title['"]>([\s\S]*?)<\/h3>/gi, '$1\n\n')
                              .replace(/<div class=['"]teoria-seccion-badge['"]>([\s\S]*?)<\/div>/gi, '### $1\n')
                              .replace(/<div class=['"]sabias-que-title['"]>([\s\S]*?)<\/div>/gi, '💡 $1:\n')
                              .replace(/<[^>]+>/g, '')
                              .replace(/\n{3,}/g, '\n\n')
                              .trim();
                            updateBlock(block.id, { content: clean });
                            setTextBlockModes(prev => ({ ...prev, [block.id]: 'code' }));
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
                          title="Convertir todo a texto simple editable sin etiquetas HTML"
                        >
                          Limpiar a Texto Simple
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTextBlockModes(prev => ({ ...prev, [block.id]: 'code' }));
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-sky-700 bg-white border border-sky-300 rounded-lg hover:bg-sky-100 transition-colors shadow-2xs"
                          title="Editar el código HTML directamente"
                        >
                          Editar Código HTML
                        </button>
                      </div>
                    </div>

                    {/* Formatted Rendered Output */}
                    <div className="p-3 sm:p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                      <TextWithMath text={block.content} />
                    </div>
                  </div>
                );
              }

              return (
                <div className="flex flex-col gap-2">
                  {hasHtml && (
                    <div className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded-xl mb-1">
                      <span className="text-[11px] text-amber-800 font-semibold">
                        Modo Edición de Código HTML
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTextBlockModes(prev => ({ ...prev, [block.id]: 'visual' }));
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold text-sky-700 bg-white border border-sky-300 rounded-lg hover:bg-sky-50 shadow-2xs transition-colors"
                      >
                        👁️ Ver Formato Final
                      </button>
                    </div>
                  )}

                  <textarea
                    className="w-full resize-none bg-transparent border-none focus:outline-none focus:ring-0 text-slate-800 placeholder-slate-400 min-h-[70px] font-serif leading-relaxed"
                    style={{ fontSize: `${blockFontSize}pt` }}
                    placeholder={t('textPlaceholder')}
                    value={block.content}
                    onChange={(e) => {
                      e.target.style.height = 'inherit';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                      updateBlock(block.id, { content: e.target.value });
                    }}
                  />

                  {/* Live Rendered Math Preview below plain text if it contains math */}
                  {(block.content?.includes('$') || block.content?.includes('\\')) && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Vista Previa:
                      </div>
                      <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/80">
                        <TextWithMath text={block.content} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        );

      case 'math':
        return (
          <WordEquationBox
            content={block.content}
            fontSize={block.metadata?.fontSize}
            docFontSize={fontSize}
            onChange={(newContent) => updateBlock(block.id, { content: newContent })}
            onFontSizeChange={(size) => updateBlock(block.id, { metadata: { ...block.metadata, fontSize: size } })}
          />
        );

      case 'graph':
        return (
          <GraphEditor
            content={block.content}
            metadata={block.metadata}
            onChange={(content, meta) => updateBlock(block.id, { content, metadata: meta })}
          />
        );

      case 'exercise':
        return (
          <ExerciseEditor
            block={block}
            exerciseNumber={exerciseNumber}
            docFontSize={fontSize}
            onUpdate={(updates) => updateBlock(block.id, updates)}
          />
        );

      case 'image':
        return (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 items-center flex-col sm:flex-row">
              <input
                className="w-full sm:flex-1 text-sm p-3 border border-white/80 rounded-xl bg-white/60 text-indigo-700 focus:outline-none focus:border-indigo-400 shadow-sm"
                value={block.content}
                onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                placeholder={t('imageUrlPlaceholder')}
              />
              <span className="text-slate-400 text-sm font-medium">o</span>
              <label className="w-full sm:w-auto cursor-pointer bg-indigo-100 text-indigo-700 px-4 py-3 rounded-xl hover:bg-indigo-200 transition-colors text-sm font-bold flex items-center justify-center gap-2 shadow-sm shrink-0">
                <Upload className="w-4 h-4" />
                Subir Imagen
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        updateBlock(block.id, { content: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }} 
                />
              </label>
            </div>
            {block.content && (
              <div className="mt-4 rounded-xl overflow-hidden border border-white/80 shadow-sm flex justify-center bg-slate-50/50">
                <img src={block.content} alt="Block content" className="max-w-full max-h-[400px] object-contain" />
              </div>
            )}
          </div>
        );
    }
  };

  const renderBlockOutput = (block: Block, exerciseNumber?: number) => {
    const blockFontSize = block.metadata?.fontSize ? `${block.metadata.fontSize}pt` : undefined;

    switch (block.type) {
      case 'text':
        return (
          <div className="prose max-w-none" style={{ fontSize: blockFontSize }}>
            <TextWithMath text={block.content} />
          </div>
        );
      case 'math':
        return (
          <div className="py-4 text-center" style={{ fontSize: blockFontSize }}>
            <BlockMath math={block.content || '\\empty'} />
          </div>
        );
      case 'graph':
        return (
          <div className="py-2">
            <GraphRenderer 
              expression={block.content} 
              domain={block.metadata?.domain || [-10, 10]}
              color={block.metadata?.color}
              strokeWidth={block.metadata?.strokeWidth}
              lineStyle={block.metadata?.lineStyle}
              showGrid={block.metadata?.showGrid !== false}
              height={block.metadata?.height || 240}
              xLabel={block.metadata?.xLabel || 'x'}
              yLabel={block.metadata?.yLabel || 'y'}
              title={block.metadata?.title}
              graphType={block.metadata?.graphType}
              geometryType={block.metadata?.geometryType}
              geometryParams={block.metadata?.geometryParams}
            />
          </div>
        );
      case 'exercise': {
        const optionsList = block.metadata?.options || [];
        const maxOptLength = optionsList.reduce((max: number, o: string) => Math.max(max, (o || '').length), 0);
        let optionGridClass = 'grid grid-cols-3 gap-x-4 gap-y-1.5';
        if (maxOptLength > 26) {
          optionGridClass = 'grid grid-cols-1 gap-y-1.5';
        } else if (maxOptLength > 12) {
          optionGridClass = 'grid grid-cols-2 gap-x-4 gap-y-1.5';
        }

        const rawLevel = String(block.metadata?.level || '').toUpperCase();
        const numVal = exerciseNumber || 1;
        const isHomework = Boolean(
          block.metadata?.isHomework || 
          rawLevel.includes('DOMICILIARIA') || 
          rawLevel.includes('AVANZADO') || 
          numVal > 12
        );
        const isIntermediate = !isHomework && (rawLevel.includes('INTERMEDIO') || (numVal > 6 && numVal <= 12));
        let badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-300";
        let badgeLabel = "NIVEL BÁSICO";
        if (isHomework) {
          badgeClass = "bg-purple-50 text-purple-800 border-purple-300";
          badgeLabel = "ACTIVIDAD DOMICILIARIA";
        } else if (isIntermediate) {
          badgeClass = "bg-sky-50 text-sky-800 border-sky-300";
          badgeLabel = "NIVEL INTERMEDIO";
        }

        return (
          <div className="py-1 h-full flex flex-col font-serif" style={{ fontSize: blockFontSize }}>
            <div className="font-semibold mb-2 text-black flex items-start gap-2.5 leading-snug flex-wrap">
              <span className="text-black font-bold shrink-0 min-w-[24px] text-[1.05em]">
                {exerciseNumber ? `${exerciseNumber}.` : '•'}
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-sans font-bold tracking-wider ${badgeClass}`}>
                {badgeLabel}
              </span>
              <div className="w-full text-black font-normal leading-relaxed text-[0.98em] mt-1">
                <TextWithMath text={block.content} />
              </div>
            </div>
            {optionsList.length > 0 && (
              <div className="mt-2 pl-6 sm:pl-7">
                <div className={optionGridClass}>
                  {optionsList.map((opt: string, idx: number) => {
                    const letter = String.fromCharCode(65 + idx); // A, B, C, D, E...
                    const parsed = parseOptionMath(opt);
                    return (
                      <div key={idx} className="flex items-start gap-1.5 text-[0.95em] text-black">
                        <span className="font-bold text-black shrink-0">{letter})</span>
                        <div className="overflow-x-auto text-black">
                          {parsed.isMath ? (
                            <InlineMath math={parsed.mathCode} errorColor="#cc0000" />
                          ) : (
                            <TextWithMath text={opt} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      }
      case 'image':
        return block.content ? (
          <div className="py-4">
            <img src={block.content} alt="Content" className="max-w-full rounded-2xl shadow-sm border border-slate-200/60" referrerPolicy="no-referrer" />
          </div>
        ) : null;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-200/20 h-screen z-0">
      {/* Editor Top Bar */}
      <div className="h-16 bg-white/60 backdrop-blur-xl border-b border-white/40 px-8 flex items-center justify-between shrink-0 sticky top-0 z-10 no-print">
        <div className="flex items-center gap-4 flex-1">
          <button 
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white/50 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <select
            value={doc.subject}
            onChange={(e) => onUpdate({ ...doc, subject: e.target.value as any, updatedAt: new Date() })}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 ring-indigo-200 cursor-pointer border border-indigo-100"
          >
            <option value="Math">Math</option>
            <option value="Physics">Physics</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Biology">Biology</option>
            <option value="General">General</option>
          </select>
          <input
            className="text-xl font-bold tracking-tight text-slate-800 focus:outline-none border-b border-transparent focus:border-indigo-300 px-1 bg-transparent w-full max-w-sm"
            value={doc.title}
            onChange={handleTitleChange}
            placeholder={t('untitled')}
          />
          <button
            id="btn-trigger-ai-modal"
            onClick={() => { setAiTopic(doc.title || ''); setShowAiModal(true); }}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-indigo-100 transition-colors disabled:opacity-50 border border-indigo-200/80 shadow-2xs shrink-0"
            title={t('generateAI')}
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-indigo-600" />}
            <span className="hidden sm:inline">{isGenerating ? t('generating') : t('generateAI')}</span>
            <span className="sm:hidden">IA</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 hidden lg:flex">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-xs text-slate-500 font-medium">{t('sync')}</span>
          </div>

          {/* Botón para abrir la Cinta de Ecuaciones de Word */}
          <button
            id="btn-toggle-global-ribbon"
            onClick={() => setShowGlobalEquationRibbon(!showGlobalEquationRibbon)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-2xs ${
              showGlobalEquationRibbon
                ? 'bg-blue-800 text-white border-blue-900 shadow-sm ring-2 ring-blue-700/30'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-900 hover:border-blue-300'
            }`}
            title="Abrir Cinta de Ecuaciones estilo Word para insertar fórmulas matemáticas"
          >
            <span className="font-serif italic font-bold text-sm">π</span>
            <span className="hidden md:inline">Cinta de Ecuaciones</span>
          </button>

          {/* Selector y Stepper de Tamaño de Letra (Por defecto 12pt como requerido) */}
          <div 
            className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm text-xs font-semibold text-slate-700 hover:border-blue-300 transition-colors" 
            title="Tamaño de letra del documento y exportación (por defecto 12pt)"
          >
            <button
              id="btn-font-size-dec"
              onClick={() => setFontSize(prev => Math.max(9, prev - 1))}
              disabled={fontSize <= 9}
              className="p-1 px-1.5 text-slate-500 hover:text-blue-900 hover:bg-slate-100 rounded text-xs font-bold disabled:opacity-30"
              title="Reducir tamaño de letra"
            >
              A-
            </button>
            <div className="flex items-center gap-1 px-1.5 border-x border-slate-100">
              <Type className="w-3.5 h-3.5 text-blue-800 shrink-0" />
              <select
                id="select-font-size"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="bg-transparent text-blue-900 font-bold text-xs focus:outline-none cursor-pointer pr-0.5"
              >
                <option value="9">9 pt (Micro)</option>
                <option value="10">10 pt (Muy compacto)</option>
                <option value="11">11 pt (Compacto)</option>
                <option value="12">12 pt (Recomendado)</option>
                <option value="13">13 pt (Medio)</option>
                <option value="14">14 pt (Grande)</option>
                <option value="16">16 pt (Muy grande)</option>
                <option value="18">18 pt (Titular)</option>
              </select>
            </div>
            <button
              id="btn-font-size-inc"
              onClick={() => setFontSize(prev => Math.min(18, prev + 1))}
              disabled={fontSize >= 18}
              className="p-1 px-1.5 text-slate-500 hover:text-blue-900 hover:bg-slate-100 rounded text-xs font-bold disabled:opacity-30"
              title="Aumentar tamaño de letra"
            >
              A+
            </button>
          </div>

          {/* Switch de Modo: Edición vs Vista Examen (Sin Cuadros) */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              id="btn-mode-edit"
              onClick={() => setViewMode('edit')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                viewMode === 'edit'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Modo Edición para redactar y modificar preguntas"
            >
              <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Edición</span>
            </button>
            <button
              id="btn-mode-exam"
              onClick={() => {
                setActiveBlock(null);
                setViewMode('exam');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                viewMode === 'exam'
                  ? 'bg-blue-900 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Vista Examen: Diseño oficial en 2 columnas con línea central y sin cuadros (como la libro)"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold">Vista Examen (Sin Cuadros)</span>
            </button>
          </div>

          {/* PDF Export Action & Options */}
          <div className="relative">
            <div className="inline-flex rounded-lg shadow-sm">
              <button 
                id="btn-export-pdf-direct"
                onClick={() => handleDownloadPdf({ orientation: 'portrait', pageSize: 'a4' })}
                disabled={isExportingPdf}
                className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 text-white border border-indigo-700 rounded-l-lg text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                title="Descargar directamente en PDF A4 Página Exacta para imprenta"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Download className="w-4 h-4 text-white" />
                )}
                <span className="hidden sm:inline">Descargar PDF A4 (Página Exacta)</span>
                <span className="sm:hidden">PDF A4</span>
              </button>
              <button
                id="btn-toggle-pdf-menu"
                onClick={() => setShowPdfOptions(!showPdfOptions)}
                className="px-2 py-2 bg-indigo-700 text-white border-t border-b border-r border-indigo-800 rounded-r-lg hover:bg-indigo-800 transition-colors"
                title="Opciones de exportación PDF"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPdfOptions ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Dropdown Menu */}
            {showPdfOptions && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowPdfOptions(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 text-slate-700 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Opciones de Exportación
                  </div>

                  {/* Selector rápido de tamaño en el menú */}
                  <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/80 rounded-lg my-1">
                    <div className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Type className="w-3 h-3 text-indigo-600" />
                        Tamaño de letra:
                      </span>
                      <span className="text-indigo-600 font-bold">{fontSize} pt</span>
                    </div>
                    <div className="flex gap-1">
                      {[10, 11, 12, 13, 14].map((sz) => (
                        <button
                          key={sz}
                          onClick={() => setFontSize(sz)}
                          className={`flex-1 py-1 text-[11px] font-bold rounded transition-colors ${
                            fontSize === sz
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    id="btn-export-pdf-portrait-a4"
                    onClick={() => handleDownloadPdf({ orientation: 'portrait', pageSize: 'a4' })}
                    className="w-full flex items-center justify-between gap-2.5 px-3 py-2.5 text-xs font-semibold text-slate-800 bg-indigo-50/70 hover:bg-indigo-100/70 text-indigo-900 rounded-lg transition-colors text-left border border-indigo-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <Download className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div>
                        <div className="font-bold flex items-center gap-1.5">
                          <span>Descargar PDF A4</span>
                          <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-black tracking-wider uppercase">Principal</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal">Páginas exactas (210×297mm) • Formato 2 col</div>
                      </div>
                    </div>
                  </button>
                  <button
                    id="btn-export-pdf-portrait-letter"
                    onClick={() => handleDownloadPdf({ orientation: 'portrait', pageSize: 'letter' })}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors text-left"
                  >
                    <Download className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-700">Descargar PDF Carta (Opcional)</div>
                      <div className="text-[10px] text-slate-400 font-normal">Formato norteamericano (215.9×279.4mm)</div>
                    </div>
                  </button>
                  <button
                    id="btn-export-pdf-landscape"
                    onClick={() => handleDownloadPdf({ orientation: 'landscape', pageSize: 'a4' })}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors text-left"
                  >
                    <Download className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <div className="font-bold">Descargar PDF - Horizontal (A4)</div>
                      <div className="text-[10px] text-slate-400 font-normal">Formato apaisado para proyección o tablet</div>
                    </div>
                  </button>
                  <div className="my-1 border-t border-slate-100"></div>
                  <button
                    id="btn-print-browser"
                    onClick={handlePrintBrowser}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors text-left"
                  >
                    <Printer className="w-4 h-4 text-slate-500 shrink-0" />
                    <div>
                      <div className="font-bold">Imprimir en Navegador</div>
                      <div className="text-[10px] text-slate-400 font-normal">Abrir diálogo de impresión del sistema</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
          <button 
            onClick={() => exportToDocx(doc, fontSize)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-colors"
            title="Descargar en Word (.docx)"
          >
            <FileText className="w-4 h-4" />
            Word
          </button>

          <button
            id="btn-editor-watermark"
            onClick={() => setShowWatermarkModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:text-sky-700 hover:bg-sky-50 rounded-lg text-xs sm:text-sm font-semibold transition-colors shadow-2xs"
            title="Personalizar o subir marca de agua al estilo Word (Imagen o Texto)"
          >
            <Sparkles className="w-4 h-4 text-sky-600" />
            <span className="hidden sm:inline">Marca de Agua</span>
          </button>

          <button
            id="btn-editor-margins"
            onClick={() => setShowMarginsModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-900 hover:text-amber-950 hover:bg-amber-100 rounded-lg text-xs sm:text-sm font-semibold transition-colors shadow-2xs"
            title="Regular margen vertical (superior/inferior) y espacio para empaste de libros"
          >
            <BookOpen className="w-4 h-4 text-amber-700" />
            <span className="hidden sm:inline">Márgenes y Empaste</span>
          </button>
        </div>
      </div>

      {/* Global Equation Ribbon Shelf */}
      {showGlobalEquationRibbon && (
        <div className="max-w-4xl mx-auto px-4 pt-3 pb-1 w-full no-print animate-in fade-in slide-in-from-top-2">
          <div className="rounded-2xl overflow-hidden border border-slate-300 shadow-lg bg-white">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="font-serif italic font-bold text-blue-900 text-sm">π</span>
                Cinta de Ecuaciones (Haz clic para insertar en el bloque activo o crear nueva fórmula)
              </span>
              <button 
                onClick={() => setShowGlobalEquationRibbon(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
                title="Cerrar cinta"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <EquationRibbon
              onInsertLatex={(latex) => {
                if (activeBlock) {
                  const target = doc.blocks.find(b => b.id === activeBlock);
                  if (target) {
                    if (target.type === 'math') {
                      updateBlock(target.id, { content: (target.content ? target.content + ' ' : '') + latex });
                    } else {
                      updateBlock(target.id, { content: (target.content ? target.content + ' ' : '') + `$${latex}$` });
                    }
                  }
                } else {
                  // Create a new math block with this formula!
                  const newBlock: Block = {
                    id: `b-${Date.now()}`,
                    type: 'math',
                    content: latex,
                  };
                  onUpdate({ ...doc, blocks: [...doc.blocks, newBlock], updatedAt: new Date() });
                  setActiveBlock(newBlock.id);
                }
              }}
              onClose={() => setShowGlobalEquationRibbon(false)}
            />
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div className="flex-1 overflow-auto pb-32 pt-6 print-container">
        {/* Banner if in Exam View Mode */}
        {viewMode === 'exam' && (
          <div className="max-w-4xl mx-auto mb-4 px-4 no-print">
            <div className="flex items-center justify-between gap-3 bg-blue-900 text-white px-4 py-2.5 rounded-xl shadow-sm text-xs">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-300 shrink-0" />
                <span>
                  <strong>Vista Examen (Sin Cuadros)</strong>: Mostrando distribución oficial a 2 columnas con línea central divisoria. Haz clic en cualquier ejercicio para editarlo.
                </span>
              </div>
              <button
                onClick={() => setViewMode('edit')}
                className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg font-bold shrink-0 transition-colors"
              >
                Volver a Edición
              </button>
            </div>
          </div>
        )}

        <div 
          className={`max-w-5xl mx-auto ${
            viewMode === 'exam' 
              ? 'w-full px-2' 
              : 'flex flex-wrap gap-5 px-4 print-grid'
          } doc-font-${fontSize}`} 
          id="document-content"
          style={{ fontSize: `${fontSize}pt` }}
        >
          
          {doc.blocks.length === 0 && (
            <div className="text-center py-20 text-slate-400 font-medium w-full">
              <p>{t('startBlock')}</p>
            </div>
          )}

          {viewMode === 'exam' ? (
            <div className="w-full flex justify-center">
              <ExamView
                document={doc}
                fontSize={fontSize}
                interactive={true}
                watermark={doc.watermark}
                onUpdateWatermark={(cfg) => onUpdate({ ...doc, watermark: cfg, updatedAt: new Date() })}
                margins={doc.margins}
                onUpdateMargins={(m) => onUpdate({ ...doc, margins: m, updatedAt: new Date() })}
                onEditBlock={(blockId) => {
                  setViewMode('edit');
                  setActiveBlock(blockId);
                }}
                onDownloadPdf={handleDownloadPdf}
                onDownloadDocx={() => exportToDocx(doc, fontSize)}
                onPrintBrowser={handlePrintBrowser}
                isExportingPdf={isExportingPdf}
              />
            </div>
          ) : (
            /* ============================================================ */
            /* MODO EDICIÓN: INTERACTIVO, FÁCIL DE MANIPULAR Y SIN CAJAS EN EJERCICIOS */
            /* ============================================================ */
            (() => {
              let exerciseCounter = 0;
              let currentChapter: any = null;

              return doc.blocks.map((block, index) => {
                const isActive = activeBlock === block.id;

                // For books, restart numbering to 1 for each chapter/topic
                if (doc.isBook || block.metadata?.chapter !== undefined) {
                  const blockCh = block.metadata?.chapter;
                  if (blockCh !== undefined && blockCh !== currentChapter) {
                    currentChapter = blockCh;
                    exerciseCounter = 0;
                  }
                }

                if (block.type === 'exercise') {
                  exerciseCounter++;
                }
                const currentExerciseNumber = exerciseCounter;

                return (
                  <div 
                    key={block.id} 
                    data-block-type={block.type}
                    data-exercise-number={currentExerciseNumber}
                    className={`relative group transition-all print-avoid-break exam-exercise-item ${
                      block.type === 'exercise'
                        ? (isActive 
                            ? 'bg-white rounded-2xl ring-2 ring-indigo-400 shadow-xl border border-indigo-200 p-4 sm:p-5 w-full sm:w-[calc(50%-10px)]' 
                            : 'bg-transparent border border-transparent hover:border-slate-300 hover:bg-slate-50/60 rounded-xl p-2 sm:p-3 w-full sm:w-[calc(50%-10px)] cursor-pointer')
                        : (isActive
                            ? 'bg-white rounded-2xl ring-2 ring-indigo-400 shadow-xl border border-indigo-200 p-6 w-full print-full-width'
                            : 'bg-white/80 backdrop-blur-md rounded-2xl hover:shadow-lg border border-white/60 p-6 w-full print-full-width')
                    }`}
                    onClick={() => setActiveBlock(block.id)}
                  >
                    {/* Block Controls */}
                    <div className={`absolute -left-12 top-2 flex-col gap-1 no-print ${isActive ? 'flex' : 'hidden group-hover:flex'}`}>
                      <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white/60 rounded cursor-grab">
                        <GripVertical className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className={block.type === 'exercise' ? (isActive ? 'p-1' : 'p-0') : 'p-0'}>
                      {isActive ? renderBlockEditor(block, currentExerciseNumber) : renderBlockOutput(block, currentExerciseNumber)}
                    </div>

                    {/* Add block below trigger */}
                    {isActive && (
                      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/90 backdrop-blur shadow-xl border border-white/80 rounded-full px-2 py-1 z-20 no-print">
                        <button onClick={(e) => { e.stopPropagation(); addBlock('text', index); }} className="px-3 py-1 text-xs font-bold text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-full transition-colors uppercase tracking-wider">{t('addText')}</button>
                        <button onClick={(e) => { e.stopPropagation(); addBlock('math', index); }} className="px-3 py-1 text-xs font-bold text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-full transition-colors uppercase tracking-wider">{t('addMath')}</button>
                        <button onClick={(e) => { e.stopPropagation(); addBlock('graph', index); }} className="px-3 py-1 text-xs font-bold text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-full transition-colors uppercase tracking-wider">{t('addGraph')}</button>
                        <button onClick={(e) => { e.stopPropagation(); addBlock('exercise', index); }} className="px-3 py-1 text-xs font-bold text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-full transition-colors uppercase tracking-wider">{t('addExercise')}</button>
                        <button onClick={(e) => { e.stopPropagation(); addBlock('image', index); }} className="px-3 py-1 text-xs font-bold text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-full transition-colors uppercase tracking-wider">{t('addImage')}</button>
                      </div>
                    )}
                  </div>
                );
              });
            })()
          )}

          {/* Append block at end if doc is empty or in edit mode */}
          {viewMode === 'edit' && (
            <div className="flex justify-center gap-2 py-8 flex-wrap no-print w-full">
              <button onClick={() => addBlock('text', -1)} className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-white/60 border border-white/80 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 rounded-xl shadow-sm flex items-center gap-2 transition-colors backdrop-blur-sm"><Plus className="w-4 h-4"/> {t('addText')}</button>
              <button onClick={() => addBlock('math', -1)} className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-white/60 border border-white/80 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 rounded-xl shadow-sm flex items-center gap-2 transition-colors backdrop-blur-sm"><Plus className="w-4 h-4"/> {t('addMath')}</button>
              <button onClick={() => addBlock('graph', -1)} className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-white/60 border border-white/80 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 rounded-xl shadow-sm flex items-center gap-2 transition-colors backdrop-blur-sm"><Plus className="w-4 h-4"/> {t('addGraph')}</button>
              <button onClick={() => addBlock('exercise', -1)} className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-white/60 border border-white/80 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 rounded-xl shadow-sm flex items-center gap-2 transition-colors backdrop-blur-sm"><Plus className="w-4 h-4"/> {t('addExercise')}</button>
              <button onClick={() => addBlock('image', -1)} className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-white/60 border border-white/80 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 rounded-xl shadow-sm flex items-center gap-2 transition-colors backdrop-blur-sm"><Plus className="w-4 h-4"/> {t('addImage')}</button>
            </div>
          )}

        </div>
      </div>
      
      {/* PDF Export Progress Overlay with Cancel Option */}
      {isExportingPdf && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 text-center animate-in zoom-in-95 duration-150 relative">
            {/* Quick Cancel Close (X) button on top right */}
            <button
              type="button"
              onClick={handleCancelPdfExport}
              className="absolute top-3.5 right-3.5 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Cancelar descarga (Esc)"
              aria-label="Cerrar y cancelar descarga"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-full bg-sky-50 flex items-center justify-center mx-auto mb-3.5 border border-sky-100">
              <Loader2 className="w-7 h-7 animate-spin text-sky-600" />
            </div>

            <h4 className="text-base font-bold text-slate-800 mb-1">
              Descargando Documento PDF
            </h4>
            <p className="text-xs text-sky-700 font-semibold mb-3">
              {pdfExportStatus || 'Generando páginas en formato oficial...'}
            </p>

            {/* Progress Bar with smooth percentage */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-1.5 border border-slate-200">
              <div 
                className="bg-sky-600 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.max(6, pdfProgressPercent)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-500 mb-3 px-0.5">
              <span>Procesando páginas A4</span>
              <span className="font-bold text-sky-700">{pdfProgressPercent > 0 ? `${pdfProgressPercent}%` : 'Iniciando...'}</span>
            </div>

            <p className="text-[11px] text-slate-500 mb-4 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              Capturando fórmulas en KaTeX, diagramas geométricos y maquetación de imprenta.
            </p>

            {/* Cancel Download Button */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-center">
              <button
                type="button"
                id="btn-cancel-pdf-download"
                onClick={handleCancelPdfExport}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200/90 rounded-xl transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                title="Detener la descarga del PDF"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancelar Descarga</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showAiModal && (() => {
        const currentCategory = aiLevel.includes('Primaria')
          ? 'primaria'
          : aiLevel.includes('Secundaria')
            ? 'secundaria'
            : 'superior';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="bg-white p-6 rounded-2xl shadow-xl max-w-lg w-full border border-slate-200 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">{t('generateAITitle')}</h3>
                    <p className="text-[11px] text-slate-500">Genera teoría concisa y ejercicios calibrados al grado exacto</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAiModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {/* Tema o Contenido */}
                <div>
                  <label htmlFor="ai-topic-input" className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Tema o Contenido de la Ficha:
                  </label>
                  <input 
                    id="ai-topic-input"
                    className="w-full text-sm p-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 shadow-2xs font-medium"
                    placeholder={t('topicPlaceholder')} 
                    value={aiTopic}
                    onChange={e => setAiTopic(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleGenerateAI();
                    }}
                  />
                </div>

                {/* Nivel y Grado Escolar */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Nivel y Grado Académico:
                    </label>
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 shadow-2xs">
                      {aiLevel}
                    </span>
                  </div>

                  {/* Pestañas de Nivel Principal */}
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                    <button
                      type="button"
                      id="tab-level-primaria"
                      onClick={() => {
                        if (!aiLevel.includes('Primaria')) setAiLevel('1° de Primaria');
                      }}
                      className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                        currentCategory === 'primaria'
                          ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200 font-extrabold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>🎒 Primaria</span>
                      <span className="text-[10px] font-semibold opacity-75">(1°-6°)</span>
                    </button>

                    <button
                      type="button"
                      id="tab-level-secundaria"
                      onClick={() => {
                        if (!aiLevel.includes('Secundaria')) setAiLevel('1° de Secundaria');
                      }}
                      className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                        currentCategory === 'secundaria'
                          ? 'bg-white text-blue-800 shadow-xs border border-blue-200 font-extrabold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>🏫 Secundaria</span>
                      <span className="text-[10px] font-semibold opacity-75">(1°-5°)</span>
                    </button>

                    <button
                      type="button"
                      id="tab-level-superior"
                      onClick={() => {
                        if (currentCategory !== 'superior') setAiLevel('Pre-universitario');
                      }}
                      className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                        currentCategory === 'superior'
                          ? 'bg-white text-purple-800 shadow-xs border border-purple-200 font-extrabold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>🎓 Superior</span>
                      <span className="text-[10px] font-semibold opacity-75">(Pre-U)</span>
                    </button>
                  </div>

                  {/* Botones de Selección Rápida según Nivel */}
                  {currentCategory === 'primaria' && (
                    <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3">
                      <div className="text-[11px] font-bold text-emerald-900 mb-2 flex items-center justify-between">
                        <span>Grado de Educación Primaria:</span>
                        <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100/70 px-1.5 py-0.5 rounded">6 Grados Disponibles</span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                        {PRIMARY_LEVELS.map((lvl, idx) => {
                          const isSelected = aiLevel === lvl;
                          return (
                            <button
                              key={lvl}
                              type="button"
                              id={`btn-level-primaria-${idx + 1}`}
                              onClick={() => setAiLevel(lvl)}
                              className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all text-center ${
                                isSelected
                                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-300'
                                  : 'bg-white text-slate-700 border-emerald-100 hover:bg-emerald-50 hover:border-emerald-300'
                              }`}
                            >
                              <div className="text-sm font-black">{idx + 1}°</div>
                              <div className="text-[9px] uppercase tracking-tight font-medium">Grado</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {currentCategory === 'secundaria' && (
                    <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3">
                      <div className="text-[11px] font-bold text-blue-900 mb-2 flex items-center justify-between">
                        <span>Año de Educación Secundaria:</span>
                        <span className="text-[10px] text-blue-700 font-semibold bg-blue-100/70 px-1.5 py-0.5 rounded">5 Años Disponibles</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {SECONDARY_LEVELS.map((lvl, idx) => {
                          const isSelected = aiLevel === lvl;
                          return (
                            <button
                              key={lvl}
                              type="button"
                              id={`btn-level-secundaria-${idx + 1}`}
                              onClick={() => setAiLevel(lvl)}
                              className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all text-center ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-700 shadow-xs ring-2 ring-blue-300'
                                  : 'bg-white text-slate-700 border-blue-100 hover:bg-blue-50 hover:border-blue-300'
                              }`}
                            >
                              <div className="text-sm font-black">{idx + 1}°</div>
                              <div className="text-[9px] uppercase tracking-tight font-medium">Año</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {currentCategory === 'superior' && (
                    <div className="bg-purple-50/60 border border-purple-200/80 rounded-xl p-3">
                      <div className="text-[11px] font-bold text-purple-900 mb-2">
                        Nivel de Preparación Preuniversitaria y Superior:
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {HIGHER_LEVELS.map((lvl) => {
                          const isSelected = aiLevel === lvl || (lvl === 'Universitario' && aiLevel.includes('Universitario'));
                          return (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => setAiLevel(lvl)}
                              className={`py-2.5 px-2 text-xs font-bold rounded-lg border transition-all text-center ${
                                isSelected
                                  ? 'bg-purple-600 text-white border-purple-700 shadow-xs ring-2 ring-purple-300'
                                  : 'bg-white text-slate-700 border-purple-100 hover:bg-purple-50 hover:border-purple-300'
                              }`}
                            >
                              {lvl}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Selector Desplegable Dropdown (Exactamente el componente mostrado en la captura del usuario) */}
                  <div className="pt-1">
                    <label htmlFor="ai-level-select" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      O selecciona directamente en el menú desplegable:
                    </label>
                    <select
                      id="ai-level-select"
                      value={aiLevel}
                      onChange={e => setAiLevel(e.target.value)}
                      className="w-full text-sm p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-2xs font-medium cursor-pointer"
                    >
                      <optgroup label="── Educación Primaria (1° al 6° Grado) ──">
                        {PRIMARY_LEVELS.map(lvl => (
                          <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                      </optgroup>
                      <optgroup label="── Educación Secundaria (1° al 5° Año) ──">
                        {SECONDARY_LEVELS.map(lvl => (
                          <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                      </optgroup>
                      <optgroup label="── Nivel Pre-U y Superior ──">
                        {HIGHER_LEVELS.map(lvl => (
                          <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                  Calibrado para: <strong className="text-slate-700">{aiLevel}</strong>
                </span>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setShowAiModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="button"
                    id="btn-generate-ai-submit"
                    onClick={handleGenerateAI}
                    disabled={!aiTopic.trim() || isGenerating}
                    className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 shadow-sm flex items-center gap-2"
                  >
                    {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
                    {t('generate')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Watermark Modal */}
      {showWatermarkModal && (
        <WatermarkModal
          isOpen={showWatermarkModal}
          onClose={() => setShowWatermarkModal(false)}
          config={doc.watermark || { type: 'default', opacity: 0.05 }}
          onSave={(cfg) => onUpdate({ ...doc, watermark: cfg, updatedAt: new Date() })}
        />
      )}

      {/* Margins & Binding Modal */}
      {showMarginsModal && (
        <MarginsModal
          isOpen={showMarginsModal}
          onClose={() => setShowMarginsModal(false)}
          config={doc.margins}
          onSave={(m) => onUpdate({ ...doc, margins: m, updatedAt: new Date() })}
        />
      )}
    </div>
  );
};

