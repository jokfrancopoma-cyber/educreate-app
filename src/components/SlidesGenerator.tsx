import React, { useState, useEffect, useRef } from 'react';
import { 
  Presentation, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  Sparkles, 
  Download, 
  Plus, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Loader2, 
  FileEdit,
  Play,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { Slide, SlideDeck, ExtractedExercise } from '../types';
import { TextWithMath } from './TextWithMath';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { robustJsonParse } from '../utils/jsonParser';

interface SlidesGeneratorProps {
  initialExercises?: ExtractedExercise[];
  initialTopic?: string;
  onExportToExam?: (title: string, exercises: any[]) => void;
}

export const SlidesGenerator: React.FC<SlidesGeneratorProps> = ({
  initialExercises,
  initialTopic = 'Cinemática: MRUV y Gráficas del Movimiento',
  onExportToExam
}) => {
  // Deck state
  const [deck, setDeck] = useState<SlideDeck>(() => {
    return {
      id: 'deck-sample-nash',
      title: initialTopic,
      course: 'Física Preuniversitaria',
      level: 'Pre-universitario / San Marcos - UNI',
      slides: [
        {
          id: 's1',
          type: 'title',
          title: initialTopic,
          subtitle: 'Academia Preuniversitaria John Nash • Creemos en tu esfuerzo',
          bullets: [
            'Definición de aceleración constante',
            'Fórmulas escalares y vectoriales',
            'Resolución de problemas tipo examen de admisión'
          ],
          formula: 'v_f = v_0 \\pm a \\cdot t'
        },
        {
          id: 's2',
          type: 'concept',
          title: 'Ecuaciones Fundamentales del MRUV',
          subtitle: 'Relaciones entre posición, velocidad y aceleración',
          bullets: [
            'La aceleración permanece constante en magnitud y dirección.',
            'El signo $(+)$ se utiliza cuando el móvil acelera (rapidez aumenta).',
            'El signo $(-)$ se utiliza cuando el móvil desacelera (rapidez disminuye).'
          ],
          formula: 'd = v_0 t \\pm \\frac{1}{2} a t^2 \\quad ; \\quad v_f^2 = v_0^2 \\pm 2ad'
        },
        {
          id: 's3',
          type: 'exercise',
          title: 'Problema Modelo 1: Distancia en el N-ésimo Segundo',
          subtitle: 'Examen UNI / CEPRE',
          exercise: {
            question: 'Un móvil parte del reposo con aceleración constante de $4\\text{ m/s}^2$. Calcule la distancia recorrida exactamente en el 5° segundo de su movimiento.',
            options: ['A) 16 m', 'B) 18 m', 'C) 20 m', 'D) 22 m', 'E) 24 m'],
            correctAnswer: 1,
            steps: [
              {
                stepTitle: 'Paso 1: Identificación de datos y fórmula del enésimo segundo',
                stepMath: 'd_n = v_0 + \\frac{1}{2}a(2n - 1)',
                stepExplanation: 'Como parte del reposo, la velocidad inicial es $v_0 = 0$. La aceleración es $a = 4\\text{ m/s}^2$ y el segundo solicitado es $n = 5$.'
              },
              {
                stepTitle: 'Paso 2: Sustitución de valores numéricos',
                stepMath: 'd_5 = 0 + \\frac{1}{2}(4)(2(5) - 1) = 2(10 - 1)',
                stepExplanation: 'Multiplicamos $2 \\times 9 = 18\\text{ m}$.'
              },
              {
                stepTitle: 'Paso 3: Conclusión y clave',
                stepMath: 'd_5 = 18\\text{ m}',
                stepExplanation: 'La distancia recorrida en el 5° segundo es 18 m. Clave correcta: B.'
              }
            ]
          }
        },
        {
          id: 's4',
          type: 'exercise',
          title: 'Problema Modelo 2: Tiempo de Encuentro',
          subtitle: 'Examen Tipo San Marcos',
          exercise: {
            question: 'Dos móviles parten simultáneamente desde puntos distantes $200\\text{ m}$ con rapideces de $15\\text{ m/s}$ y $25\\text{ m/s}$ al encuentro en MRU. ¿Al cabo de cuánto tiempo se cruzan?',
            options: ['A) 5 s', 'B) 6 s', 'C) 8 s', 'D) 10 s', 'E) 12 s'],
            correctAnswer: 0,
            steps: [
              {
                stepTitle: 'Paso 1: Ecuación de tiempo de encuentro',
                stepMath: 't_{enc} = \\frac{d_{separación}}{v_1 + v_2}',
                stepExplanation: 'En el movimiento simultáneo al encuentro, la suma de las distancias recorridas equivale a la separación inicial.'
              },
              {
                stepTitle: 'Paso 2: Reemplazo de datos',
                stepMath: 't_{enc} = \\frac{200}{15 + 25} = \\frac{200}{40} = 5\\text{ s}',
                stepExplanation: 'Efectuando la división obtenemos exactamente 5 segundos.'
              }
            ]
          }
        },
        {
          id: 's5',
          type: 'summary',
          title: 'Formulario Resumen para la Pizarra',
          subtitle: 'Academia John Nash • Memoriza estas relaciones',
          bullets: [
            '$v_f = v_0 \\pm a t$',
            '$d = \\left(\\frac{v_0 + v_f}{2}\\right) t$',
            '$d = v_0 t \\pm \\frac{1}{2} a t^2$',
            '$v_f^2 = v_0^2 \\pm 2 a d$',
            '$d_n = v_0 \\pm \\frac{1}{2}a(2n - 1)$'
          ],
          formula: '\\text{Recuerda: Si } a=0 \\implies d = v \\cdot t \\text{ (MRU)}'
        }
      ]
    };
  });

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [revealedSteps, setRevealedSteps] = useState<number>(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setTheme] = useState<'navy' | 'chalk' | 'light'>('navy');

  // Generator modal
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCourse, setAiCourse] = useState('Matemática');
  const [aiLevel, setAiLevel] = useState('Pre-universitario');
  const [isGenerating, setIsGenerating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const currentSlide = deck.slides[currentSlideIndex] || deck.slides[0];

  // Reset revealed steps when slide changes
  useEffect(() => {
    setRevealedSteps(0);
    setShowAnswer(false);
  }, [currentSlideIndex]);

  // Keyboard navigation for presentation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        // If current slide is exercise and not all steps revealed, reveal next step!
        if (currentSlide.type === 'exercise' && currentSlide.exercise?.steps) {
          if (revealedSteps < currentSlide.exercise.steps.length) {
            setRevealedSteps(prev => prev + 1);
            return;
          }
        }
        // Otherwise go to next slide
        if (currentSlideIndex < deck.slides.length - 1) {
          setCurrentSlideIndex(prev => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentSlideIndex > 0) {
          setCurrentSlideIndex(prev => prev - 1);
        }
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlideIndex, currentSlide, revealedSteps, deck.slides.length]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => console.error(err));
      setIsFullscreen(false);
    }
  };

  const handleGenerateSlidesWithAi = async () => {
    if (!aiTopic.trim()) return;
    setIsGenerating(true);

    try {
      const res = await fetch('/api/generate-slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: aiTopic.trim(),
          course: aiCourse,
          level: aiLevel,
          slideCount: 8
        })
      });

      if (!res.ok) throw new Error('Error al generar diapositivas');
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
            } catch {}
          }
        }
      }

      if (parsed.slides && Array.isArray(parsed.slides)) {
        setDeck({
          id: `deck-${Date.now()}`,
          title: parsed.title || aiTopic,
          course: parsed.course || aiCourse,
          level: parsed.level || aiLevel,
          slides: parsed.slides
        });
        setCurrentSlideIndex(0);
        setShowAiModal(false);
      }
    } catch (e: any) {
      console.error(e);
      alert('No se pudo generar la presentación con IA. Verifica tu conexión.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Convert current exercise slides to Exam
  const handleExportDeckToExam = () => {
    if (onExportToExam) {
      const exercises = deck.slides
        .filter(s => s.type === 'exercise' && s.exercise)
        .map((s, idx) => ({
          id: `ex-${idx}`,
          question: s.exercise!.question,
          options: s.exercise!.options,
          correctAnswer: s.exercise!.correctAnswer,
          explanation: s.exercise!.steps?.map(st => `${st.stepTitle}: ${st.stepExplanation}`).join('\n')
        }));
      onExportToExam(deck.title, exercises);
    }
  };

  // Theme styling
  const themeClasses = {
    navy: 'bg-gradient-to-br from-[#0B1528] via-[#0F1E36] to-[#0A1120] text-white border-slate-300',
    chalk: 'bg-gradient-to-br from-[#1C3326] via-[#162A1F] to-[#0E1A13] text-emerald-100 border-emerald-900',
    light: 'bg-white text-slate-900 border-slate-200'
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-68px)] overflow-hidden bg-white text-slate-800">
      
      {/* Top Toolbar for Slides */}
      <div className="h-14 bg-slate-50 border-b border-slate-200 px-4 flex items-center justify-between shrink-0 no-print">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold">
            <Presentation className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white truncate max-w-xs sm:max-w-md">
              {deck.title}
            </h3>
            <div className="text-[10px] text-slate-500">
              Diapositiva {currentSlideIndex + 1} de {deck.slides.length} • {deck.course}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme selector */}
          <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setTheme('navy')}
              className={`px-2 py-1 rounded-md text-[11px] ${theme === 'navy' ? 'bg-sky-600 text-white font-bold' : 'text-slate-500'}`}
            >
              Azul Nash
            </button>
            <button
              onClick={() => setTheme('chalk')}
              className={`px-2 py-1 rounded-md text-[11px] ${theme === 'chalk' ? 'bg-emerald-700 text-white font-bold' : 'text-slate-500'}`}
            >
              Pizarra
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`px-2 py-1 rounded-md text-[11px] ${theme === 'light' ? 'bg-white text-slate-900 font-bold' : 'text-slate-500'}`}
            >
              Blanco
            </button>
          </div>

          {/* AI Generator Button */}
          <button
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-lg text-xs font-bold transition-all shadow-sm"
            title="Generar nueva presentación con IA sobre cualquier tema"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Generar con IA</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
            title="Pantalla Completa (Tecla F)"
          >
            <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Proyectar</span>
          </button>
        </div>
      </div>

      {/* Main Slide Viewer Canvas (16:9 Screen) */}
      <div 
        ref={containerRef}
        className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 overflow-hidden relative bg-black select-none"
      >
        
        {/* The 16:9 Slide Canvas */}
        <div 
          className={`w-full max-w-5xl aspect-[16/9] rounded-2xl shadow-2xl border flex flex-col p-6 sm:p-10 relative overflow-hidden transition-all ${themeClasses[theme]}`}
        >
          {/* Header of Slide: John Nash branding & slide type badge */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <img src="/logo_nash.png" alt="Nash" className="w-6 h-6 object-contain" />
              <div className="font-serif font-bold text-xs tracking-wider uppercase opacity-80">
                Academia Preuniversitaria John Nash
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/10 text-sky-300">
                {currentSlide.type === 'exercise' ? 'EJERCICIO RESUELTO' : currentSlide.type.toUpperCase()}
              </span>
              <span className="text-xs font-mono opacity-50">
                {currentSlideIndex + 1}/{deck.slides.length}
              </span>
            </div>
          </div>

          {/* Slide Body based on Type */}
          <div className="flex-1 flex flex-col justify-center overflow-y-auto pr-2">
            
            {/* TYPE: TITLE SLIDE */}
            {currentSlide.type === 'title' && (
              <div className="text-center my-auto space-y-4">
                <div className="inline-block px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 font-bold text-xs tracking-widest uppercase mb-2">
                  {deck.course}
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold font-serif tracking-tight leading-tight">
                  <TextWithMath text={currentSlide.title} />
                </h1>
                {currentSlide.subtitle && (
                  <p className="text-sm sm:text-lg opacity-80 font-medium max-w-2xl mx-auto">
                    {currentSlide.subtitle}
                  </p>
                )}
                {currentSlide.formula && (
                  <div className="py-4 text-xl sm:text-2xl text-amber-300">
                    <BlockMath math={currentSlide.formula} />
                  </div>
                )}
              </div>
            )}

            {/* TYPE: CONCEPT / THEORY */}
            {currentSlide.type === 'concept' && (
              <div className="space-y-4">
                <h2 className="text-xl sm:text-2xl font-bold font-serif text-sky-300">
                  <TextWithMath text={currentSlide.title} />
                </h2>
                {currentSlide.subtitle && (
                  <p className="text-xs sm:text-sm opacity-70">
                    {currentSlide.subtitle}
                  </p>
                )}
                
                {currentSlide.bullets && (
                  <ul className="space-y-2.5 my-3 text-sm sm:text-base">
                    {currentSlide.bullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-amber-400 font-bold">•</span>
                        <div><TextWithMath text={b} /></div>
                      </li>
                    ))}
                  </ul>
                )}

                {currentSlide.formula && (
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center my-3 text-lg sm:text-xl text-amber-300">
                    <BlockMath math={currentSlide.formula} />
                  </div>
                )}
              </div>
            )}

            {/* TYPE: EXERCISE WITH STEP-BY-STEP REVEAL */}
            {currentSlide.type === 'exercise' && currentSlide.exercise && (
              <div className="space-y-3">
                <h2 className="text-lg sm:text-xl font-bold font-serif text-amber-300">
                  <TextWithMath text={currentSlide.title} />
                </h2>

                {/* Question */}
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-sm sm:text-base leading-relaxed">
                  <TextWithMath text={currentSlide.exercise.question} />
                </div>

                {/* Options */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  {currentSlide.exercise.options.map((opt, i) => {
                    const isCorrect = i === currentSlide.exercise!.correctAnswer;
                    return (
                      <div 
                        key={i}
                        className={`p-2 rounded-lg border text-center transition-all ${
                          showAnswer && isCorrect
                            ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300 font-bold scale-105 shadow-md'
                            : 'bg-white/5 border-white/10 opacity-80'
                        }`}
                      >
                        <TextWithMath text={opt} />
                      </div>
                    );
                  })}
                </div>

                {/* Step-by-Step Solution container */}
                {currentSlide.exercise.steps && currentSlide.exercise.steps.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {currentSlide.exercise.steps.slice(0, revealedSteps).map((st, sIdx) => (
                      <div 
                        key={sIdx}
                        className="p-3 rounded-lg bg-sky-950/40 border border-sky-800/60 animate-in fade-in slide-in-from-bottom-2 duration-200 text-xs sm:text-sm"
                      >
                        <div className="font-bold text-sky-300 mb-1">{st.stepTitle}</div>
                        {st.stepMath && (
                          <div className="my-1 text-amber-200">
                            <BlockMath math={st.stepMath.replace(/\$/g, '')} />
                          </div>
                        )}
                        <div className="opacity-90 leading-relaxed">
                          <TextWithMath text={st.stepExplanation} />
                        </div>
                      </div>
                    ))}

                    {/* Step control buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      {revealedSteps < currentSlide.exercise.steps.length ? (
                        <button
                          onClick={() => setRevealedSteps(prev => prev + 1)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-transform hover:scale-102"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Mostrar Paso {revealedSteps + 1} de {currentSlide.exercise.steps.length}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowAnswer(prev => !prev)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all"
                        >
                          {showAnswer ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{showAnswer ? 'Ocultar Clave' : 'Destacar Clave Correcta'}</span>
                        </button>
                      )}

                      {revealedSteps > 0 && (
                        <button
                          onClick={() => { setRevealedSteps(0); setShowAnswer(false); }}
                          className="p-1.5 text-slate-500 hover:text-white rounded-lg transition-colors text-xs flex items-center gap-1"
                          title="Reiniciar pasos del ejercicio"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Reiniciar</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* TYPE: SUMMARY */}
            {currentSlide.type === 'summary' && (
              <div className="space-y-4 my-auto">
                <h2 className="text-xl sm:text-2xl font-bold font-serif text-amber-300 text-center">
                  <TextWithMath text={currentSlide.title} />
                </h2>
                {currentSlide.bullets && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
                    {currentSlide.bullets.map((b, i) => (
                      <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10 text-center text-sm font-semibold">
                        <TextWithMath text={b} />
                      </div>
                    ))}
                  </div>
                )}
                {currentSlide.formula && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center text-amber-300 text-sm">
                    <TextWithMath text={currentSlide.formula} />
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Footer of Slide */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] opacity-60 shrink-0">
            <span>Usa las flechas [←] [→] o Barra Espaciadora para avanzar</span>
            <span className="font-serif italic">Academia John Nash • Creemos en tu esfuerzo</span>
          </div>

        </div>

        {/* Bottom Slide Navigation Bar */}
        <div className="mt-4 flex items-center gap-4 bg-slate-50/90 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200 text-xs shadow-lg">
          <button
            onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
            disabled={currentSlideIndex === 0}
            className="p-1.5 rounded-full hover:bg-slate-200 disabled:opacity-30 text-slate-700 transition-colors"
            title="Diapositiva anterior (Flecha Izquierda)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Carousel thumbnails */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-xs sm:max-w-md no-scrollbar py-1">
            {deck.slides.map((s, idx) => (
              <button
                key={s.id || idx}
                onClick={() => setCurrentSlideIndex(idx)}
                className={`w-7 h-5 rounded text-[10px] font-bold transition-all shrink-0 ${
                  currentSlideIndex === idx
                    ? 'bg-sky-500 text-white scale-110 shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-300 hover:text-slate-800'
                }`}
                title={s.title}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentSlideIndex(prev => Math.min(deck.slides.length - 1, prev + 1))}
            disabled={currentSlideIndex === deck.slides.length - 1}
            className="p-1.5 rounded-full hover:bg-slate-200 disabled:opacity-30 text-slate-700 transition-colors"
            title="Siguiente diapositiva (Flecha Derecha o Espacio)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

      </div>

      {/* ============================================================ */}
      {/* MODAL: GENERAR DIAPOSITIVAS CON IA */}
      {/* ============================================================ */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-50 border border-slate-300 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-base">Generador de Diapositivas con IA</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Crea una presentación completa con teoría, fórmulas LaTeX y ejercicios con solución paso a paso revelable.
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tema de la Clase</label>
                <input 
                  type="text" 
                  value={aiTopic} 
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Ej: Leyes de Newton, Dinámica Lineal o Identidades Trigonométricas"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Curso</label>
                  <select 
                    value={aiCourse} 
                    onChange={(e) => setAiCourse(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-400"
                  >
                    <option value="Física">Física</option>
                    <option value="Álgebra">Álgebra</option>
                    <option value="Aritmética">Aritmética</option>
                    <option value="Geometría">Geometría</option>
                    <option value="Trigonometría">Trigonometría</option>
                    <option value="Química">Química</option>
                    <option value="Raz. Matemático">Raz. Matemático</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nivel</label>
                  <select 
                    value={aiLevel} 
                    onChange={(e) => setAiLevel(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-400"
                  >
                    <option value="Pre-universitario">Pre-universitario UNI/SM</option>
                    <option value="Secundaria 3°-5°">Secundaria (3°-5°)</option>
                    <option value="Secundaria 1°-2°">Secundaria (1°-2°)</option>
                    <option value="Primaria">Primaria</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerateSlidesWithAi}
                disabled={isGenerating || !aiTopic.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-lg shadow-sm"
              >
                {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{isGenerating ? 'Generando diapositivas...' : 'Generar Presentación'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
