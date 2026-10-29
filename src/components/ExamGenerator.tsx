import React, { useState } from 'react';
import { 
  FileText, 
  Sparkles, 
  BookOpen, 
  GraduationCap, 
  CheckCircle2, 
  Download, 
  Layers, 
  Loader2,
  Calendar,
  Clock,
  Printer,
  FileCheck
} from 'lucide-react';
import { DocumentInfo, Block } from '../types';
import { robustJsonParse } from '../utils/jsonParser';

interface ExamGeneratorProps {
  onExamGenerated: (newDoc: DocumentInfo) => void;
  savedDocuments: DocumentInfo[];
  onOpenExistingExam: (id: string) => void;
  onNavigateToBookCreator?: () => void;
}

export const ExamGenerator: React.FC<ExamGeneratorProps> = ({
  onExamGenerated,
  savedDocuments,
  onOpenExistingExam,
  onNavigateToBookCreator
}) => {
  const [examTitle, setExamTitle] = useState('');
  const [examType, setExamType] = useState<'libro' | 'simulacro' | 'practica' | 'mensual'>('libro');
  const [course, setCourse] = useState('Álgebra');
  const [level, setLevel] = useState('Pre-universitario');
  const [questionCount, setQuestionCount] = useState<number>(12);
  const [includeTheory, setIncludeTheory] = useState(true);
  const [includeKeySheet, setIncludeKeySheet] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presetTopics: Record<string, string[]> = {
    'Álgebra': [
      'Polinomios y Productos Notables',
      'Ecuaciones Cuadráticas y Sistemas',
      'Logaritmos y Funciones Exponenciales',
      'Matrices y Determinantes',
      'Desigualdades e Inecuaciones'
    ],
    'Aritmética': [
      'Razones, Proporciones y Promedios',
      'Tanto por Ciento y Regla de Interés',
      'Divisibilidad y Números Primos',
      'MCD y MCM con Algoritmo de Euclides',
      'Conjuntos y Conteo de Elementos'
    ],
    'Geometría': [
      'Triángulos, Congruencia y Líneas Notables',
      'Relaciones Métricas en Triángulos Rectángulos',
      'Circunferencia y Ángulos Asociados',
      'Áreas de Regiones Poligonales y Circulares',
      'Geometría del Espacio y Poliedros Regulares'
    ],
    'Trigonometría': [
      'Razones Trigonométricas de Ángulos Agudos',
      'Identidades Trigonométricas Fundamentales',
      'Ángulos Compuestos, Doble y Triple',
      'Ecuaciones Trigonométricas',
      'Resolución de Triángulos Oblicuángulos'
    ],
    'Física': [
      'Cinemática: MRU, MRUV y Caída Libre',
      'Movimiento Parabólico y Circular',
      'Estática: Primera y Segunda Condición de Equilibrio',
      'Dinámica Lineal y Rozamiento',
      'Trabajo Mecánico, Potencia y Energía'
    ],
    'Raz. Matemático': [
      'Planteo de Ecuaciones y Problemas sobre Edades',
      'Orden de Información y Cuadros Lógicos',
      'Sucesiones Numéricas y Series Notables',
      'Operadores Matemáticos Arbitrarios',
      'Certezas, Máximos y Mínimos'
    ]
  };

  const handleGenerateExam = async () => {
    const finalTitle = examTitle.trim() || `${course}: ${presetTopics[course]?.[0] || 'Libro Oficial'}`;
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: finalTitle,
          course: course,
          level: level,
          language: 'es',
          questionCount: questionCount
        })
      });

      if (!res.ok) {
        throw new Error('Error al contactar con el servicio de generación de exámenes');
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

      if (parsed.blocks && Array.isArray(parsed.blocks)) {
        const blocks: Block[] = parsed.blocks.map((b: any, idx: number) => ({
          id: `block-${Date.now()}-${idx}`,
          type: b.type,
          content: b.content,
          metadata: b.metadata
        }));

        const newDoc: DocumentInfo = {
          id: `exam-${Date.now()}`,
          title: finalTitle,
          subject: (course === 'Física' ? 'Physics' : course === 'Química' ? 'Chemistry' : 'Math') as any,
          blocks: blocks,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        onExamGenerated(newDoc);
      } else {
        throw new Error('La respuesta de la IA no contiene bloques de examen válidos');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocurrió un error al generar el examen. Intenta nuevamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-68px)] overflow-y-auto bg-slate-50 text-slate-800 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto w-full space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-600 flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 tracking-wide">
                Generador de Exámenes y Fichas A4
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Crea exámenes oficiales en formato de 2 columnas sin cuadros, con línea divisoria continua y marca de agua oficial John Nash.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-sky-700 font-semibold">
            <Printer className="w-3.5 h-3.5" />
            <span>Listo para PDF A4 y Word sin cuadros</span>
          </div>
        </div>

        {/* Shortcut Banner to Book Creator */}
        {onNavigateToBookCreator && (
          <div className="p-4 bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-sky-950 uppercase tracking-wide">
                  ¿Deseas elaborar un libro completo desde un sílabo con índice y carátula?
                </div>
                <div className="text-[11px] text-slate-600">
                  Usa el nuevo Creador de Libros: pega tus temas o un sílabo y la IA generará el libro con índice, páginas y claves en formato A4 exacto.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onNavigateToBookCreator}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all shrink-0 hover:scale-105"
            >
              Ir a Crear Libro (Sílabo IA) →
            </button>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white font-bold text-sm">×</button>
          </div>
        )}

        {/* Form Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left / Main Configuration Column (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Tipo de Examen */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                1. Formato del Documento
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'libro', label: 'Libro Nash', desc: 'Teoría + 12 ejercicios a 2 col' },
                  { id: 'simulacro', label: 'Simulacro UNI/SM', desc: '15-20 problemas con claves' },
                  { id: 'practica', label: 'Práctica Calificada', desc: 'Evaluación rápida de clase' },
                  { id: 'mensual', label: 'Examen Mensual', desc: 'Balotario de evaluación' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setExamType(item.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      examType === item.id 
                        ? 'bg-sky-50 border-sky-500 text-white shadow-sm' 
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs">{item.label}</div>
                    <div className="text-[10px] text-slate-500 mt-1">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Asignatura y Tema */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                2. Asignatura y Contenido Académico
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Curso</label>
                  <select 
                    value={course} 
                    onChange={(e) => setCourse(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-sky-500"
                  >
                    {Object.keys(presetTopics).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="Química">Química</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Nivel Académico</label>
                  <select 
                    value={level} 
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-sky-500"
                  >
                    <option value="Pre-universitario">Pre-universitario (cepreUNAS • UNMSM • UNI • UNHEVAL)</option>
                    <option value="Secundaria (3° a 5°)">Secundaria (3° a 5° de Secundaria)</option>
                    <option value="Secundaria (1° y 2°)">Secundaria (1° y 2° de Secundaria)</option>
                    <option value="Primaria (5° y 6°)">Primaria (5° y 6° de Primaria)</option>
                    <option value="Primaria (3° y 4°)">Primaria (3° y 4° de Primaria)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Título o Tema Específico
                </label>
                <input 
                  type="text" 
                  value={examTitle} 
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder={`Ej: ${presetTopics[course]?.[0] || 'Tema del examen'}`}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Suggestions chips */}
              {presetTopics[course] && (
                <div>
                  <div className="text-[11px] text-slate-500 mb-1.5 font-medium">Temas sugeridos para {course}:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {presetTopics[course].map((t) => (
                      <button
                        key={t}
                        onClick={() => setExamTitle(t)}
                        className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-[11px] rounded-lg transition-colors"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Estructura y Cantidad */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  3. Cantidad y Niveles de Preguntas
                </label>
                <span className="text-[10.5px] text-sky-700 font-semibold">
                  4 Niveles: Básico, Intermedio, Avanzado y Domiciliaria
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {[8, 10, 12, 14, 16, 20].map((num) => (
                  <button
                    key={num}
                    onClick={() => setQuestionCount(num)}
                    className={`py-2 px-2.5 rounded-xl border text-center font-bold text-xs transition-all flex flex-col items-center justify-center ${
                      questionCount === num
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-800 shadow-sm ring-1 ring-indigo-400'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <span>{num} preguntas</span>
                    {num === 16 && <span className="text-[9.5px] font-normal text-indigo-600">4 por nivel</span>}
                    {num === 20 && <span className="text-[9.5px] font-normal text-indigo-600">5 por nivel</span>}
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                  <input 
                    type="checkbox" 
                    checked={includeTheory} 
                    onChange={(e) => setIncludeTheory(e.target.checked)}
                    className="rounded accent-sky-500" 
                  />
                  <span>Incluir síntesis teórica previa (1 página)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                  <input 
                    type="checkbox" 
                    checked={includeKeySheet} 
                    onChange={(e) => setIncludeKeySheet(e.target.checked)}
                    className="rounded accent-sky-500" 
                  />
                  <span>Incluir claves de respuestas (A, B, C, D, E)</span>
                </label>
              </div>
            </div>

            {/* Generate Action Button */}
            <button
              id="btn-generate-official-exam"
              onClick={handleGenerateExam}
              disabled={isGenerating}
              className="w-full py-3.5 bg-gradient-to-r from-sky-600 via-indigo-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white font-bold rounded-2xl shadow-lg transition-all hover:scale-101 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generando examen oficial sin cuadros con Gemini 3.7 Flash...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  <span>Generar Examen Oficial (Abrir en 2 Columnas)</span>
                </>
              )}
            </button>

          </div>

          {/* Right Column: Previews & Saved Exams (1 col) */}
          <div className="space-y-6">

            {/* Nash Official Format Specs Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                <span>Normas Oficiales de Impresión</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Sin cuadros:</strong> Preguntas numeradas 1., 2., 3. limpias sobre el papel.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>2 Columnas continuas:</strong> Separadas por línea divisoria central nítida.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Marca de agua oficial:</strong> Escudo tenue John Nash en el fondo.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Descargas directas:</strong> PDF optimizado para fotocopias y Word (.docx).</span>
                </li>
              </ul>
            </div>

            {/* Recent Saved Exams */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>Exámenes Guardados</span>
                <span className="text-[10px] text-sky-400 font-normal">{savedDocuments.length} archivos</span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {savedDocuments.slice(0, 5).map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => onOpenExistingExam(doc.id)}
                    className="p-3 bg-slate-50 hover:bg-slate-850 border border-slate-200/80 rounded-xl cursor-pointer transition-colors group flex items-center justify-between gap-2"
                  >
                    <div className="overflow-hidden">
                      <div className="font-bold text-xs text-white truncate group-hover:text-sky-700 transition-colors">
                        {doc.title}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {doc.subject} • {doc.blocks.filter(b => b.type === 'exercise').length} ejercicios
                      </div>
                    </div>
                    <FileCheck className="w-4 h-4 text-slate-500 group-hover:text-sky-400 shrink-0" />
                  </div>
                ))}

                {savedDocuments.length === 0 && (
                  <div className="text-center py-6 text-xs text-slate-500">
                    Aún no has generado exámenes.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
