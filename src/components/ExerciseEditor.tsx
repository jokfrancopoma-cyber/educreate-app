import React, { useState, useRef, useEffect } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import { 
  Plus, Trash2, CheckCircle2, Eye, Edit3, Sparkles, 
  HelpCircle, Type, Wand2, ChevronRight 
} from 'lucide-react';
import { EquationRibbon } from './EquationRibbon';
import { TextWithMath } from './TextWithMath';
import { parseOptionMath } from '../utils/mathUtils';
import { Block } from '../types';

interface ExerciseEditorProps {
  block: Block;
  exerciseNumber?: number;
  docFontSize?: number;
  onUpdate: (updates: Partial<Block>) => void;
}

const COMMON_MATH_SNIPPETS = [
  { label: 'a/b', latex: '\\frac{a}{b}', title: 'Fracción' },
  { label: '√x', latex: '\\sqrt{x}', title: 'Raíz cuadrada' },
  { label: 'xⁿ', latex: 'x^{2}', title: 'Potencia' },
  { label: '$$ E $$', latex: '\n$$E = \\frac{a}{b}$$\n', title: 'Ecuación centrada' },
  { label: 'sen x', latex: '\\sin x', title: 'Seno' },
  { label: 'cos x', latex: '\\cos x', title: 'Coseno' },
  { label: 'tan x', latex: '\\tan x', title: 'Tangente' },
  { label: 'csc x', latex: '\\csc x', title: 'Cosecante' },
  { label: 'sec x', latex: '\\sec x', title: 'Secante' },
  { label: 'cot x', latex: '\\cot x', title: 'Cotangente' },
  { label: 'θ', latex: '\\theta', title: 'Theta' },
  { label: 'α', latex: '\\alpha', title: 'Alfa' },
  { label: 'π', latex: '\\pi', title: 'Pi' },
  { label: '±', latex: '\\pm', title: 'Más o menos' },
];

const OPTION_QUICK_MATH = [
  { label: '2 csc x', latex: '2\\csc x' },
  { label: '2 sec x', latex: '2\\sec x' },
  { label: 'csc x', latex: '\\csc x' },
  { label: '2 sin x', latex: '2\\sin x' },
  { label: 'tan x', latex: '\\tan x' },
  { label: 'a/b', latex: '\\frac{1}{2}' },
  { label: '√3/2', latex: '\\frac{\\sqrt{3}}{2}' },
  { label: 'x²', latex: 'x^2' },
];

export const ExerciseEditor: React.FC<ExerciseEditorProps> = ({
  block,
  exerciseNumber,
  docFontSize = 12,
  onUpdate,
}) => {
  const [showRibbon, setShowRibbon] = useState(false);
  const [ribbonTargetOptionIdx, setRibbonTargetOptionIdx] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [focusedOptionIdx, setFocusedOptionIdx] = useState<number | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const blockFontSize = block.metadata?.fontSize || docFontSize;
  const options: string[] = block.metadata?.options || ['Opción A', 'Opción B', 'Opción C', 'Opción D', 'Opción E'];
  const correctAnswer: number = block.metadata?.correctAnswer ?? 0;

  // Auto-resize textarea to prevent awkward internal scrollbars
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(85, textareaRef.current.scrollHeight)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [block.content]);

  // Insert LaTeX into Enunciado at cursor or end
  const insertLatexToEnunciado = (snippet: string) => {
    const current = block.content || '';
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart || current.length;
      const end = textareaRef.current.selectionEnd || current.length;
      const before = current.substring(0, start);
      const after = current.substring(end);
      const nextContent = before + snippet + after;
      onUpdate({ content: nextContent });
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(start + snippet.length, start + snippet.length);
        }
      }, 50);
    } else {
      onUpdate({ content: current ? `${current} ${snippet}` : snippet });
    }
  };

  // Update a single option
  const updateOptionValue = (idx: number, val: string) => {
    const newOptions = [...options];
    newOptions[idx] = val;
    onUpdate({ metadata: { ...block.metadata, options: newOptions } });
  };

  // Set correct answer
  const setCorrectAnswerIdx = (idx: number) => {
    onUpdate({ metadata: { ...block.metadata, correctAnswer: idx } });
  };

  // Add new option
  const addOption = () => {
    const newOptions = [...options, `Nueva opción ${String.fromCharCode(97 + options.length)}`];
    onUpdate({ metadata: { ...block.metadata, options: newOptions } });
  };

  // Remove option
  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    const newOptions = options.filter((_, i) => i !== idx);
    let newCorrect = correctAnswer;
    if (correctAnswer === idx) {
      newCorrect = 0;
    } else if (correctAnswer > idx) {
      newCorrect = correctAnswer - 1;
    }
    onUpdate({ metadata: { ...block.metadata, options: newOptions, correctAnswer: newCorrect } });
  };

  // Clean and standardize formulas (strips unnecessary double dollars, cleans options)
  const cleanAndFormatFormulas = () => {
    let content = block.content || '';
    // Format options: clean redundant double dollars
    const cleanedOptions = options.map(opt => {
      // If user typed $2\csc x$ or $$2\csc x$$, we can preserve standard clean notation
      return opt.trim();
    });
    onUpdate({ content, metadata: { ...block.metadata, options: cleanedOptions } });
  };

  // Quick preset: Trigonometric answers
  const applyTrigPreset = () => {
    const trigOptions = ['2\\csc x', '2\\sec x', '\\csc x', '2\\sin x', '\\tan x'];
    onUpdate({ metadata: { ...block.metadata, options: trigOptions, correctAnswer: 0 } });
  };

  // Quick preset: Numbers 1-5
  const applyNumbersPreset = () => {
    const numOptions = ['10', '20', '30', '40', '50'];
    onUpdate({ metadata: { ...block.metadata, options: numOptions, correctAnswer: 0 } });
  };

  return (
    <div className="rounded-2xl border-2 border-emerald-200/80 bg-gradient-to-b from-emerald-50/40 to-white shadow-sm overflow-hidden transition-all">
      {/* Exercise Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-emerald-100/50 border-b border-emerald-200/70 no-print">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-2xs">
            {exerciseNumber ? `Ejercicio #${exerciseNumber}` : 'Pregunta con Claves'}
          </span>
          
          {/* Tabs: Edit Mode vs Clean Preview */}
          <div className="flex items-center bg-white/80 rounded-lg p-0.5 border border-emerald-200 shadow-2xs">
            <button
              onClick={() => setActiveTab('edit')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                activeTab === 'edit'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-800'
              }`}
              title="Editar el enunciado y las alternativas con herramientas matemáticas"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editor</span>
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                activeTab === 'preview'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-800'
              }`}
              title="Ver el ejercicio tal como se imprimirá en la ficha de examen"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Vista Examen</span>
            </button>
          </div>
        </div>

        {/* Right side tools: Equation Ribbon + Font size */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setRibbonTargetOptionIdx(null);
              setShowRibbon(!showRibbon);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
              showRibbon && ribbonTargetOptionIdx === null
                ? 'bg-blue-800 text-white border-blue-900 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-900'
            }`}
            title="Abrir Cinta de Ecuaciones de Word para insertar fórmulas"
          >
            <span className="font-serif italic font-bold text-sm">π</span>
            <span>Cinta Ecuaciones</span>
          </button>

          {/* Block font size selector */}
          <div className="flex items-center gap-1 bg-white border border-emerald-200 rounded-lg px-2 py-1 text-xs text-slate-600 font-medium">
            <Type className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={block.metadata?.fontSize || ''}
              onChange={(e) => onUpdate({ metadata: { ...block.metadata, fontSize: e.target.value ? Number(e.target.value) : undefined } })}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="">Doc ({docFontSize}pt)</option>
              <option value="10">10 pt</option>
              <option value="11">11 pt</option>
              <option value="12">12 pt</option>
              <option value="13">13 pt</option>
              <option value="14">14 pt</option>
            </select>
          </div>
        </div>
      </div>

      {/* Global Ribbon Shelf if opened */}
      {showRibbon && (
        <div className="border-b border-emerald-200 bg-white p-2 no-print animate-in fade-in">
          <div className="flex items-center justify-between px-2 pb-1 text-xs font-bold text-slate-600">
            <span>
              {ribbonTargetOptionIdx !== null
                ? `Insertando en Clave ${String.fromCharCode(97 + ribbonTargetOptionIdx)})`
                : 'Insertando en el Enunciado del problema:'}
            </span>
            <button 
              onClick={() => setShowRibbon(false)}
              className="text-slate-400 hover:text-slate-700 text-xs px-2 py-0.5 rounded bg-slate-100"
            >
              Cerrar Cinta
            </button>
          </div>
          <EquationRibbon
            onInsertLatex={(latex) => {
              if (ribbonTargetOptionIdx !== null) {
                const currentOpt = options[ribbonTargetOptionIdx] || '';
                updateOptionValue(ribbonTargetOptionIdx, currentOpt ? `${currentOpt} ${latex}` : latex);
              } else {
                insertLatexToEnunciado(latex);
              }
            }}
            onClose={() => setShowRibbon(false)}
          />
        </div>
      )}

      {/* Main Content: Edit Mode or Preview Mode */}
      {activeTab === 'preview' ? (
        /* CLEAN EXAM PREVIEW (Sin Cuadros - Estilo Examen John Nash) */
        <div className="p-5 bg-white space-y-3 font-serif" style={{ fontSize: `${blockFontSize}pt` }}>
          <div className="flex items-start gap-2.5 leading-relaxed text-black">
            <span className="font-bold text-black shrink-0 min-w-[24px] text-[1.05em]">
              {exerciseNumber ? `${exerciseNumber}.` : '•'}
            </span>
            <div className="w-full text-black font-normal leading-relaxed">
              <TextWithMath text={block.content || 'Sin enunciado.'} />
            </div>
          </div>

          {(() => {
            const maxLen = options.reduce((max, o) => Math.max(max, (o || '').length), 0);
            let gridClass = 'grid grid-cols-3 gap-x-4 gap-y-1.5';
            if (maxLen > 26) {
              gridClass = 'grid grid-cols-1 gap-y-1.5';
            } else if (maxLen > 12) {
              gridClass = 'grid grid-cols-2 gap-x-4 gap-y-1.5';
            }

            return (
              <div className="pt-2 pl-6 sm:pl-7">
                <div className={gridClass}>
                  {options.map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    const isCorrect = correctAnswer === idx;
                    const parsed = parseOptionMath(opt);

                    return (
                      <div key={idx} className="flex items-start gap-1.5 text-black">
                        <span className="font-bold text-black shrink-0">{letter})</span>
                        <div className="overflow-x-auto text-black">
                          {parsed.isMath ? (
                            <InlineMath math={parsed.mathCode} errorColor="#cc0000" />
                          ) : (
                            <TextWithMath text={opt} />
                          )}
                        </div>
                        {isCorrect && (
                          <span className="ml-1 text-[9px] bg-emerald-700 text-white px-1.5 py-0.2 rounded font-sans font-bold uppercase shrink-0 no-print" title="Respuesta correcta seleccionada">
                            Clave
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <div className="flex justify-end pt-2 no-print">
            <button
              onClick={() => setActiveTab('edit')}
              className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1 font-sans"
            >
              <Edit3 className="w-3.5 h-3.5" /> Volver a editar enunciado y claves
            </button>
          </div>
        </div>
      ) : (
        /* ACTIVE EDIT MODE (Auto-resizing input, visual preview & formula helpers) */
        <div className="p-4 sm:p-5 space-y-5">
          {/* SECTION 1: ENUNCIADO */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>Enunciado del Problema</span>
                <span className="text-[11px] text-slate-400 font-normal lowercase tracking-normal">
                  (escribe texto o fórmulas; las fórmulas se renderizan abajo en tiempo real)
                </span>
              </label>
              <button
                onClick={cleanAndFormatFormulas}
                className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1"
                title="Estandarizar y limpiar fórmulas"
              >
                <Wand2 className="w-3 h-3" /> Formatear
              </button>
            </div>

            {/* Quick Math Snippets Bar */}
            <div className="flex items-center gap-1.5 p-1.5 bg-emerald-100/40 rounded-xl border border-emerald-200/60 overflow-x-auto no-print">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider pl-1 shrink-0">
                Atajos Fórmulas:
              </span>
              {COMMON_MATH_SNIPPETS.map((snip, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => insertLatexToEnunciado(snip.latex)}
                  className="px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-900 text-xs font-mono font-bold rounded-lg border border-emerald-200 shadow-2xs hover:border-emerald-300 transition-all shrink-0"
                  title={snip.title}
                >
                  {snip.label}
                </button>
              ))}
            </div>

            {/* Textarea without restrictive scrollbars */}
            <textarea
              ref={textareaRef}
              value={block.content}
              onChange={(e) => {
                onUpdate({ content: e.target.value });
                adjustTextareaHeight();
              }}
              placeholder="Ej: Simplifique la siguiente expresión trigonométrica:&#10;$$E = \frac{\sin x}{1 + \cos x} + \frac{1 + \cos x}{\sin x}$$"
              className="w-full font-serif text-slate-900 bg-white border border-emerald-300/80 rounded-xl p-3.5 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs transition-all leading-relaxed placeholder:text-slate-400 placeholder:font-sans placeholder:text-xs"
              style={{ fontSize: `${blockFontSize}pt`, minHeight: '85px', resize: 'vertical' }}
            />

            {/* LIVE RENDERED PREVIEW CARD OF THE ENUNCIADO */}
            {block.content && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/20 p-3 shadow-2xs">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Vista Previa en Vivo del Enunciado (Renderizado Oficial):</span>
                </div>
                <div 
                  className="font-serif leading-relaxed text-slate-900 bg-white p-3 rounded-lg border border-emerald-100 overflow-x-auto"
                  style={{ fontSize: `${blockFontSize}pt` }}
                >
                  <TextWithMath text={block.content} />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: ALTERNATIVAS / CLAVES */}
          <div className="space-y-3 pt-2 border-t border-emerald-200/60">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Alternativas / Claves de Respuesta
                </label>
                <span className="text-[11px] text-slate-500 font-normal">
                  (Haz clic en el círculo verde para marcar la clave correcta)
                </span>
              </div>

              {/* Fast Presets */}
              <div className="flex items-center gap-1.5 no-print">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Plantillas:</span>
                <button
                  type="button"
                  onClick={applyTrigPreset}
                  className="px-2 py-0.5 text-xs font-bold text-blue-900 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                  title="Cargar claves trigonométricas (2 csc x, 2 sec x, csc x, 2 sin x, tan x)"
                >
                  📐 Trigonométricas
                </button>
                <button
                  type="button"
                  onClick={applyNumbersPreset}
                  className="px-2 py-0.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-md hover:bg-slate-200 transition-colors"
                  title="Cargar números 10, 20, 30, 40, 50"
                >
                  🔢 Numéricas
                </button>
              </div>
            </div>

            {/* Grid of Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {options.map((opt, idx) => {
                const letter = String.fromCharCode(97 + idx); // a, b, c, d, e...
                const isCorrect = correctAnswer === idx;
                const parsed = parseOptionMath(opt);
                const isFocused = focusedOptionIdx === idx;

                return (
                  <div
                    key={idx}
                    className={`flex flex-col gap-1.5 p-2.5 rounded-xl border transition-all ${
                      isCorrect
                        ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    {/* Option Top Line: Radio + Letter + Rendered Formula Badge */}
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-radio-${block.id}`}
                        id={`opt-radio-${block.id}-${idx}`}
                        checked={isCorrect}
                        onChange={() => setCorrectAnswerIdx(idx)}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        title="Marcar como respuesta correcta"
                      />
                      <label 
                        htmlFor={`opt-radio-${block.id}-${idx}`}
                        className="font-bold text-xs text-slate-700 cursor-pointer shrink-0"
                      >
                        {letter})
                      </label>

                      {/* Visual Rendered Formula Display (Immediately shows KaTeX math, NO raw code!) */}
                      <div className="flex-1 flex items-center gap-1.5 min-h-[26px] overflow-x-auto">
                        {parsed.isMath ? (
                          <div className="px-2 py-0.5 bg-emerald-100/60 text-emerald-950 rounded-md border border-emerald-200/80 font-bold text-xs flex items-center gap-1">
                            <span className="text-[10px] text-emerald-600 uppercase font-sans tracking-widest font-bold">Fórmula:</span>
                            <InlineMath math={parsed.mathCode || '\\empty'} errorColor="#cc0000" />
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Texto normal</span>
                        )}

                        {isCorrect && (
                          <span className="ml-auto text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1 shrink-0 shadow-2xs">
                            <CheckCircle2 className="w-3 h-3" /> Clave Correcta
                          </span>
                        )}
                      </div>

                      {/* Delete button if more than 2 options */}
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors no-print"
                          title="Eliminar esta opción"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Option Input Field (Free typing, auto math detection without forced dollar signs!) */}
                    <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-200 focus-within:border-emerald-500 focus-within:bg-white transition-all">
                      <input
                        className="w-full bg-transparent text-xs font-medium text-slate-900 focus:outline-none placeholder:text-slate-400"
                        value={opt}
                        onFocus={() => setFocusedOptionIdx(idx)}
                        onBlur={() => setFocusedOptionIdx(null)}
                        onChange={(e) => updateOptionValue(idx, e.target.value)}
                        placeholder={`Escribe fórmula o texto para ${letter}) (ej: 2\\csc x o 15)`}
                      />
                    </div>

                    {/* Option Quick Math Helpers */}
                    <div className="flex items-center gap-1 overflow-x-auto pt-0.5 no-print">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Insertar:</span>
                      {OPTION_QUICK_MATH.map((qm, qmIdx) => (
                        <button
                          key={qmIdx}
                          type="button"
                          onClick={() => updateOptionValue(idx, qm.latex)}
                          className="px-1.5 py-0.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 text-[11px] font-mono rounded border border-slate-200 transition-colors shrink-0"
                          title={`Insertar ${qm.label}`}
                        >
                          {qm.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setRibbonTargetOptionIdx(idx);
                          setShowRibbon(true);
                        }}
                        className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-900 text-[11px] font-bold rounded border border-blue-200 transition-colors shrink-0 flex items-center gap-0.5"
                        title="Abrir Cinta de Ecuaciones para esta opción"
                      >
                        <span className="font-serif italic font-bold">π</span>
                        <span>Más</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions: Add Option */}
            <div className="flex items-center justify-between pt-1 no-print">
              <button
                type="button"
                onClick={addOption}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold shadow-2xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir otra alternativa ({String.fromCharCode(97 + options.length)})</span>
              </button>

              <span className="text-[11px] text-slate-500 font-medium">
                💡 Consejo: Escribe <code className="font-mono bg-slate-100 px-1 rounded text-emerald-800">2\csc x</code> directamente. ¡No necesitas signos de dólar ($)!
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
