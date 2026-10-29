import { Template } from '../types';

export const TEMPLATES: Template[] = [
  {
    id: 't-ficha-1',
    title: 'Ficha Pre-Universitaria: Academia John Nash',
    subject: 'Math',
    description: 'Plantilla oficial de Academia John Nash (logo, teoría concisa, "Sabías que" y ejercicios en 2 columnas).',
    previewColor: 'bg-blue-600',
    defaultBlocks: [
      { 
        id: 'f1', 
        type: 'text', 
        content: '<div class="ficha-header print-full-width">\n  <div class="ficha-header-top">\n    <img src="/logo_nash.png" alt="Logo Academia John Nash" class="nash-header-logo" />\n    <div class="nash-header-info">\n      <div class="nash-academy-name">Academia John Nash</div>\n      <div class="nash-slogan">Creemos en tu esfuerzo</div>\n    </div>\n  </div>\n  <div class="text-xs font-bold text-slate-500 tracking-widest mt-1 uppercase">Aritmética &nbsp;|&nbsp; Cuarto de Secundaria - Preuniversitario</div>\n  <div class="ficha-subtitle">Numeración I</div>\n</div>' 
      },
      { 
        id: 'f2', 
        type: 'text', 
        content: '<span class="ficha-concept">Numeración</span>\nEs la parte de la aritmética que estudia el número en su formación, representación, propiedades y aplicaciones que con ellas se puede efectuar.' 
      },
      { 
        id: 'f3', 
        type: 'text', 
        content: '<div class="sabias-que">\n  <div class="sabias-que-icon">👨‍🏫</div>\n  <div>\n    <div class="sabias-que-title">Sabías que...</div>\n    <div class="text-sm">El matemático griego Eratóstenes ideó un método con el cual pudo medir la longitud de la circunferencia de la tierra 276 a.C. / 194 a.C.</div>\n  </div>\n</div>' 
      },
      { 
        id: 'f4', 
        type: 'text', 
        content: '<span class="ficha-concept">Número</span>\nEs un ente abstracto, carente de definición, sin embargo nos da la idea de cantidad.' 
      },
      { 
        id: 'f5', 
        type: 'text', 
        content: '<span class="ficha-concept">Sistema Decimal</span>\nEs empleado actualmente, este sistema fue inventado por los hindúes y difundido después por los árabes. Se utiliza los dígitos: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9.' 
      },
      { 
        id: 'f6', 
        type: 'text', 
        content: '<div class="sabias-que">\n  <div class="sabias-que-icon">🏛️</div>\n  <div>\n    <div class="sabias-que-title">Origen del cero</div>\n    <div class="text-sm">Los Babilonios en su última etapa usaron un símbolo primitivo y también un primitivo sentido del valor de posición.</div>\n  </div>\n</div>' 
      },
      { 
        id: 'f7', 
        type: 'text', 
        content: '<div class="text-center font-black text-2xl mt-8 mb-6 uppercase" style="font-family: \'Comic Sans MS\', cursive;">Ejercicios de Aplicación</div>' 
      },
      { 
        id: 'f8', 
        type: 'exercise', 
        content: 'Si a un número de 3 cifras se le altera el orden de las unidades con las decenas, este aumenta en 45 unidades. Si se invierten las decenas con las centenas, disminuirá en 270. Hallar en cuánto se altera si se invierte el orden de las centenas y unidades.',
        metadata: { options: ['Disminuye en 130', 'Disminuye en 198', 'Aumenta en 198', 'Disminuye en 99', 'Aumenta en 99'], correctAnswer: 4 }
      },
      { 
        id: 'f9', 
        type: 'exercise', 
        content: 'Si los numerales están correctamente escritos:\n$$ \\overline{2m3}_{(p)} ; \\overline{54n}_{(7)} ; \\overline{213}_{(m)} ; \\overline{3p1}_{(n)} $$\nHallar: m + n + p',
        metadata: { options: ['12', '13', '15', '16', '14'], correctAnswer: 4 }
      },
      { 
        id: 'f10', 
        type: 'exercise', 
        content: 'Simplifique la siguiente expresión trigonométrica:\n$$E = \\frac{\\sin x}{1 + \\cos x} + \\frac{1 + \\cos x}{\\sin x}$$',
        metadata: { 
          options: ['2\\csc x', '2\\sec x', '\\csc x', '2\\sin x', '\\tan x'], 
          correctAnswer: 0 
        }
      }
    ]
  },
  {
    id: 't-math-1',
    title: 'Algebra: Quadratic Equations',
    subject: 'Math',
    description: 'A complete lesson module for teaching the quadratic formula and graphing parabolas.',
    previewColor: 'bg-blue-500',
    defaultBlocks: [
      { id: 'b1', type: 'text', content: '# Quadratic Equations\n\nA quadratic equation is a second-order polynomial equation in a single variable x, with a non-zero coefficient for x^2.' },
      { id: 'b2', type: 'math', content: 'ax^2 + bx + c = 0' },
      { id: 'b3', type: 'text', content: 'Here is a graph of the basic quadratic function:' },
      { id: 'b4', type: 'graph', content: 'x^2', metadata: { domain: [-5, 5] } },
      { id: 'b5', type: 'text', content: '## Practice' },
      { id: 'b6', type: 'exercise', content: 'What are the roots of x^2 - 4 = 0?', metadata: { options: ['x = 2', 'x = 4', 'x = -2 and x = 2', 'x = 0'], correctAnswer: 2 } }
    ]
  },
  {
    id: 't-phy-1',
    title: 'Physics: Kinematics Labs',
    subject: 'Physics',
    description: 'Interactive workbook for 1D kinematics with distance-time graphs.',
    previewColor: 'bg-purple-500',
    defaultBlocks: [
      { id: 'p1', type: 'text', content: '# Introduction to Kinematics\n\nKinematics is the branch of mechanics concerned with the motion of objects without reference to the forces that cause the motion.' },
      { id: 'p2', type: 'math', content: 'v = u + at' },
      { id: 'p3', type: 'text', content: 'Distance over time with constant acceleration:' },
      { id: 'p4', type: 'graph', content: '0.5 * 9.8 * x^2', metadata: { domain: [0, 10], xLabel: 'Time (s)', yLabel: 'Distance (m)' } },
    ]
  },
  {
    id: 't-chem-1',
    title: 'Chemistry: Gas Laws',
    subject: 'Chemistry',
    description: "Lessons on Boyle's Law and Charles's Law with interactive relationships.",
    previewColor: 'bg-emerald-500',
    defaultBlocks: [
      { id: 'c1', type: 'text', content: '# Ideal Gas Law\n\nThe ideal gas law is the equation of state of a hypothetical ideal gas.' },
      { id: 'c2', type: 'math', content: 'PV = nRT' },
      { id: 'c3', type: 'text', content: "Boyle's Law describes the inversely proportional relationship between pressure and volume at a constant temperature:" },
      { id: 'c4', type: 'graph', content: '10 / x', metadata: { domain: [0.1, 10], xLabel: 'Volume (L)', yLabel: 'Pressure (atm)' } },
    ]
  },
  {
    id: 't-bio-1',
    title: 'Biology: Population Dynamics',
    subject: 'Biology',
    description: 'Study of population growth models, including exponential and logistic growth.',
    previewColor: 'bg-green-600',
    defaultBlocks: [
      { id: 'bio1', type: 'text', content: '# Exponential Population Growth\n\nWhen resources are unlimited, populations exhibit exponential growth, resulting in a J-shaped curve.' },
      { id: 'bio2', type: 'math', content: 'N(t) = N_0 e^{rt}' },
      { id: 'bio3', type: 'graph', content: '2^(x)', metadata: { domain: [0, 5], xLabel: 'Time', yLabel: 'Population Size' } },
    ]
  }
];
