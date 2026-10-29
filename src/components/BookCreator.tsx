import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  FileText, 
  Layers, 
  CheckCircle2, 
  ListOrdered, 
  Settings2, 
  Loader2, 
  Download, 
  Plus, 
  Trash2, 
  Printer, 
  HelpCircle,
  Lightbulb,
  Check,
  ChevronRight,
  BookMarked
} from 'lucide-react';
import { DocumentInfo, Block, ChapterInfo } from '../types';
import { robustJsonParse } from '../utils/jsonParser';
import { DEFAULT_MARGIN_CONFIG } from './MarginsModal';

interface BookCreatorProps {
  onBookGenerated: (newDoc: DocumentInfo) => void;
  savedDocuments: DocumentInfo[];
  onOpenExistingBook: (id: string) => void;
}

const PRESET_SYLLABI: Record<string, { title: string; syllabus: string }> = {
  'Álgebra': {
    title: 'Compendio Académico de Álgebra 2026',
    syllabus: `Semana 1: Teoría de Exponentes y Ecuaciones Exponenciales
Semana 2: Polinomios, Grados y Valor Numérico
Semana 3: Productos Notables e Identidades Algebraicas
Semana 4: División Algebraica, Método de Horner y Teorema del Resto
Semana 5: Cocientes Notables y Métodos de Factorización
Semana 6: Ecuaciones Cuadráticas y Propiedades de las Raíces`
  },
  'Aritmética': {
    title: 'Libro Oficial de Aritmética Preuniversitaria',
    syllabus: `Semana 1: Razones, Proporciones y Promedios
Semana 2: Regla de Tanto por Ciento y Aplicaciones Comerciales
Semana 3: Teoría de la Divisibilidad y Criterios Notables
Semana 4: Números Primos, Compuestos y Cantidad de Divisores
Semana 5: Máximo Común Divisor (MCD) y Mínimo Común Múltiplo (MCM)
Semana 6: Teoría de Conjuntos y Operaciones`
  },
  'Geometría': {
    title: 'Tratado de Geometría Plana y del Espacio',
    syllabus: `Semana 1: Triángulos, Propiedades Fundamentales y Líneas Notables
Semana 2: Congruencia de Triángulos y Criterios Clásicos
Semana 3: Circunferencia, Ángulos Asociados y Teorema de Poncelet
Semana 4: Semejanza de Triángulos y Relaciones Métricas
Semana 5: Áreas de Regiones Poligonales y Circulares
Semana 6: Geometría del Espacio y Poliedros Regulares`
  },
  'Trigonometría': {
    title: 'Compendio de Trigonometría Moderna',
    syllabus: `Semana 1: Sistemas de Medición Angular y Longitud de Arco
Semana 2: Razones Trigonométricas de Ángulos Agudos y Notables
Semana 3: Razones de Ángulos en Posición Normal y Reducción al Primer Cuadrante
Semana 4: Identidades Trigonométricas Fundamentales y Auxiliares
Semana 5: Funciones Trigonométricas y Transformaciones
Semana 6: Resolución de Triángulos Oblicuángulos y Ley de Senos/Cosenos`
  },
  'Física': {
    title: 'Física Preuniversitaria Teórico-Práctica',
    syllabus: `Semana 1: Análisis Dimensional y Vectores en el Plano
Semana 2: Cinemática: Movimiento Rectilíneo Uniforme y Variado (MRU y MRUV)
Semana 3: Movimiento Vertical de Caída Libre y Tiro Parabólico
Semana 4: Estática: Primera y Segunda Condición de Equilibrio Mecánico
Semana 5: Dinámica Lineal, Leyes de Newton y Rozamiento
Semana 6: Trabajo Mecánico, Potencia y Conservación de la Energía`
  },
  'Raz. Matemático': {
    title: 'Libro Maestro de Razonamiento Matemático',
    syllabus: `Semana 1: Planteo de Ecuaciones y Problemas sobre Edades
Semana 2: Ordenamiento de Información y Cuadros de Decisiones Lógicas
Semana 3: Sucesiones Numéricas, Literales y Series Notables
Semana 4: Operadores Matemáticos Arbitrarios y Tablas de Doble Entrada
Semana 5: Certezas, Principio del Palomar, Máximos y Mínimos
Semana 6: Razonamiento Inductivo y Deductivo`
  }
};

export const BookCreator: React.FC<BookCreatorProps> = ({
  onBookGenerated,
  savedDocuments,
  onOpenExistingBook
}) => {
  const [course, setCourse] = useState<string>('Álgebra');
  const [level, setLevel] = useState<string>('Pre-universitario (San Marcos / UNI)');
  const [bookTitle, setBookTitle] = useState<string>('Compendio Académico de Álgebra 2026');
  const [syllabusText, setSyllabusText] = useState<string>(PRESET_SYLLABI['Álgebra'].syllabus);
  
  // Parsed discrete topics
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopicIndices, setSelectedTopicIndices] = useState<number[]>([]);
  
  // Configurations: 4 or 5 exercises per level (16 or 20 total per topic)
  const [exercisesPerTopic, setExercisesPerTopic] = useState<number>(16);
  const [includeCover, setIncludeCover] = useState<boolean>(true);
  const [includeIndex, setIncludeIndex] = useState<boolean>(true);
  const [includeTheory, setIncludeTheory] = useState<boolean>(true);
  const [includeKeySheet, setIncludeKeySheet] = useState<boolean>(true);
  
  // UI status
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Parse topics whenever syllabusText changes
  useEffect(() => {
    const rawLines = syllabusText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 2)
      .map(l => l.replace(/^(semana|tema|capítulo|capitulo|unidad|\d+[\.\-\)]|\-|\*)\s*\d*[:\.\-]?\s*/i, '').trim())
      .filter(l => l.length > 0);

    setTopics(rawLines);
    // By default select ALL topics so every chapter of the syllabus is elaborated
    const initialSelected = rawLines.map((_, idx) => idx);
    setSelectedTopicIndices(initialSelected);
  }, [syllabusText]);

  const handleSelectPreset = (courseKey: string) => {
    setCourse(courseKey);
    const preset = PRESET_SYLLABI[courseKey];
    if (preset) {
      setBookTitle(preset.title);
      setSyllabusText(preset.syllabus);
    }
  };

  const toggleTopic = (index: number) => {
    setSelectedTopicIndices(prev => {
      if (prev.includes(index)) {
        if (prev.length <= 1) return prev; // Keep at least one
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index].sort((a, b) => a - b);
      }
    });
  };

  const handleSelectAllTopics = () => {
    setSelectedTopicIndices(topics.map((_, idx) => idx));
  };

  const handleGenerateBook = async () => {
    const activeTopics = selectedTopicIndices.map(i => topics[i]).filter(Boolean);
    if (activeTopics.length === 0) {
      setError('Debes seleccionar al menos un tema del sílabo para generar el libro.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGenerationStep('Estructurando Sílabo y Plan de Redacción...');

    try {
      const stepTimer1 = setTimeout(() => {
        setGenerationStep('Generando Carátula Oficial A4 e Índice General...');
      }, 2500);

      const stepTimer2 = setTimeout(() => {
        setGenerationStep('Redactando teoría resumida, fórmulas KaTeX y notas "Sabías que"...');
      }, 6000);

      const stepTimer3 = setTimeout(() => {
        setGenerationStep('Construyendo banco de ejercicios tipo admisión en 2 columnas con alternativas...');
      }, 11000);

      const stepTimer4 = setTimeout(() => {
        setGenerationStep('Calculando claves de respuestas y maquetando páginas A4 exactas...');
      }, 16000);

      const res = await fetch('/api/generate-book-from-syllabus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: bookTitle.trim() || `Libro de ${course}`,
          course,
          level,
          topics: activeTopics,
          exercisesPerTopic: Math.max(16, exercisesPerTopic),
          includeCover,
          includeIndex,
          includeTheory,
          includeKeySheet
        })
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      clearTimeout(stepTimer4);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al comunicarse con el servicio de IA de libros.');
      }

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

      if (!parsed || !parsed.blocks || !Array.isArray(parsed.blocks)) {
        throw new Error('La estructura devuelta por la IA no contiene los bloques requeridos para el libro.');
      }

      // Convert to DocumentInfo with pristine metadata
      let currentCh = 1;
      let currentChTitle = activeTopics[0] || 'Capítulo 1';
      let exerciseInChapter = 0;

      const blocks: Block[] = parsed.blocks.map((b: any, idx: number) => {
        const isCover = b.metadata?.isCover || (typeof b.content === 'string' && b.content.includes('book-cover-page'));
        const isIndex = b.metadata?.isIndex || (typeof b.content === 'string' && b.content.includes('book-index-page'));
        const isKeySheet = b.metadata?.isKeySheet || (typeof b.content === 'string' && b.content.includes('book-keys-page'));

        let newChapter = false;
        if (b.metadata?.chapter !== undefined) {
          const nextCh = Number(b.metadata.chapter);
          if (nextCh !== currentCh) {
            currentCh = nextCh;
            newChapter = true;
          }
          if (b.metadata.chapterTitle) currentChTitle = b.metadata.chapterTitle;
        } else if (b.type === 'text') {
          const match = String(b.content || '').match(/CAP[ÍI]TULO\s*(\d+)/i);
          if (match) {
            const nextCh = parseInt(match[1], 10);
            if (nextCh !== currentCh) {
              currentCh = nextCh;
              newChapter = true;
            }
            currentChTitle = activeTopics[currentCh - 1] || `Capítulo ${currentCh}`;
          }
        }

        if (newChapter) {
          exerciseInChapter = 0;
        }

        const isTheory = b.metadata?.isTheory || (!isCover && !isIndex && !isKeySheet && b.type === 'text');

        let exerciseMeta = {};
        if (b.type === 'exercise') {
          exerciseInChapter++;
          // Exactly 4 or 5 exercises per level:
          // Level 1: Básico
          // Level 2: Intermedio
          // Level 3: Avanzado
          // Level 4: Tarea Domiciliaria
          const perLevel = Math.max(4, Math.floor(exercisesPerTopic / 4));
          const isBasic = exerciseInChapter <= perLevel;
          const isInter = exerciseInChapter > perLevel && exerciseInChapter <= perLevel * 2;
          const isAdv = exerciseInChapter > perLevel * 2 && exerciseInChapter <= perLevel * 3;
          const isHw = exerciseInChapter > perLevel * 3;

          const levelLabel = b.metadata?.level || (
            isBasic ? 'Básico' : isInter ? 'Intermedio' : isAdv ? 'Avanzado' : 'Tarea Domiciliaria'
          );
          const isHomeworkBool = b.metadata?.isHomework !== undefined 
            ? Boolean(b.metadata.isHomework) 
            : isHw;

          const isAdmissionExam = Boolean(
            b.metadata?.isAdmissionExam !== undefined 
              ? b.metadata.isAdmissionExam 
              : (isAdv && (b.metadata?.examSource || (typeof b.content === 'string' && /Ex Admisi[óo]n/i.test(b.content))))
          );

          exerciseMeta = {
            level: levelLabel,
            isHomework: isHomeworkBool,
            exerciseNumberInChapter: b.metadata?.exerciseNumberInChapter || exerciseInChapter,
            isAdmissionExam,
            examSource: isAdmissionExam ? (b.metadata?.examSource || undefined) : undefined,
          };
        }

        return {
          id: `block-${Date.now()}-${idx}`,
          type: b.type,
          content: b.content,
          metadata: {
            ...(b.metadata || {}),
            ...exerciseMeta,
            ...(isCover ? { isCover: true } : {}),
            ...(isIndex ? { isIndex: true } : {}),
            ...(isKeySheet ? { isKeySheet: true } : {}),
            ...(!isCover && !isIndex && !isKeySheet ? {
              chapter: b.metadata?.chapter !== undefined ? Number(b.metadata.chapter) : currentCh,
              chapterTitle: b.metadata?.chapterTitle || currentChTitle,
              ...(isTheory ? { isTheory: true } : {})
            } : {})
          }
        };
      });

      const chapters: ChapterInfo[] = Array.isArray(parsed.chapters)
        ? parsed.chapters
        : activeTopics.map((t, idx) => ({ chapterNumber: idx + 1, title: t, pageStart: idx + 3 }));

      const newDoc: DocumentInfo = {
        id: `book-${Date.now()}`,
        title: bookTitle.trim() || `Libro de ${course}`,
        subject: (course === 'Física' ? 'Physics' : course === 'Química' ? 'Chemistry' : course === 'Biología' ? 'Biology' : 'Math') as any,
        blocks,
        createdAt: new Date(),
        updatedAt: new Date(),
        isBook: true,
        syllabus: syllabusText,
        chapters,
        margins: {
          ...DEFAULT_MARGIN_CONFIG
        }
      };

      onBookGenerated(newDoc);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocurrió un error al generar el libro. Por favor intenta con menos temas o vuelve a presionar generar.');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // Filter saved books
  const savedBooks = savedDocuments.filter(d => 
    d.isBook || 
    d.blocks.some(b => b.metadata?.isCover || b.metadata?.chapter !== undefined || b.content?.includes('book-cover-page'))
  );

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-68px)] overflow-y-auto bg-slate-50 text-slate-800 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto w-full space-y-8">
        
        {/* Header Hero */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold shadow-md shadow-sky-600/20">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-serif font-black text-slate-900 tracking-tight">
                  Creador de Libros desde Sílabo (IA)
                </h1>
                <div className="text-[11px] font-bold text-sky-700 tracking-widest uppercase">
                  Academia John Nash • Editorial Preuniversitaria A4
                </div>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mt-1">
              Envía los temas o pega el sílabo oficial de tu asignatura. La IA elaborará un <strong>libro académico completo</strong> con Carátula, Índice General con páginas exactas, Capítulos desarrollados en 2 columnas y tabla de Claves de Respuestas.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-sky-200 text-xs text-sky-800 font-semibold shadow-xs">
            <Printer className="w-4 h-4 text-sky-600 shrink-0" />
            <div>
              <div className="font-bold">Formato A4 Imprenta</div>
              <div className="text-[10px] text-slate-500 font-normal">Páginas exactas sin cortes</div>
            </div>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center justify-between shadow-xs">
            <span className="font-medium">{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-800 font-bold text-sm ml-3">×</button>
          </div>
        )}

        {/* Main Grid: Form Left, Preview & Topics Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Form & Configuration (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Step 1: Preset Syllabi Quick Selection */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                  <span>1. Cargar Sílabo de Muestra (1 Clic)</span>
                </label>
                <span className="text-[11px] text-slate-400">O escribe el tuyo abajo</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {Object.keys(PRESET_SYLLABI).map(courseKey => (
                  <button
                    key={courseKey}
                    type="button"
                    onClick={() => handleSelectPreset(courseKey)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      course === courseKey
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {courseKey}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Book Details */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <BookMarked className="w-3.5 h-3.5 text-sky-600" />
                <span>2. Identidad del Libro</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Curso / Asignatura
                  </label>
                  <select
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white transition-all"
                  >
                    <option value="Álgebra">Álgebra</option>
                    <option value="Aritmética">Aritmética</option>
                    <option value="Geometría">Geometría</option>
                    <option value="Trigonometría">Trigonometría</option>
                    <option value="Física">Física</option>
                    <option value="Química">Química</option>
                    <option value="Raz. Matemático">Raz. Matemático</option>
                    <option value="Biología">Biología</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Nivel Académico
                  </label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white transition-all"
                  >
                    <option value="Pre-universitario (San Marcos / UNI)">Pre-universitario (San Marcos / UNI)</option>
                    <option value="CEPRE-UNI (Alta Dificultad)">CEPRE-UNI (Alta Dificultad)</option>
                    <option value="Pre San Marcos (Destrezas Cognitivas DECO)">Pre San Marcos (DECO)</option>
                    <option value="Secundaria 4° y 5° Año">Secundaria 4° y 5° Año</option>
                    <option value="Secundaria 1° a 3° Año">Secundaria 1° a 3° Año</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Título Oficial del Libro
                </label>
                <input
                  type="text"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder="Ej: Compendio Académico de Álgebra 2026"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Step 3: Syllabus / Topics Textarea */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ListOrdered className="w-3.5 h-3.5 text-sky-600" />
                  <span>3. Sílabo o Lista de Temas</span>
                </label>
                <span className="text-[11px] text-sky-700 font-semibold bg-sky-50 px-2 py-0.5 rounded-md">
                  {topics.length} temas detectados
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Pega aquí tu lista de semanas o capítulos. La IA detectará automáticamente cada tema.
              </p>

              <textarea
                value={syllabusText}
                onChange={(e) => setSyllabusText(e.target.value)}
                rows={6}
                placeholder="Semana 1: Teoría de Exponentes&#10;Semana 2: Polinomios&#10;Semana 3: Productos Notables..."
                className="w-full font-mono bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white transition-all leading-relaxed"
              />
            </div>

            {/* Step 4: Editorial Components Checkboxes */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-sky-600" />
                <span>4. Estructura y Componentes del Libro</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={includeCover}
                    onChange={(e) => setIncludeCover(e.target.checked)}
                    className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                  />
                  <div>
                    <div className="font-bold text-slate-800">Carátula Oficial A4</div>
                    <div className="text-[10px] text-slate-500">Con logotipo John Nash y sellos</div>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={includeIndex}
                    onChange={(e) => setIncludeIndex(e.target.checked)}
                    className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                  />
                  <div>
                    <div className="font-bold text-slate-800">Índice General</div>
                    <div className="text-[10px] text-slate-500">Tabla de contenidos con páginas</div>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={includeTheory}
                    onChange={(e) => setIncludeTheory(e.target.checked)}
                    className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                  />
                  <div>
                    <div className="font-bold text-slate-800">Teoría y Fórmulas ($$)</div>
                    <div className="text-[10px] text-slate-500">Resumen y tip "Sabías que"</div>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={includeKeySheet}
                    onChange={(e) => setIncludeKeySheet(e.target.checked)}
                    className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                  />
                  <div>
                    <div className="font-bold text-slate-800">Tabla de Claves al Final</div>
                    <div className="text-[10px] text-slate-500">Respuestas correctas de ejercicios</div>
                  </div>
                </label>
              </div>

              {/* Number of exercises per chapter (> 15 exercises, Básico / Intermedio / Actividad Domiciliaria) */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>Ejercicios por Tema</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase tracking-wider">
                        Más de 15 por tema
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Preguntas con 5 alternativas (a, b, c, d, e) y numeradas desde 1 en cada capítulo
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {[16, 20].map((count) => {
                      const perL = count === 16 ? 4 : 5;
                      return (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setExercisesPerTopic(count)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                            exercisesPerTopic === count
                              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30 ring-2 ring-sky-400'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <span>{count} Ejercicios</span>
                          <span className="text-[10px] opacity-80">({perL} por nivel)</span>
                          {count === 16 && <span className="text-amber-300 ml-0.5">★</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Pedagogy structure breakdown card - 4 Niveles Oficiales */}
                {(() => {
                  const perL = exercisesPerTopic === 20 ? 5 : 4;
                  return (
                    <div className="bg-gradient-to-br from-slate-50 via-sky-50/40 to-indigo-50/30 border border-sky-100 rounded-xl p-3 text-[11px] space-y-2">
                      <div className="font-bold text-slate-800 text-xs flex items-center justify-between flex-wrap gap-1">
                        <span>4 Niveles Oficiales por Capítulo ({perL} Preguntas por Nivel • {exercisesPerTopic} en total):</span>
                        <span className="text-sky-700 font-sans font-semibold text-[10.5px]">
                          Tal cual exámenes de admisión cepreUNAS • UNMSM • UNI • UNHEVAL
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-0.5">
                        <div className="bg-white/95 p-2.5 rounded-lg border border-emerald-200 flex items-start gap-1.5 shadow-2xs">
                          <span className="text-emerald-600 font-bold">🟢</span>
                          <div>
                            <div className="font-bold text-emerald-900 text-[11px]">Nivel Básico (1 al {perL})</div>
                            <div className="text-[9.5px] text-slate-600 leading-tight">Tipo cepreUNAS / UNHEVAL (Definiciones y fórmulas directas)</div>
                          </div>
                        </div>
                        <div className="bg-white/95 p-2.5 rounded-lg border border-sky-200 flex items-start gap-1.5 shadow-2xs">
                          <span className="text-sky-600 font-bold">🟡</span>
                          <div>
                            <div className="font-bold text-sky-900 text-[11px]">Nivel Intermedio ({perL + 1} al {perL * 2})</div>
                            <div className="text-[9.5px] text-slate-600 leading-tight">Tipo UNMSM / cepreUNAS (Artificios y deducción analítica)</div>
                          </div>
                        </div>
                        <div className="bg-white/95 p-2.5 rounded-lg border border-amber-200 flex items-start gap-1.5 shadow-2xs">
                          <span className="text-amber-600 font-bold">🟠</span>
                          <div>
                            <div className="font-bold text-amber-900 text-[11px]">Nivel Avanzado ({perL * 2 + 1} al {perL * 3})</div>
                            <div className="text-[9.5px] text-slate-600 leading-tight">Tipo UNI / UNMSM (Alto rigor y destreza cognitiva DECO)</div>
                          </div>
                        </div>
                        <div className="bg-white/95 p-2.5 rounded-lg border border-purple-200 flex items-start gap-1.5 shadow-2xs">
                          <span className="text-purple-600 font-bold">🟣</span>
                          <div>
                            <div className="font-bold text-purple-900 text-[11px]">Tarea Domiciliaria ({perL * 3 + 1} al {exercisesPerTopic})</div>
                            <div className="text-[9.5px] text-slate-600 leading-tight">Exámenes de admisión cepreUNAS, UNMSM, UNI, UNHEVAL para la casa</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Big Action Button */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleGenerateBook}
                disabled={isGenerating || selectedTopicIndices.length === 0}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-sky-600/25 hover:shadow-sky-600/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{generationStep || 'Elaborando libro con IA...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <span>Generar Libro Completo A4 con IA ({selectedTopicIndices.length} Capítulos)</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-center text-slate-500">
                Se maquetará en páginas A4 exactas (210mm × 297mm) listas para descargar en PDF o imprimir.
              </p>
            </div>

          </div>

          {/* Right Column: Topics Selector & Saved Books (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Topic Checklist Panel */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Temas Seleccionados para el Libro
                  </h3>
                  <div className="text-[11px] text-slate-500">
                    Marca los capítulos que deseas incluir en esta edición
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSelectAllTopics}
                  className="text-[11px] text-sky-600 hover:text-sky-800 font-bold"
                >
                  Marcar todos
                </button>
              </div>

              {topics.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 italic bg-slate-50 rounded-xl">
                  Escribe o pega un sílabo a la izquierda para ver los temas.
                </div>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {topics.map((t, idx) => {
                    const isSelected = selectedTopicIndices.includes(idx);
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleTopic(idx)}
                        className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-sky-50/70 border-sky-300 text-slate-900 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          isSelected ? 'bg-sky-600 text-white' : 'border border-slate-300 bg-white'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold text-sky-700 uppercase">
                            Capítulo {idx + 1}
                          </div>
                          <div className={`font-semibold line-clamp-2 ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>
                            {t}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Preview of Resulting Book Structure */}
            <div className="bg-gradient-to-br from-indigo-50/80 to-sky-50/80 p-5 rounded-2xl border border-indigo-100 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>Páginas Estimadas en A4</span>
              </h4>

              <div className="space-y-1.5 text-xs text-indigo-950">
                {includeCover && (
                  <div className="flex items-center justify-between py-1 border-b border-indigo-100/60">
                    <span className="font-medium">• Pág. 1: Carátula Oficial John Nash</span>
                    <span className="text-[10px] font-bold bg-indigo-200/50 px-2 py-0.5 rounded text-indigo-800">PORTADA</span>
                  </div>
                )}
                {includeIndex && (
                  <div className="flex items-center justify-between py-1 border-b border-indigo-100/60">
                    <span className="font-medium">• Pág. 2: Índice General Temático</span>
                    <span className="text-[10px] font-bold bg-indigo-200/50 px-2 py-0.5 rounded text-indigo-800">ÍNDICE</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-1 border-b border-indigo-100/60">
                  <span className="font-medium">• Págs. {includeCover ? (includeIndex ? 3 : 2) : 1} a {selectedTopicIndices.length + (includeCover ? 1 : 0) + (includeIndex ? 1 : 0)}: {selectedTopicIndices.length} Capítulos</span>
                  <span className="text-[10px] font-bold bg-sky-200/50 px-2 py-0.5 rounded text-sky-800">TEORÍA + 2 COL</span>
                </div>
                {includeKeySheet && (
                  <div className="flex items-center justify-between py-1">
                    <span className="font-medium">• Pág. Final: Tabla de Claves de Respuestas</span>
                    <span className="text-[10px] font-bold bg-indigo-200/50 px-2 py-0.5 rounded text-indigo-800">CLAVES</span>
                  </div>
                )}
              </div>
            </div>

            {/* Saved Books Section */}
            {savedBooks.length > 0 && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Libros Guardados en tu Biblioteca
                </h4>

                <div className="space-y-2 max-h-[220px] overflow-y-auto">
                  {savedBooks.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => onOpenExistingBook(b.id)}
                      className="p-3 bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-xs text-slate-800 truncate group-hover:text-sky-700">
                          {b.title}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {b.blocks.filter(bk => bk.type === 'exercise').length} ejercicios • {new Date(b.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
