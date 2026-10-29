import React, { useState, useEffect, useRef } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import { 
  Sparkles, Check, Trash2, Type, ChevronRight, HelpCircle, 
  ArrowRight, Edit3, Eye, Copy, RefreshCw, Layers
} from 'lucide-react';
import { EquationRibbon } from './EquationRibbon';

export interface WordEquationBoxProps {
  content: string;
  fontSize?: number;
  docFontSize?: number;
  onChange: (newContent: string) => void;
  onFontSizeChange?: (size: number | undefined) => void;
}

/**
 * Converts natural math writing (without any LaTeX code) into valid KaTeX formula.
 * E.g., "(x + 1) / (x - 1)" -> "\frac{x + 1}{x - 1}"
 *       "sqrt(b^2 - 4ac)"   -> "\sqrt{b^2 - 4ac}"
 *       "x = (-b +- sqrt(Delta)) / (2a)" -> "x = \frac{-b \pm \sqrt{\Delta}}{2a}"
 */
export function naturalToMath(text: string): string {
  if (!text) return '';
  let s = text.trim();

  // If user explicitly entered pure LaTeX commands with backslashes, preserve them
  if (s.startsWith('\\') && (s.includes('\\frac') || s.includes('\\begin') || s.includes('\\sum'))) {
    return s;
  }

  // Common preuniversity Greek and symbols
  s = s
    .replace(/\bDelta\b/g, '\\Delta ')
    .replace(/\bpi\b/g, '\\pi ')
    .replace(/\btheta\b/g, '\\theta ')
    .replace(/\balpha\b/g, '\\alpha ')
    .replace(/\bbeta\b/g, '\\beta ')
    .replace(/\blambda\b/g, '\\lambda ')
    .replace(/\bomega\b/g, '\\omega ')
    .replace(/\+\-/g, '\\pm ')
    .replace(/\-\+/g, '\\mp ')
    .replace(/\*\*/g, '^')
    .replace(/\s\*\s/g, ' \\cdot ')
    .replace(/<=/g, ' \\le ')
    .replace(/>=/g, ' \\ge ')
    .replace(/!=/g, ' \\neq ')
    .replace(/<=>/g, ' \\iff ')
    .replace(/=>/g, ' \\implies ');

  // Sqrt / Raiz: sqrt(x) or raiz(x) -> \sqrt{x}
  s = s.replace(/(?:sqrt|raiz)\(([^)]+)\)/gi, '\\sqrt{$1}');

  // Absolute value: |x| -> \left| x \right|
  s = s.replace(/\|([^|]+)\|/g, '\\left| $1 \\right|');

  // Fractions: (a + b) / (c + d) -> \frac{a + b}{c + d}
  s = s.replace(/\(([^()]+)\)\s*\/\s*\(([^()]+)\)/g, '\\frac{$1}{$2}');
  // Single term fractions: a/b or 3/4 or x/y
  s = s.replace(/([a-zA-Z0-9_\^\{\}\\]+)\s*\/\s*([a-zA-Z0-9_\^\{\}\\]+)/g, '\\frac{$1}{$2}');

  // Powers: x^2 or x^(n+1)
  s = s.replace(/\^([a-zA-Z0-9]+)/g, '^{$1}');
  s = s.replace(/\^\(([^)]+)\)/g, '^{$1}');

  // Subscripts: x_1 or x_(i+1)
  s = s.replace(/_([a-zA-Z0-9]+)/g, '_{$1}');
  s = s.replace(/_\(([^)]+)\)/g, '_{$1}');

  return s;
}

/**
 * Replaces the N-th occurrence of \square in a formula string.
 */
function replaceNthSquare(formula: string, targetIndex: number, replacement: string): string {
  let count = 0;
  return formula.replace(/\\square/g, (match) => {
    if (count === targetIndex) {
      count++;
      return replacement.trim() ? replacement : '\\square';
    }
    count++;
    return match;
  });
}

/**
 * Counts total \square slots in a formula.
 */
function countSquares(formula: string): number {
  const matches = formula.match(/\\square/g);
  return matches ? matches.length : 0;
}

export const WordEquationBox: React.FC<WordEquationBoxProps> = ({
  content,
  fontSize,
  docFontSize = 12,
  onChange,
  onFontSizeChange,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [activeSlotIdx, setActiveSlotIdx] = useState<number | null>(null);
  const [slotInputs, setSlotInputs] = useState<Record<number, string>>({});
  const [naturalText, setNaturalText] = useState('');
  const [showAdvancedLatex, setShowAdvancedLatex] = useState(false);

  const naturalInputRef = useRef<HTMLInputElement>(null);
  const slotInputRef = useRef<HTMLInputElement>(null);

  const effectiveFontSize = fontSize || docFontSize;
  const squareCount = countSquares(content || '');

  // Keep naturalText in sync if empty
  useEffect(() => {
    if (!content) {
      setNaturalText('');
      setSlotInputs({});
      setActiveSlotIdx(null);
    }
  }, [content]);

  // Handle ribbon symbol or structure insertion
  const handleRibbonInsert = (snippet: string) => {
    const current = (content || '').trim();

    // If an empty equation, replace directly
    if (!current) {
      onChange(snippet.trim());
      return;
    }

    // If a specific slot (\square) is actively focused, replace that slot
    if (activeSlotIdx !== null && activeSlotIdx < squareCount) {
      const updated = replaceNthSquare(current, activeSlotIdx, snippet.trim());
      onChange(updated);
      // Advance to next slot if available
      if (activeSlotIdx + 1 < countSquares(updated)) {
        setActiveSlotIdx(activeSlotIdx + 1);
      } else {
        setActiveSlotIdx(null);
      }
      return;
    }

    // If the formula contains an unfilled \square and no specific slot was focused, fill the first \square
    if (current.includes('\\square')) {
      const updated = replaceNthSquare(current, 0, snippet.trim());
      onChange(updated);
      return;
    }

    // Otherwise append with appropriate spacing
    onChange(`${current} ${snippet.trim()}`);
  };

  // Handle typing inside a specific slot (casilla)
  const handleSlotInputChange = (idx: number, val: string) => {
    setSlotInputs((prev) => ({ ...prev, [idx]: val }));
    const current = content || '';
    const formattedVal = naturalToMath(val);
    const updated = replaceNthSquare(current, idx, formattedVal);
    onChange(updated);
  };

  // Handle natural language equation input
  const handleNaturalInputSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!naturalText.trim()) return;
    const formatted = naturalToMath(naturalText);
    onChange(formatted);
  };

  return (
    <div className="flex flex-col gap-2 w-full select-none" id="word-equation-box-container">
      {/* 1. Authentic Microsoft Word Equation Ribbon */}
      <div className="rounded-xl overflow-hidden border border-slate-300 shadow-sm bg-white">
        <EquationRibbon
          activeLatex={content}
          onInsertLatex={handleRibbonInsert}
          onUpdateLatex={(latex) => onChange(latex)}
        />
      </div>

      {/* 2. Word Equation Canvas & Interactive Box */}
      <div
        onClick={() => setIsFocused(true)}
        className={`relative transition-all duration-200 rounded-xl bg-white p-4 border ${
          isFocused
            ? 'border-2 border-sky-500 shadow-md ring-4 ring-sky-100/60'
            : 'border-slate-300 hover:border-sky-300 shadow-xs'
        }`}
      >
        {/* Word Equation Top Badge & Quick Controls */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
          <div className="flex items-center gap-1.5">
            <span className="font-serif italic font-bold text-base text-blue-900 leading-none">π</span>
            <span className="text-xs font-bold text-slate-700">Ecuación de Microsoft Word</span>
            <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium border border-emerald-100">
              Modo Visual sin código
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Font size control */}
            {onFontSizeChange && (
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600">
                <Type className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tamaño:</span>
                <select
                  value={fontSize || ''}
                  onChange={(e) => onFontSizeChange(e.target.value ? Number(e.target.value) : undefined)}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="">Doc ({docFontSize}pt)</option>
                  <option value="10">10 pt</option>
                  <option value="11">11 pt</option>
                  <option value="12">12 pt</option>
                  <option value="14">14 pt</option>
                  <option value="16">16 pt</option>
                  <option value="18">18 pt</option>
                  <option value="20">20 pt</option>
                </select>
              </div>
            )}

            {/* Clear button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setNaturalText('');
                setSlotInputs({});
                setActiveSlotIdx(null);
              }}
              title="Borrar ecuación"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3. The Central Equation Display Area ("Escriba aquí la ecuación") */}
        <div 
          className="min-h-[70px] flex items-center justify-center py-4 px-2 overflow-x-auto bg-slate-50/50 rounded-lg border border-slate-100"
          style={{ fontSize: `${effectiveFontSize}pt` }}
        >
          {content && content.trim() ? (
            <div className="text-center font-serif text-slate-900 leading-none">
              <BlockMath math={content} errorColor="#cc0000" />
            </div>
          ) : (
            <div 
              onClick={() => {
                setIsFocused(true);
                naturalInputRef.current?.focus();
              }}
              className="text-slate-400 font-serif italic text-base sm:text-lg tracking-wide text-center cursor-pointer select-none py-2 hover:text-sky-700 transition-colors"
            >
              [ Escriba aquí la ecuación ]
            </div>
          )}
        </div>

        {/* 4. Interactive "Completar Casillas" (Word Placeholder Slots \square) */}
        {squareCount > 0 && (
          <div className="mt-3 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span>Casillas de la ecuación por completar: ({squareCount} casilla{squareCount > 1 ? 's' : ''})</span>
              </div>
              <span className="text-[11px] text-amber-700">Haz clic y escribe directamente el valor:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {Array.from({ length: squareCount }).map((_, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveSlotIdx(idx)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    activeSlotIdx === idx
                      ? 'bg-white border-blue-600 ring-2 ring-blue-100 font-bold text-blue-900 shadow-xs'
                      : 'bg-white/80 border-amber-300 text-slate-700 hover:border-amber-400'
                  }`}
                >
                  <span className="font-serif text-amber-800 font-bold">□ Casilla {idx + 1}:</span>
                  <input
                    ref={activeSlotIdx === idx ? slotInputRef : undefined}
                    type="text"
                    placeholder={`Escribir dato ${idx + 1}...`}
                    value={slotInputs[idx] || ''}
                    onChange={(e) => handleSlotInputChange(idx, e.target.value)}
                    onFocus={() => setActiveSlotIdx(idx)}
                    className="w-28 sm:w-36 bg-amber-50/50 border border-amber-200 rounded px-2 py-0.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500 font-medium"
                  />
                  {activeSlotIdx === idx && (
                    <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1 py-0.5 rounded">
                      Activa
                    </span>
                  )}
                </div>
              ))}

              {activeSlotIdx !== null && activeSlotIdx < squareCount - 1 && (
                <button
                  onClick={() => {
                    const next = activeSlotIdx + 1;
                    setActiveSlotIdx(next);
                  }}
                  className="flex items-center gap-1 text-xs text-blue-700 bg-white border border-blue-200 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 font-medium shadow-2xs"
                >
                  <span>Siguiente casilla</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* 5. Natural Math Typing Mode (Write freely without any code) */}
        <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 shadow-2xs focus-within:border-sky-500 focus-within:bg-white">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap hidden sm:inline">
              ✍️ Escribir sin código:
            </span>
            <input
              ref={naturalInputRef}
              type="text"
              value={naturalText}
              onChange={(e) => {
                setNaturalText(e.target.value);
                const converted = naturalToMath(e.target.value);
                onChange(converted);
              }}
              placeholder="Escribe números o variables: ej. x = (-b ± √(Δ)) / (2a)  o  x^2 - 4x + 4 = 0"
              className="w-full text-xs sm:text-sm bg-transparent focus:outline-none text-slate-800 placeholder:text-slate-400 font-serif"
            />
          </div>

          {/* Quick template buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => handleRibbonInsert('\\frac{\\square}{\\square}')}
              title="Insertar Fracción [ □/□ ]"
              className="px-2.5 py-2 text-xs font-serif font-bold text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 rounded-xl transition-colors shadow-2xs"
            >
              <InlineMath math="\\frac{\\square}{\\square}" />
            </button>
            <button
              onClick={() => handleRibbonInsert('\\sqrt{\\square}')}
              title="Insertar Raíz Cuadrada [ √□ ]"
              className="px-2.5 py-2 text-xs font-serif font-bold text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 rounded-xl transition-colors shadow-2xs"
            >
              <InlineMath math="\\sqrt{\\square}" />
            </button>
            <button
              onClick={() => handleRibbonInsert('\\square^2')}
              title="Insertar Potencia al cuadrado [ □² ]"
              className="px-2.5 py-2 text-xs font-serif font-bold text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 rounded-xl transition-colors shadow-2xs"
            >
              <InlineMath math="\\square^2" />
            </button>
            <button
              onClick={() => handleRibbonInsert('\\pm ')}
              title="Insertar Más-Menos [ ± ]"
              className="px-2.5 py-2 text-xs font-serif font-bold text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 rounded-xl transition-colors shadow-2xs"
            >
              ±
            </button>
          </div>
        </div>

        {/* 6. Technical / Advanced toggle (folded by default, no code needed for regular users) */}
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <button
            onClick={() => setShowAdvancedLatex(!showAdvancedLatex)}
            className="text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
          >
            <span>{showAdvancedLatex ? 'Ocultar código avanzado' : 'Ver código de respaldo'}</span>
          </button>
          <span className="text-[10px] text-slate-400">
            Consejo: Usa la cinta superior para insertar fracciones, raíces y exponentes sin escribir código.
          </span>
        </div>

        {showAdvancedLatex && (
          <div className="mt-2 p-2 bg-slate-900 rounded-lg text-emerald-400 font-mono text-xs overflow-x-auto">
            <span className="text-slate-500 select-none mr-2">TeX:</span>
            {content || '(vacío)'}
          </div>
        )}
      </div>
    </div>
  );
};
