import React, { useState } from 'react';
import { 
  GraduationCap, 
  Search, 
  Filter, 
  CheckCircle2, 
  Plus, 
  BookOpen, 
  Copy, 
  Check, 
  HelpCircle,
  FolderOpen
} from 'lucide-react';
import { ExtractedExercise } from '../types';
import { TextWithMath } from './TextWithMath';

interface PracticeBankProps {
  onAddSelectedToExam: (exercises: any[]) => void;
}

export const PracticeBank: React.FC<PracticeBankProps> = ({ onAddSelectedToExam }) => {
  const [selectedSubject, setSelectedSubject] = useState('Álgebra');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('Todos');
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const sampleBank: Record<string, any[]> = {
    'Álgebra': [
      {
        id: 'alg-1',
        topic: 'Teoría de Exponentes',
        difficulty: 'Básico',
        question: '(cepreUNAS 2024) Reducir la siguiente expresión con potencias de bases iguales: $E = \\frac{2^{n+4} - 2(2^n)}{2(2^{n+3})}$.',
        options: ['A) 7/8', 'B) 3/4', 'C) 1/2', 'D) 1/8', 'E) 5/8'],
        correctAnswer: 0,
        explanation: 'Factorizando $2^n$: $E = \\frac{2^n(2^4 - 2)}{2 \\cdot 2^n \\cdot 2^3} = \\frac{16 - 2}{2 \\cdot 8} = \\frac{14}{16} = \\frac{7}{8}$.'
      },
      {
        id: 'alg-2',
        topic: 'Polinomios',
        difficulty: 'Intermedio',
        question: '(UNMSM 2024-I) Si el polinomio $P(x) = (a-2)x^3 + (b+3)x^2 + (c-5)x + d$ es idénticamente nulo, determine el valor de $E = a + b + c$.',
        options: ['A) 2', 'B) 4', 'C) 6', 'D) 8', 'E) 10'],
        correctAnswer: 1, // 2 + (-3) + 5 = 4 -> B
        explanation: 'Por ser idénticamente nulo, todos sus coeficientes son cero: $a-2=0 \\implies a=2$; $b+3=0 \\implies b=-3$; $c-5=0 \\implies c=5$. Por tanto, $E = 2 + (-3) + 5 = 4$.'
      },
      {
        id: 'alg-3',
        topic: 'Productos Notables',
        difficulty: 'Avanzado',
        question: '(UNI 2023-II) Si $x + \\frac{1}{x} = 3$, halle el valor numérico de la expresión $x^3 + \\frac{1}{x^3}$.',
        options: ['A) 18', 'B) 27', 'C) 21', 'D) 15', 'E) 24'],
        correctAnswer: 0, // 3^3 - 3(3) = 27 - 9 = 18 -> A
        explanation: 'Elevando al cubo: $(x + 1/x)^3 = x^3 + 1/x^3 + 3(x)(1/x)(x + 1/x)$. Reemplazando: $3^3 = x^3 + 1/x^3 + 3(1)(3) \\implies 27 = x^3 + 1/x^3 + 9 \\implies 18$.'
      },
      {
        id: 'alg-4',
        topic: 'Ecuaciones Cuadráticas',
        difficulty: 'Tarea Domiciliaria',
        question: '(UNHEVAL 2024) Determine el discriminante $\\Delta$ de la ecuación cuadrática $2x^2 - 5x + 1 = 0$ y determine la naturaleza de sus raíces.',
        options: ['A) $\\Delta = 17$, reales y diferentes', 'B) $\\Delta = 13$, reales e iguales', 'C) $\\Delta = -17$, complejas', 'D) $\\Delta = 25$, reales', 'E) $\\Delta = 9$, racionales'],
        correctAnswer: 0,
        explanation: '$\\Delta = b^2 - 4ac = (-5)^2 - 4(2)(1) = 25 - 8 = 17 > 0$. Como el discriminante es positivo, tiene 2 raíces reales y diferentes.'
      }
    ],
    'Aritmética': [
      {
        id: 'ari-1',
        topic: 'Razones y Proporciones',
        difficulty: 'Básico',
        question: '(cepreUNAS 2024) La razón geométrica de dos números es $3/5$. Si la suma de ambos números es $160$, halle el número menor.',
        options: ['A) 40', 'B) 50', 'C) 60', 'D) 70', 'E) 80'],
        correctAnswer: 2, // 3k + 5k = 8k = 160 -> k=20 -> menor = 3(20) = 60
        explanation: 'Sean los números $3k$ y $5k$. Luego: $3k + 5k = 160 \\implies 8k = 160 \\implies k = 20$. El menor es $3(20) = 60$.'
      },
      {
        id: 'ari-2',
        topic: 'Tanto por Ciento',
        difficulty: 'Intermedio',
        question: '(UNMSM 2023 DECO) ¿A qué aumento único equivalen dos aumentos sucesivos del $20\\%$ y $30\\%$ aplicados al precio de lista de un compendio preuniversitario?',
        options: ['A) $50\\%$', 'B) $56\\%$', 'C) $52\\%$', 'D) $60\\%$', 'E) $48\\%$'],
        correctAnswer: 1, // 20 + 30 + (20*30)/100 = 56%
        explanation: '$A_u = \\left(A_1 + A_2 + \\frac{A_1 \\times A_2}{100}\\right)\\% = \\left(20 + 30 + \\frac{600}{100}\\right)\\% = 56\\%$.'
      },
      {
        id: 'ari-3',
        topic: 'Máximo Común Divisor',
        difficulty: 'Avanzado',
        question: '(UNI 2024-I) Si el $\\text{MCD}(A, B) = 36$ y la suma $A + B = 288$, determine la cantidad de pares ordenados $(A, B)$ que cumplen dicha condición.',
        options: ['A) 2', 'B) 4', 'C) 3', 'D) 1', 'E) 5'],
        correctAnswer: 0,
        explanation: '$A = 36p$, $B = 36q$ con $\\text{MCD}(p, q) = 1$. $36(p + q) = 288 \\implies p + q = 8$. Los pares PESI son $(1, 7)$ y $(3, 5)$. Por tanto, son 2 pares.'
      },
      {
        id: 'ari-4',
        topic: 'Promedios',
        difficulty: 'Tarea Domiciliaria',
        question: '(UNHEVAL 2023) El promedio aritmético de 5 números es 18. Si se retira un número cuyo valor es 10, ¿cuál es el nuevo promedio de los números restantes?',
        options: ['A) 20', 'B) 19', 'C) 21', 'D) 18.5', 'E) 22'],
        correctAnswer: 0,
        explanation: 'Suma inicial = $5 \\times 18 = 90$. Nueva suma = $90 - 10 = 80$. Nuevo promedio = $80 / 4 = 20$.'
      }
    ],
    'Geometría': [
      {
        id: 'geo-1',
        topic: 'Triángulos',
        difficulty: 'Básico',
        question: '(cepreUNAS 2024) En un triángulo rectángulo, los catetos miden $6\\text{ cm}$ y $8\\text{ cm}$. Calcule la longitud de la altura relativa a la hipotenusa.',
        options: ['A) $4.2\\text{ cm}$', 'B) $4.8\\text{ cm}$', 'C) $5.0\\text{ cm}$', 'D) $3.6\\text{ cm}$', 'E) $5.2\\text{ cm}$'],
        correctAnswer: 1, // hip = 10, h = (6*8)/10 = 4.8
        explanation: 'Por teorema de Pitágoras, la hipotenusa mide $c = \\sqrt{6^2 + 8^2} = 10\\text{ cm}$. Por relaciones métricas: $a \\cdot b = c \\cdot h \\implies 6 \\cdot 8 = 10 \\cdot h \\implies h = 4.8\\text{ cm}$.'
      },
      {
        id: 'geo-2',
        topic: 'Semejanza de Triángulos',
        difficulty: 'Intermedio',
        question: '(UNMSM 2024-I) En un triángulo $ABC$, se traza la ceviana interior $BD$. Si $AB = 8$, $AD = 4$ y $\\angle ABD = \\angle BCD$, calcule $AC$.',
        options: ['A) 16', 'B) 12', 'C) 14', 'D) 18', 'E) 20'],
        correctAnswer: 0,
        explanation: 'Por semejanza de triángulos $\\triangle ABD \\sim \\triangle ACB$: $\\frac{AB}{AC} = \\frac{AD}{AB} \\implies AB^2 = AD \\cdot AC \\implies 8^2 = 4 \\cdot AC \\implies 64 = 4 AC \\implies AC = 16$.'
      },
      {
        id: 'geo-3',
        topic: 'Relaciones Métricas',
        difficulty: 'Avanzado',
        question: '(UNI 2023-II) En una circunferencia de radio $R = 5$, dos cuerdas se intersecan en el punto interior $P$. Si los segmentos de una cuerda miden $2$ y $8$, y la distancia de $P$ al centro es $d$, calcule $d$.',
        options: ['A) 3', 'B) \\sqrt{7}', 'C) 2\\sqrt{2}', 'D) 4', 'E) \\sqrt{10}'],
        correctAnswer: 0,
        explanation: 'Por teorema de las cuerdas y potencia de un punto interior: $PA \\cdot PB = R^2 - d^2 \\implies 2 \\times 8 = 5^2 - d^2 \\implies 16 = 25 - d^2 \\implies d^2 = 9 \\implies d = 3$.'
      },
      {
        id: 'geo-4',
        topic: 'Áreas Cuadrangulares',
        difficulty: 'Tarea Domiciliaria',
        question: '(UNHEVAL 2024) En un trapecio de bases $8$ y $12$, la altura mide $6$. Halle el área de la región trapecial.',
        options: ['A) 60', 'B) 50', 'C) 72', 'D) 48', 'E) 64'],
        correctAnswer: 0,
        explanation: 'Área = $\\frac{B + b}{2} \\cdot h = \\frac{12 + 8}{2} \\cdot 6 = 10 \\cdot 6 = 60$.'
      }
    ],
    'Física': [
      {
        id: 'fis-1',
        topic: 'Cinemática MRUV',
        difficulty: 'Básico',
        question: '(cepreUNAS 2024) Un móvil que parte con una rapidez de $10\\text{ m/s}$ acelera a razón constante de $2\\text{ m/s}^2$ durante $6\\text{ s}$. Determine la distancia total recorrida.',
        options: ['A) $84\\text{ m}$', 'B) $96\\text{ m}$', 'C) $72\\text{ m}$', 'D) $108\\text{ m}$', 'E) $60\\text{ m}$'],
        correctAnswer: 1, // d = 10*6 + 0.5*2*36 = 60 + 36 = 96
        explanation: '$d = v_0 t + \\frac{1}{2} a t^2 = 10(6) + \\frac{1}{2}(2)(6^2) = 60 + 36 = 96\\text{ m}$.'
      },
      {
        id: 'fis-2',
        topic: 'Estática',
        difficulty: 'Intermedio',
        question: '(UNMSM 2024-I) Un bloque de $60\\text{ N}$ se encuentra en reposo sobre un plano inclinado $\\theta = 37^\\circ$. Determine la fuerza de rozamiento estático que actúa sobre el bloque $(\\sin 37^\\circ = 3/5)$.',
        options: ['A) $36\\text{ N}$', 'B) $48\\text{ N}$', 'C) $24\\text{ N}$', 'D) $60\\text{ N}$', 'E) $30\\text{ N}$'],
        correctAnswer: 0,
        explanation: 'En equilibrio paralelo al plano: $f_s = W \\sin\\theta = 60 \\left(\\frac{3}{5}\\right) = 36\\text{ N}$.'
      },
      {
        id: 'fis-3',
        topic: 'Dinámica Lineal',
        difficulty: 'Avanzado',
        question: '(UNI 2023-II) Dos bloques de masas $m_1 = 3\\text{ kg}$ y $m_2 = 2\\text{ kg}$ unidos por una cuerda inextensible son jalados con una fuerza $F = 50\\text{ N}$ sobre una superficie lisa. Calcule la tensión de la cuerda.',
        options: ['A) $20\\text{ N}$', 'B) $30\\text{ N}$', 'C) $25\\text{ N}$', 'D) $15\\text{ N}$', 'E) $10\\text{ N}$'],
        correctAnswer: 0,
        explanation: 'Aceleración del sistema: $a = \\frac{F}{m_1 + m_2} = \\frac{50}{5} = 10\\text{ m/s}^2$. Para el bloque posterior $m_2$: $T = m_2 a = 2 \\times 10 = 20\\text{ N}$.'
      },
      {
        id: 'fis-4',
        topic: 'Energía Mecánica',
        difficulty: 'Tarea Domiciliaria',
        question: '(UNHEVAL 2024) Se suelta una esfera de masa $2\\text{ kg}$ desde una altura de $20\\text{ m}$. Despreciando la resistencia del aire, determine su rapidez al llegar al suelo $(g = 10\\text{ m/s}^2)$.',
        options: ['A) $20\\text{ m/s}$', 'B) $15\\text{ m/s}$', 'C) $25\\text{ m/s}$', 'D) $10\\text{ m/s}$', 'E) $30\\text{ m/s}$'],
        correctAnswer: 0,
        explanation: 'Por conservación de energía: $mgh = \\frac{1}{2}mv^2 \\implies v = \\sqrt{2gh} = \\sqrt{2(10)(20)} = \\sqrt{400} = 20\\text{ m/s}$.'
      }
    ]
  };

  const currentQuestions = sampleBank[selectedSubject] || [];
  const filtered = currentQuestions.filter(q => {
    const matchesSearch = q.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          q.topic.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDiff = selectedDifficulty === 'Todos' || q.difficulty === selectedDifficulty;
    return matchesSearch && matchesDiff;
  });

  const toggleSelectExercise = (id: string) => {
    setSelectedExercises(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleAddSelected = () => {
    const toAdd = currentQuestions.filter(q => selectedExercises.includes(q.id));
    if (toAdd.length > 0) {
      onAddSelectedToExam(toAdd);
      setSelectedExercises([]);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-68px)] overflow-y-auto bg-slate-50 text-slate-800 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                <GraduationCap className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-wide">
                Banco de Ejercicios y Práctica
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Banco clasificado por cursos con enunciados y resolución paso a paso.
            </p>
          </div>

          {selectedExercises.length > 0 && (
            <button
              onClick={handleAddSelected}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-all animate-in fade-in"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir {selectedExercises.length} seleccionados a mi Examen</span>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200">
          
          {/* Subject Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {Object.keys(sampleBank).map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedSubject === sub
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-200 hover:text-slate-800'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por tema o palabras clave..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <select 
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-sky-500 font-medium"
          >
            <option value="Todos">Todos los niveles preuniversitarios</option>
            <option value="Básico">🟢 Nivel Básico (cepreUNAS / UNHEVAL)</option>
            <option value="Intermedio">🟡 Nivel Intermedio (UNMSM / cepreUNAS)</option>
            <option value="Avanzado">🟠 Nivel Avanzado (UNI / UNMSM)</option>
            <option value="Tarea Domiciliaria">🟣 Tarea Domiciliaria (Casa)</option>
          </select>
        </div>

        {/* Questions list */}
        <div className="space-y-4">
          {filtered.map((q, idx) => {
            const isSelected = selectedExercises.includes(q.id);
            return (
              <div 
                key={q.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isSelected 
                    ? 'bg-sky-950/40 border-sky-600 shadow-md' 
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectExercise(q.id)}
                      className="w-4 h-4 rounded accent-sky-500 cursor-pointer"
                    />
                    <span className="font-bold text-amber-400 text-xs font-mono">
                      #{idx + 1} • {q.topic}
                    </span>
                    <span className="text-[10px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">
                      {q.difficulty}
                    </span>
                  </div>

                  <span className="text-[11px] font-bold text-emerald-400">
                    Clave: {String.fromCharCode(65 + q.correctAnswer)}
                  </span>
                </div>

                <div className="text-slate-800 text-sm mb-4 leading-relaxed">
                  <TextWithMath text={q.question} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs mb-3">
                  {q.options.map((opt: string, optIdx: number) => (
                    <div 
                      key={optIdx}
                      className={`p-2 rounded-lg border text-center ${
                        optIdx === q.correctAnswer 
                          ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300 font-bold' 
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <TextWithMath text={opt} />
                    </div>
                  ))}
                </div>

                {q.explanation && (
                  <details className="mt-2 text-xs bg-slate-50/60 border border-slate-200 rounded-xl p-3 text-slate-500">
                    <summary className="cursor-pointer font-bold text-slate-600 hover:text-sky-300">
                      Ver Solución Paso a Paso
                    </summary>
                    <div className="mt-2 pt-2 border-t border-slate-200 text-slate-600 leading-relaxed">
                      <TextWithMath text={q.explanation} />
                    </div>
                  </details>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
              No se encontraron ejercicios con los filtros seleccionados.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
