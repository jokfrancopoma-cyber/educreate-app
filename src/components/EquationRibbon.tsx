import React, { useState, useRef, useEffect } from 'react';
import { InlineMath } from 'react-katex';
import { ChevronDown, Sparkles, X } from 'lucide-react';

interface EquationRibbonProps {
  onInsertLatex: (latex: string) => void;
  activeLatex?: string;
  onUpdateLatex?: (latex: string) => void;
  onClose?: () => void;
  isCompact?: boolean;
}

// 1. Exact symbols from Word ribbon image
const PRIMARY_SYMBOLS_ROW_1 = [
  { symbol: '±', latex: '\\pm ', label: 'Más-menos' },
  { symbol: '∞', latex: '\\infty ', label: 'Infinito' },
  { symbol: '=', latex: '= ', label: 'Igual' },
  { symbol: '≠', latex: '\\neq ', label: 'No igual' },
  { symbol: '~', latex: '\\sim ', label: 'Similar' },
  { symbol: '×', latex: '\\times ', label: 'Multiplicación' },
  { symbol: '÷', latex: '\\div ', label: 'División' },
  { symbol: '!', latex: '! ', label: 'Factorial' },
  { symbol: '∝', latex: '\\propto ', label: 'Proporcional' },
  { symbol: '<', latex: '< ', label: 'Menor que' },
  { symbol: '≪', latex: '\\ll ', label: 'Mucho menor que' },
  { symbol: '>', latex: '> ', label: 'Mayor que' },
  { symbol: '≫', latex: '\\gg ', label: 'Mucho mayor que' },
  { symbol: '≤', latex: '\\le ', label: 'Menor o igual' },
  { symbol: '≥', latex: '\\ge ', label: 'Mayor o igual' },
  { symbol: '∓', latex: '\\mp ', label: 'Menos-más' },
];

const PRIMARY_SYMBOLS_ROW_2 = [
  { symbol: '≅', latex: '\\cong ', label: 'Congruente' },
  { symbol: '≈', latex: '\\approx ', label: 'Aproximado' },
  { symbol: '≡', latex: '\\equiv ', label: 'Equivalente / Idéntico' },
  { symbol: '∀', latex: '\\forall ', label: 'Para todo' },
  { symbol: '⊂', latex: '\\subset ', label: 'Subconjunto' },
  { symbol: '∂', latex: '\\partial ', label: 'Derivada parcial' },
  { symbol: '√', latex: '\\sqrt{} ', label: 'Raíz cuadrada' },
  { symbol: '∛', latex: '\\sqrt[3]{} ', label: 'Raíz cúbica' },
  { symbol: '∜', latex: '\\sqrt[4]{} ', label: 'Raíz cuarta' },
  { symbol: '∪', latex: '\\cup ', label: 'Unión' },
  { symbol: '∩', latex: '\\cap ', label: 'Intersección' },
  { symbol: '∅', latex: '\\emptyset ', label: 'Conjunto vacío' },
  { symbol: '%', latex: '\\% ', label: 'Porcentaje' },
  { symbol: '°', latex: '^\\circ ', label: 'Grados sexagesimales' },
  { symbol: '°F', latex: '^\\circ\\text{F} ', label: 'Grados Fahrenheit' },
  { symbol: '°C', latex: '^\\circ\\text{C} ', label: 'Grados Celsius' },
];

const GREEK_SYMBOLS = [
  { symbol: 'α', latex: '\\alpha ', label: 'alfa' },
  { symbol: 'β', latex: '\\beta ', label: 'beta' },
  { symbol: 'γ', latex: '\\gamma ', label: 'gamma' },
  { symbol: 'δ', latex: '\\delta ', label: 'delta' },
  { symbol: 'ε', latex: '\\epsilon ', label: 'épsilon' },
  { symbol: 'θ', latex: '\\theta ', label: 'theta' },
  { symbol: 'λ', latex: '\\lambda ', label: 'lambda' },
  { symbol: 'μ', latex: '\\mu ', label: 'mu' },
  { symbol: 'π', latex: '\\pi ', label: 'pi' },
  { symbol: 'ρ', latex: '\\rho ', label: 'rho' },
  { symbol: 'σ', latex: '\\sigma ', label: 'sigma' },
  { symbol: 'τ', latex: '\\tau ', label: 'tau' },
  { symbol: 'φ', latex: '\\phi ', label: 'phi' },
  { symbol: 'ω', latex: '\\omega ', label: 'omega' },
  { symbol: 'Δ', latex: '\\Delta ', label: 'Delta' },
  { symbol: 'Σ', latex: '\\Sigma ', label: 'Sigma' },
  { symbol: 'Ω', latex: '\\Omega ', label: 'Omega' },
];

const LOGIC_ARROWS = [
  { symbol: '→', latex: '\\to ', label: 'Tiende a / Flecha derecha' },
  { symbol: '←', latex: '\\leftarrow ', label: 'Flecha izquierda' },
  { symbol: '⇒', latex: '\\Rightarrow ', label: 'Implica' },
  { symbol: '⇔', latex: '\\iff ', label: 'Si y solo si' },
  { symbol: '∧', latex: '\\land ', label: 'Y lógico' },
  { symbol: '∨', latex: '\\lor ', label: 'O lógico' },
  { symbol: '¬', latex: '\\neg ', label: 'Negación' },
  { symbol: '∈', latex: '\\in ', label: 'Pertenece' },
  { symbol: '∉', latex: '\\notin ', label: 'No pertenece' },
  { symbol: '∃', latex: '\\exists ', label: 'Existe' },
  { symbol: '∄', latex: '\\nexists ', label: 'No existe' },
  { symbol: '⊆', latex: '\\subseteq ', label: 'Subconjunto o igual' },
];

// 2. Predefined common equations for "Ecuación" dropdown
const PREDEFINED_EQUATIONS = [
  { name: 'Teorema de Pitágoras', latex: 'a^2 + b^2 = c^2' },
  { name: 'Fórmula Cuadrática', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
  { name: 'Área de un Círculo', latex: 'A = \\pi r^2' },
  { name: 'Binomio de Newton', latex: '(x + a)^n = \\sum_{k=0}^{n} \\binom{n}{k} x^k a^{n-k}' },
  { name: 'Identidad Trigonométrica Fundamental', latex: '\\sin^2(\\theta) + \\cos^2(\\theta) = 1' },
  { name: 'Ley de Senos', latex: '\\frac{a}{\\sin(A)} = \\frac{b}{\\sin(B)} = \\frac{c}{\\sin(C)}' },
  { name: 'Ley de Cosenos', latex: 'c^2 = a^2 + b^2 - 2ab \\cos(C)' },
  { name: 'Expansión de Taylor', latex: 'f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!} (x-a)^n' },
  { name: 'Definición de Derivada', latex: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}" },
  { name: 'Ecuación de Onda / Movimiento', latex: 'x(t) = A \\cos(\\omega t + \\phi)' },
];

// 3. Structures as shown in Word Equation Ribbon
interface StructureItem {
  id: string;
  name: string;
  iconTeX: string;
  items: { label: string; preview: string; latex: string }[];
}

const STRUCTURES: StructureItem[] = [
  {
    id: 'fraction',
    name: 'Fracción',
    iconTeX: '\\frac{\\square}{\\square}',
    items: [
      { label: 'Fracción apilada', preview: '\\frac{\\square}{\\square}', latex: '\\frac{\\square}{\\square}' },
      { label: 'Fracción inclinada', preview: '{\\square}/{\\square}', latex: '{\\square}/{\\square}' },
      { label: 'Fracción pequeña', preview: '\\tfrac{\\square}{\\square}', latex: '\\tfrac{\\square}{\\square}' },
      { label: 'Derivada ordinaria', preview: '\\frac{dy}{dx}', latex: '\\frac{dy}{dx}' },
      { label: 'Derivada segunda', preview: '\\frac{d^2y}{dx^2}', latex: '\\frac{d^2y}{dx^2}' },
      { label: 'Derivada parcial', preview: '\\frac{\\partial y}{\\partial x}', latex: '\\frac{\\partial y}{\\partial x}' },
    ],
  },
  {
    id: 'script',
    name: 'Índices',
    iconTeX: '\\square^{\\square}',
    items: [
      { label: 'Superíndice (potencia)', preview: '\\square^2', latex: '\\square^{2}' },
      { label: 'Subíndice', preview: '\\square_1', latex: '\\square_{1}' },
      { label: 'Subíndice y Superíndice', preview: '\\square_1^2', latex: '\\square_{1}^{2}' },
      { label: 'Superíndice previo', preview: '{}^n \\square', latex: '{}^{n}\\square' },
    ],
  },
  {
    id: 'radical',
    name: 'Radical',
    iconTeX: '\\sqrt{\\square}',
    items: [
      { label: 'Raíz cuadrada', preview: '\\sqrt{\\square}', latex: '\\sqrt{\\square}' },
      { label: 'Raíz con índice n', preview: '\\sqrt[n]{\\square}', latex: '\\sqrt[n]{\\square}' },
      { label: 'Raíz cúbica', preview: '\\sqrt[3]{\\square}', latex: '\\sqrt[3]{\\square}' },
      { label: 'Raíz con casillas libres', preview: '\\sqrt[\\square]{\\square}', latex: '\\sqrt[\\square]{\\square}' },
    ],
  },
  {
    id: 'integral',
    name: 'Integral',
    iconTeX: '\\int_{\\square}^{\\square}',
    items: [
      { label: 'Integral indefinida', preview: '\\int \\square\\,dx', latex: '\\int \\square\\,dx' },
      { label: 'Integral definida', preview: '\\int_{\\square}^{\\square} \\square\\,dx', latex: '\\int_{\\square}^{\\square} \\square\\,dx' },
      { label: 'Integral doble', preview: '\\iint_{D} \\square\\,dA', latex: '\\iint_{D} \\square\\,dA' },
      { label: 'Integral triple', preview: '\\iiint_{V} \\square\\,dV', latex: '\\iiint_{V} \\square\\,dV' },
      { label: 'Integral de contorno cerrado', preview: '\\oint_{C} \\vec{F} \\cdot d\\vec{r}', latex: '\\oint_{C} \\vec{F} \\cdot d\\vec{r}' },
    ],
  },
  {
    id: 'large_op',
    name: 'Operador grande',
    iconTeX: '\\sum_{i=1}^{\\square}',
    items: [
      { label: 'Sumatoria con límites', preview: '\\sum_{i=1}^{\\square} \\square', latex: '\\sum_{i=1}^{\\square} \\square' },
      { label: 'Sumatoria simple', preview: '\\sum \\square', latex: '\\sum \\square' },
      { label: 'Productoria con límites', preview: '\\prod_{i=1}^{\\square} \\square', latex: '\\prod_{i=1}^{\\square} \\square' },
      { label: 'Unión grande', preview: '\\bigcup_{i=1}^{\\square} A_i', latex: '\\bigcup_{i=1}^{\\square} A_i' },
      { label: 'Intersección grande', preview: '\\bigcap_{i=1}^{\\square} A_i', latex: '\\bigcap_{i=1}^{\\square} A_i' },
    ],
  },
  {
    id: 'bracket',
    name: 'Corchete',
    iconTeX: '\\left( \\square \\right)',
    items: [
      { label: 'Paréntesis adaptables', preview: '\\left( \\square \\right)', latex: '\\left( \\square \\right)' },
      { label: 'Corchetes adaptables', preview: '\\left[ \\square \\right]', latex: '\\left[ \\square \\right]' },
      { label: 'Llaves de conjunto', preview: '\\left\\{ \\square \\right\\}', latex: '\\left\\{ \\square \\right\\}' },
      { label: 'Valor absoluto', preview: '\\left| \\square \\right|', latex: '\\left| \\square \\right|' },
      { label: 'Norma de vector', preview: '\\left\\| \\vec{v} \\right\\|', latex: '\\left\\| \\vec{v} \\right\\|' },
      { label: 'Sistema de 2 ecuaciones', preview: '\\begin{cases} \\square \\\\ \\square \\end{cases}', latex: '\\begin{cases} \\square \\\\ \\square \\end{cases}' },
      { label: 'Intervalo semiabierto', preview: '\\left[ a, b \\right)', latex: '\\left[ a, b \\right)' },
    ],
  },
  {
    id: 'function',
    name: 'Función',
    iconTeX: '\\sin\\square',
    items: [
      { label: 'Seno', preview: '\\sin(\\square)', latex: '\\sin(\\square)' },
      { label: 'Coseno', preview: '\\cos(\\square)', latex: '\\cos(\\square)' },
      { label: 'Tangente', preview: '\\tan(\\square)', latex: '\\tan(\\square)' },
      { label: 'Cotangente', preview: '\\cot(\\square)', latex: '\\cot(\\square)' },
      { label: 'Secante', preview: '\\sec(\\square)', latex: '\\sec(\\square)' },
      { label: 'Cosecante', preview: '\\csc(\\square)', latex: '\\csc(\\square)' },
      { label: 'Arcoseno', preview: '\\arcsin(\\square)', latex: '\\arcsin(\\square)' },
      { label: 'Logaritmo natural', preview: '\\ln(\\square)', latex: '\\ln(\\square)' },
      { label: 'Logaritmo decimal', preview: '\\log(\\square)', latex: '\\log(\\square)' },
    ],
  },
  {
    id: 'accent',
    name: 'Acento',
    iconTeX: '\\ddot{\\square}',
    items: [
      { label: 'Barra superior / Media', preview: '\\bar{\\square}', latex: '\\bar{\\square}' },
      { label: 'Vector con flecha', preview: '\\vec{v}', latex: '\\vec{v}' },
      { label: 'Vector unitario (sombrero)', preview: '\\hat{u}', latex: '\\hat{u}' },
      { label: 'Derivada temporal (punto)', preview: '\\dot{x}', latex: '\\dot{x}' },
      { label: 'Segunda derivada (dos puntos)', preview: '\\ddot{x}', latex: '\\ddot{x}' },
      { label: 'Tilde', preview: '\\tilde{a}', latex: '\\tilde{a}' },
      { label: 'Segmento AB', preview: '\\overline{AB}', latex: '\\overline{AB}' },
      { label: 'Arco AB', preview: '\\overparen{AB}', latex: '\\overparen{AB}' },
    ],
  },
  {
    id: 'limit',
    name: 'Límite y logaritmo',
    iconTeX: '\\lim_{x\\to\\square}',
    items: [
      { label: 'Límite hacia 0', preview: '\\lim_{x \\to 0} \\square', latex: '\\lim_{x \\to 0} \\square' },
      { label: 'Límite hacia infinito', preview: '\\lim_{x \\to \\infty} \\square', latex: '\\lim_{x \\to \\infty} \\square' },
      { label: 'Límite lateral derecho', preview: '\\lim_{x \\to a^+} \\square', latex: '\\lim_{x \\to a^+} \\square' },
      { label: 'Logaritmo en base b', preview: '\\log_{\\square}(\\square)', latex: '\\log_{\\square}(\\square)' },
      { label: 'Mínimo', preview: '\\min_{x \\in S} \\square', latex: '\\min_{x} \\square' },
      { label: 'Máximo', preview: '\\max_{x \\in S} \\square', latex: '\\max_{x} \\square' },
    ],
  },
  {
    id: 'operator',
    name: 'Operador',
    iconTeX: '\\triangleq',
    items: [
      { label: 'Definido por definición', preview: 'A \\triangleq B', latex: '\\triangleq ' },
      { label: 'Equivalente / Congruencia', preview: 'a \\equiv b \\pmod m', latex: '\\equiv ' },
      { label: 'Aproximadamente igual', preview: 'x \\approx y', latex: '\\approx ' },
      { label: 'Proporcional a', preview: 'y \\propto x', latex: '\\propto ' },
      { label: 'Operador convolución', preview: 'f * g', latex: '\\ast ' },
    ],
  },
  {
    id: 'matrix',
    name: 'Matriz',
    iconTeX: '\\begin{bmatrix}\\square&\\square\\\\\\square&\\square\\end{bmatrix}',
    items: [
      { label: 'Matriz con paréntesis 2x2', preview: '\\begin{pmatrix} \\square & \\square \\\\ \\square & \\square \\end{pmatrix}', latex: '\\begin{pmatrix} \\square & \\square \\\\ \\square & \\square \\end{pmatrix}' },
      { label: 'Matriz con corchetes 2x2', preview: '\\begin{bmatrix} \\square & \\square \\\\ \\square & \\square \\end{bmatrix}', latex: '\\begin{bmatrix} \\square & \\square \\\\ \\square & \\square \\end{bmatrix}' },
      { label: 'Determinante 2x2', preview: '\\begin{vmatrix} \\square & \\square \\\\ \\square & \\square \\end{vmatrix}', latex: '\\begin{vmatrix} \\square & \\square \\\\ \\square & \\square \\end{vmatrix}' },
      { label: 'Vector columna 2x1', preview: '\\begin{pmatrix} \\square \\\\ \\square \\end{pmatrix}', latex: '\\begin{pmatrix} \\square \\\\ \\square \\end{pmatrix}' },
    ],
  },
];

export const EquationRibbon: React.FC<EquationRibbonProps> = ({
  onInsertLatex,
  activeLatex = '',
  onUpdateLatex,
  onClose,
  isCompact = false,
}) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [symbolTab, setSymbolTab] = useState<'basic' | 'greek' | 'logic'>('basic');
  const [showEquationPresets, setShowEquationPresets] = useState(false);
  const [mode, setMode] = useState<'profesional' | 'lineal'>('profesional');
  const ribbonRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ribbonRef.current && !ribbonRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
        setShowEquationPresets(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInsert = (latex: string) => {
    onInsertLatex(latex);
  };

  return (
    <div
      ref={ribbonRef}
      className="w-full bg-[#f8fafc] border-b-2 border-slate-300 shadow-sm text-slate-800 select-none overflow-x-auto print:hidden rounded-t-xl"
      id="equation-ribbon-container"
    >
      {/* Ribbon Top Sub-header with Title & Close button if needed */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#f1f5f9] border-b border-slate-200 text-xs font-semibold text-slate-600">
        <div className="flex items-center gap-2">
          <span className="font-serif italic font-bold text-base text-blue-900 leading-none">π</span>
          <span className="text-[12px] font-bold text-slate-800">Herramientas de Ecuación</span>
          <span className="text-[10px] text-slate-400 font-normal">| Estilo Microsoft Word</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-slate-300 rounded px-1 text-[11px]">
            <button
              onClick={() => setMode('profesional')}
              className={`px-1.5 py-0.5 rounded ${mode === 'profesional' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
              title="Formato Profesional KaTeX"
            >
              Profesional
            </button>
            <button
              onClick={() => setMode('lineal')}
              className={`px-1.5 py-0.5 rounded ${mode === 'lineal' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
              title="Código TeX Lineal"
            >
              Lineal
            </button>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
              title="Cerrar cinta de ecuaciones"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Ribbon Groups Body */}
      <div className="flex items-stretch min-w-[960px] py-1.5 px-2 gap-1 text-[11px]">
        {/* GROUP 1: HERRAMIENTAS */}
        <div className="flex flex-col items-center justify-between border-r border-slate-200 pr-2 pl-1 shrink-0">
          <div className="flex items-center gap-2 h-full">
            {/* Pi Button: Ecuación Presets */}
            <div className="relative">
              <button
                id="btn-equation-presets"
                onClick={() => {
                  setShowEquationPresets(!showEquationPresets);
                  setActiveDropdown(null);
                }}
                className="flex flex-col items-center justify-center p-1.5 hover:bg-white hover:border hover:border-slate-300 rounded-lg transition-all h-[56px] min-w-[54px]"
                title="Insertar fórmula estándar preuniversitaria"
              >
                <span className="font-serif italic font-bold text-2xl text-blue-800 leading-none">π</span>
                <span className="text-[10px] text-slate-700 font-medium flex items-center gap-0.5 mt-1">
                  Ecuación <ChevronDown className="w-2.5 h-2.5 text-slate-500" />
                </span>
              </button>

              {/* Predefined formulas dropdown popover */}
              {showEquationPresets && (
                <div className="absolute left-0 top-full mt-1 w-80 bg-white border border-slate-300 rounded-xl shadow-xl z-50 p-2 max-h-96 overflow-y-auto">
                  <div className="text-[11px] font-bold text-blue-900 border-b border-slate-100 pb-1.5 mb-1 px-1">
                    Fórmulas Clásicas Preuniversitarias
                  </div>
                  <div className="space-y-1">
                    {PREDEFINED_EQUATIONS.map((eq, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          handleInsert(eq.latex);
                          setShowEquationPresets(false);
                        }}
                        className="w-full text-left p-1.5 hover:bg-blue-50 rounded border border-transparent hover:border-blue-200 transition-colors"
                      >
                        <div className="text-[11px] font-semibold text-slate-800">{eq.name}</div>
                        <div className="text-[11px] text-blue-700 bg-slate-50 p-1 rounded mt-0.5 font-mono overflow-x-auto">
                          <InlineMath math={eq.latex} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick helper badge */}
            <div className="flex flex-col justify-center gap-1">
              <div className="flex items-center gap-1 text-[10px] text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs">
                <span className="font-mono font-bold text-blue-700">$...$</span>
                <span>En línea</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs">
                <span className="font-mono font-bold text-blue-700">$$...$$</span>
                <span>Bloque</span>
              </div>
            </div>
          </div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
            Herramientas
          </span>
        </div>

        {/* GROUP 2: SÍMBOLOS (Exact match with uploaded screenshot) */}
        <div className="flex flex-col items-center justify-between border-r border-slate-200 px-2 shrink-0">
          <div className="flex flex-col gap-1">
            {/* Row 1 of Symbols */}
            <div className="flex items-center gap-0.5">
              {PRIMARY_SYMBOLS_ROW_1.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleInsert(item.latex)}
                  title={`${item.label} (${item.latex})`}
                  className="w-6 h-6 flex items-center justify-center bg-white border border-slate-300 rounded hover:bg-blue-50 hover:border-blue-400 active:bg-blue-200 transition-colors text-xs font-serif font-bold text-slate-800 shadow-2xs"
                >
                  {item.symbol}
                </button>
              ))}

              {/* Toggle to Greek / Logic */}
              <button
                onClick={() => setSymbolTab(symbolTab === 'greek' ? 'basic' : 'greek')}
                className={`h-6 px-1.5 text-[10px] font-bold rounded border transition-colors ${
                  symbolTab === 'greek'
                    ? 'bg-blue-700 text-white border-blue-800'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                }`}
                title="Ver letras griegas (α, β, θ...)"
              >
                αβ
              </button>
            </div>

            {/* Row 2 of Symbols */}
            <div className="flex items-center gap-0.5">
              {symbolTab === 'basic' ? (
                PRIMARY_SYMBOLS_ROW_2.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleInsert(item.latex)}
                    title={`${item.label} (${item.latex})`}
                    className="w-6 h-6 flex items-center justify-center bg-white border border-slate-300 rounded hover:bg-blue-50 hover:border-blue-400 active:bg-blue-200 transition-colors text-xs font-serif font-bold text-slate-800 shadow-2xs"
                  >
                    {item.symbol}
                  </button>
                ))
              ) : (
                GREEK_SYMBOLS.slice(0, 16).map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleInsert(item.latex)}
                    title={`${item.label} (${item.latex})`}
                    className="w-6 h-6 flex items-center justify-center bg-blue-50/60 border border-blue-300 rounded hover:bg-blue-100 hover:border-blue-500 text-xs font-serif font-bold text-blue-900 shadow-2xs"
                  >
                    {item.symbol}
                  </button>
                ))
              )}

              {/* Toggle to Logic / Set */}
              <button
                onClick={() => setSymbolTab(symbolTab === 'logic' ? 'basic' : 'logic')}
                className={`h-6 px-1.5 text-[10px] font-bold rounded border transition-colors ${
                  symbolTab === 'logic'
                    ? 'bg-blue-700 text-white border-blue-800'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                }`}
                title="Ver flechas y lógica (→, ∧, ∨, ∈...)"
              >
                →∈
              </button>
            </div>

            {/* Expanded row if 'logic' is selected */}
            {symbolTab === 'logic' && (
              <div className="flex items-center gap-0.5 pt-0.5">
                {LOGIC_ARROWS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleInsert(item.latex)}
                    title={`${item.label} (${item.latex})`}
                    className="w-6 h-6 flex items-center justify-center bg-amber-50/60 border border-amber-300 rounded hover:bg-amber-100 text-xs font-serif font-bold text-amber-900 shadow-2xs"
                  >
                    {item.symbol}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
            Símbolos
          </span>
        </div>

        {/* GROUP 3: ESTRUCTURAS (Word Structures dropdowns) */}
        <div className="flex flex-col items-center justify-between px-1 flex-1">
          <div className="flex items-center gap-1.5">
            {STRUCTURES.map((st) => (
              <div key={st.id} className="relative">
                <button
                  id={`btn-structure-${st.id}`}
                  onClick={() => {
                    setActiveDropdown(activeDropdown === st.id ? null : st.id);
                    setShowEquationPresets(false);
                  }}
                  className={`flex flex-col items-center justify-center px-1.5 py-1 rounded-lg border transition-all h-[56px] min-w-[50px] ${
                    activeDropdown === st.id
                      ? 'bg-blue-50 border-blue-400 shadow-sm'
                      : 'hover:bg-white hover:border-slate-300 border-transparent'
                  }`}
                  title={`Insertar ${st.name}`}
                >
                  <div className="h-6 flex items-center justify-center text-blue-900 scale-90">
                    <InlineMath math={st.iconTeX} />
                  </div>
                  <span className="text-[10px] text-slate-700 font-medium flex items-center gap-0.5 mt-0.5 whitespace-nowrap">
                    {st.name} <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                  </span>
                </button>

                {/* Dropdown Popover with Visual KaTeX templates */}
                {activeDropdown === st.id && (
                  <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-slate-300 rounded-xl shadow-xl z-50 p-2">
                    <div className="text-[11px] font-bold text-blue-900 border-b border-slate-100 pb-1 mb-1.5 px-1 flex items-center justify-between">
                      <span>Estructuras: {st.name}</span>
                      <button
                        onClick={() => setActiveDropdown(null)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 max-h-72 overflow-y-auto pr-1">
                      {st.items.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            handleInsert(item.latex);
                            setActiveDropdown(null);
                          }}
                          className="flex items-center justify-between p-2 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/70 transition-all text-left group"
                        >
                          <span className="text-[11px] font-medium text-slate-700 group-hover:text-blue-900">
                            {item.label}
                          </span>
                          <div className="bg-slate-50 border border-slate-100 px-2 py-1 rounded text-blue-800 font-serif text-sm">
                            <InlineMath math={item.preview} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
            Estructuras
          </span>
        </div>
      </div>
    </div>
  );
};
