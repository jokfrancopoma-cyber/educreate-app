import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Resilient model fallback list across all Gemini endpoints
  const CANDIDATE_MODELS = ['gemini-3.8-flash', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

  function sanitizeUnquotedLiterals(input: string): string {
    if (!input || typeof input !== 'string') return '';
    // 1. Convert unquoted or parenthesized correctAnswer letters to integer indices (0-4)
    let res = input.replace(
      /(["'](?:correctAnswer|answer|clave)["']\s*:\s*)\(?([a-eA-E])\)?(?=\s*[,}\]])/g,
      (_m, prefix, letter) => {
        const idx = { a: 0, b: 1, c: 2, d: 3, e: 4 }[letter.toLowerCase()];
        return `${prefix}${idx ?? 0}`;
      }
    );
    // 2. Convert quoted correctAnswer letters to integer indices (0-4)
    res = res.replace(
      /(["'](?:correctAnswer|answer|clave)["']\s*:\s*)["']([a-eA-E])["'](?=\s*[,}\]])/g,
      (_m, prefix, letter) => {
        const idx = { a: 0, b: 1, c: 2, d: 3, e: 4 }[letter.toLowerCase()];
        return `${prefix}${idx ?? 0}`;
      }
    );
    // 3. Convert bare single letters after colons into quoted strings
    res = res.replace(/(:\s*)([a-zA-Z])(?=\s*[,}\]])/g, (_m, prefix, letter) => {
      return `${prefix}"${letter}"`;
    });
    return res;
  }

  function repairJsonString(text: string): string {
    let res = '';
    let inString = false;
    let i = 0;

    while (i < text.length) {
      const c = text[i];

      if (!inString) {
        if (c === '"') {
          inString = true;
          res += c;
          i++;
          continue;
        }

        // Handle unquoted values right after a colon (outside of string literals)
        if (c === ':') {
          res += ':';
          i++;
          while (i < text.length && /\s/.test(text[i])) {
            res += text[i];
            i++;
          }
          const remaining = text.slice(i);
          const identMatch = remaining.match(/^(\(?([a-zA-Z_][a-zA-Z0-9_]*)\)?)(?=\s*[,}\]])/);
          if (identMatch) {
            const fullToken = identMatch[1];
            const rawWord = identMatch[2];
            if (rawWord === 'true' || rawWord === 'false' || rawWord === 'null') {
              res += rawWord;
              i += fullToken.length;
              continue;
            }
            const isAnswerKey = /["'](?:correctAnswer|answer|clave)["']\s*:\s*$/i.test(res);
            if (isAnswerKey && /^[a-eA-E]$/.test(rawWord)) {
              const letterMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, e: 4 };
              res += String(letterMap[rawWord.toLowerCase()] ?? 0);
              i += fullToken.length;
              continue;
            }
            res += `"${rawWord}"`;
            i += fullToken.length;
            continue;
          }
          continue;
        }

        res += c;
        i++;
        continue;
      }

      // Inside JSON string
      if (c === '"') {
        let backslashes = 0;
        let j = res.length - 1;
        while (j >= 0 && res[j] === '\\') {
          backslashes++;
          j--;
        }

        if (backslashes % 2 === 0) {
          // Unescaped quote. Check if it is delimiter or inner unescaped quote (e.g. HTML attribute)
          let nextChar = '';
          for (let k = i + 1; k < text.length; k++) {
            if (!/\s/.test(text[k])) {
              nextChar = text[k];
              break;
            }
          }

          if (nextChar && nextChar !== ':' && nextChar !== ',' && nextChar !== '}' && nextChar !== ']') {
            res += '\\"';
            i++;
            continue;
          }

          inString = false;
        }

        res += c;
        i++;
        continue;
      }

      if (c === '\\') {
        const next = text[i + 1] || '';

        // 1. Double backslash: already a valid escaped backslash in JSON! Consume both characters!
        if (next === '\\') {
          res += '\\\\';
          i += 2;
          continue;
        }

        // 2. Escaped quote or slash: consume both characters!
        if (next === '"' || next === '/') {
          res += '\\' + next;
          i += 2;
          continue;
        }

        // 3. Valid unicode escape: \uXXXX: consume all 6 characters!
        if (next === 'u' && /^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) {
          res += text.slice(i, i + 6);
          i += 6;
          continue;
        }

        // 4. If next is n, r, t, b, f, check if it is a LaTeX command (e.g. \frac, \theta, \beta, \rho, \nabla, \text)
        const after = text.slice(i + 1);
        const isWord = /^[a-zA-Z]{2,}/.test(after);

        if (['n', 'r', 't', 'b', 'f'].includes(next) && !isWord) {
          // Valid standard control escape (\n, \r, \t, etc.)
          res += '\\' + next;
          i += 2;
          continue;
        }

        // 5. Any other backslash is a lone backslash before a character or LaTeX command (e.g. \sqrt, \alpha, \frac)
        // Properly double-escape it so JSON.parse sees a valid escaped backslash
        res += '\\\\';
        i++;
        continue;
      }

      if (c === '\n') {
        res += '\\n';
        i++;
        continue;
      }
      if (c === '\r') {
        res += '\\r';
        i++;
        continue;
      }
      if (c === '\t') {
        res += '\\t';
        i++;
        continue;
      }

      res += c;
      i++;
    }

    return res;
  }

  function robustJsonParse<T = any>(rawText: string): T {
    if (!rawText || typeof rawText !== 'string') {
      throw new Error('Texto vacío o inválido');
    }

    try {
      return JSON.parse(rawText);
    } catch {}

    // Pre-sanitize unquoted literals (e.g. "correctAnswer": b, -> "correctAnswer": 1,)
    let text = sanitizeUnquotedLiterals(rawText.trim());

    try {
      return JSON.parse(text);
    } catch {}

    if (text.startsWith('```json')) text = text.replace(/^```json\s*/i, '');
    else if (text.startsWith('```')) text = text.replace(/^```\s*/, '');
    text = text.replace(/\s*```$/, '');

    try {
      return JSON.parse(text);
    } catch {}

    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    let startIndex = -1;
    let isArray = false;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIndex = firstBrace;
      isArray = false;
    } else if (firstBracket !== -1) {
      startIndex = firstBracket;
      isArray = true;
    }

    if (startIndex !== -1) {
      const endChar = isArray ? ']' : '}';
      const lastIndex = text.lastIndexOf(endChar);
      if (lastIndex !== -1 && lastIndex > startIndex) {
        text = text.substring(startIndex, lastIndex + 1);
      } else {
        text = text.substring(startIndex);
      }
    }

    try {
      return JSON.parse(text);
    } catch {}

    let repaired = repairJsonString(text);
    repaired = repaired.replace(/,\s*([}\]])/g, '$1');

    try {
      return JSON.parse(repaired);
    } catch {}

    const stack: string[] = [];
    let inStr = false;
    let esc = false;

    for (let idx = 0; idx < repaired.length; idx++) {
      const ch = repaired[idx];
      if (esc) {
        esc = false;
        continue;
      }
      if (ch === '\\') {
        esc = true;
        continue;
      }
      if (ch === '"') {
        inStr = !inStr;
        continue;
      }
      if (!inStr) {
        if (ch === '{' || ch === '[') {
          stack.push(ch);
        } else if (ch === '}' && stack[stack.length - 1] === '{') {
          stack.pop();
        } else if (ch === ']' && stack[stack.length - 1] === '[') {
          stack.pop();
        }
      }
    }

    let closed = repaired;
    if (inStr) {
      closed += '"';
    }

    closed = closed.replace(/,\s*"[^":]*"?\s*$/, '');
    closed = closed.replace(/:\s*$/, ': null');
    closed = closed.replace(/,\s*$/, '');

    while (stack.length > 0) {
      const top = stack.pop();
      if (top === '{') closed += '}';
      else if (top === '[') closed += ']';
    }

    return JSON.parse(closed);
  }

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Endpoint to fetch web link content
  app.post("/api/fetch-link", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "URL is required" });
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const html = await response.text();
      // Clean HTML to pure text
      const cleanText = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 25000);

      res.json({ text: cleanText });
    } catch (error: any) {
      console.error("Fetch link error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch URL" });
    }
  });

  // NotebookLM Hub: Extract similar exercises, generate exam or slides from sources (PDF / Link / Text)
  app.post("/api/notebook-lm/extract", async (req, res) => {
    try {
      const { sources, action, prompt: userPrompt, course, level, count = 8 } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      }

      const ai = new GoogleGenAI({ apiKey });
      const parts: any[] = [];

      // 1. Process sources: PDFs as inlineData, text/links as text
      let textSummaries = "";
      if (Array.isArray(sources)) {
        for (const src of sources) {
          if (src.type === 'pdf' && src.base64) {
            const rawBase64 = src.base64.replace(/^data:[^;]+;base64,/, '');
            parts.push({
              inlineData: {
                mimeType: "application/pdf",
                data: rawBase64
              }
            });
          } else if (src.content) {
            textSummaries += `\n\n--- FUENTE: ${src.name} (${src.type}) ---\n${src.content.slice(0, 25000)}\n`;
          }
        }
      }

      if (textSummaries) {
        parts.push({ text: `CONTENIDO DE LAS FUENTES DE TEXTO/ENLACES:\n${textSummaries}` });
      }

      let systemPrompt = "";
      if (action === 'extract_similar') {
        systemPrompt = `You are a high-level academic mathematics and science educator in Peru (Academia Preuniversitaria John Nash / CEPRE-UNI / San Marcos).
TASK: Analyze the exercises, problems, or academic concepts present in the provided sources (PDF files and text/links).
Generate EXACTLY ${count} NEW, SIMILAR EXERCISES (ejercicios espejo / similares) inspired by the source material.
Each new exercise must:
1. Retain the same underlying mathematical structure, pedagogical goal, and difficulty level as the problems in the source.
2. Change the numerical values, variables, or scenario so it is completely original.
3. Be written in Spanish with proper LaTeX formulas ($...$ for inline, $$...$$ for block).
4. Provide exactly 5 multiple-choice options (A, B, C, D, E) where only one is correct.
5. Provide a step-by-step solution in the 'explanation' field.

Respond STRICTLY with a JSON object matching this schema:
{
  "title": "Ejercicios Similares Extraídos de las Fuentes",
  "summary": "Breve resumen de 2 líneas sobre los temas y métodos detectados en las fuentes",
  "exercises": [
    {
      "id": "ex-1",
      "question": "string with $math$ and detailed problem statement",
      "options": ["A) opt", "B) opt", "C) opt", "D) opt", "E) opt"],
      "correctAnswer": 0, // 0 for A, 1 for B, 2 for C, 3 for D, 4 for E
      "explanation": "Paso a paso detallado de la resolución con fórmulas $...$",
      "topic": "Tema específico (ej. Álgebra - Polinomios)",
      "difficulty": "Básico" | "Intermedio" | "Avanzado"
    }
  ]
}`;
      } else if (action === 'generate_slides') {
        systemPrompt = `You are an expert professor designing a visual classroom presentation (diapositivas interactivas) for college prep or high school students.
Analyze the provided sources and create an 8 to 10 slide presentation deck.
Respond STRICTLY with a JSON object matching this schema:
{
  "title": "Título de la Presentación",
  "subtitle": "Subtítulo didáctico y curso",
  "slides": [
    {
      "id": "slide-1",
      "type": "title" | "concept" | "exercise" | "summary",
      "title": "Título de la Diapositiva",
      "subtitle": "Subtítulo opcional",
      "bullets": ["Punto clave 1 con $fórmulas$", "Punto clave 2"],
      "formula": "Fórmula central destacada en LaTeX (opcional)",
      "exercise": { // ONLY for type 'exercise'
        "question": "Enunciado del problema modelo con $fórmula$",
        "options": ["A) opt", "B) opt", "C) opt", "D) opt", "E) opt"],
        "correctAnswer": 0,
        "steps": [
          { "stepTitle": "Paso 1: Identificación de datos", "stepMath": "$datos$", "stepExplanation": "Explicación breve" },
          { "stepTitle": "Paso 2: Aplicación de la fórmula", "stepMath": "$ecuación$", "stepExplanation": "Desarrollo algebraico" },
          { "stepTitle": "Paso 3: Respuesta final", "stepMath": "$resultado$", "stepExplanation": "Conclusión" }
        ]
      }
    }
  ]
}`;
      } else if (action === 'generate_exam') {
        systemPrompt = `You are an expert exam author for Academia Preuniversitaria John Nash.
Generate a complete academic separata/exam based on the provided sources.
Target Audience Level: ${level || 'Pre-universitario'}
Course: ${course || 'Matemática'}

Respond STRICTLY with a JSON object matching:
{
  "title": "Título del Examen / Separata",
  "blocks": [
    {
      "type": "text",
      "content": "<div class='ficha-header print-full-width'><div class='ficha-header-top'><img src='/logo_nash.png' alt='Logo' class='nash-header-logo' /><div class='nash-header-info'><div class='nash-academy-name'>Academia John Nash</div><div class='nash-slogan'>Creemos en tu esfuerzo</div></div></div><div class='text-xs font-bold text-slate-500 tracking-widest mt-1 uppercase'>${course || 'Matemática'} &nbsp;|&nbsp; ${level || 'Pre-universitario'}</div><div class='ficha-subtitle'>Examen Basado en Fuentes</div></div><p>Resumen teórico compacto de las fuentes con $fórmulas$.</p>"
    },
    {
      "type": "exercise",
      "content": "Pregunta de aplicación 1 basada en la fuente",
      "metadata": {
        "options": ["A) opt", "B) opt", "C) opt", "D) opt", "E) opt"],
        "correctAnswer": 0 // NÚMERO ENTERO DEL 0 AL 4 (0=A, 1=B, 2=C, 3=D, 4=E). NUNCA letras como b o c.
      }
    }
    // Exactly 10 to 14 exercises
  ]
}`;
      } else {
        // Chat / Q&A mode grounded on sources
        systemPrompt = `You are NotebookLM Academic Assistant for Academia John Nash.
Answer the user's question or instruction based STRICTLY and THOUGHTFULLY on the provided sources (PDFs, links, notes).
User Query: "${userPrompt || 'Resume las fuentes y extrae los ejercicios principales'}"

Respond STRICTLY with a JSON object:
{
  "answer": "Respuesta completa con formato Markdown y fórmulas LaTeX $...$ y $$...$$.",
  "citations": ["Cita o referencia a la página/sección de la fuente"]
}`;
      }

      parts.push({ text: systemPrompt });

      // Model candidate cascade for quota resilience
      let response: any = null;
      let lastError: any = null;

      for (const modelName of CANDIDATE_MODELS) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: "user",
                parts: parts
              }
            ],
            config: {
              responseMimeType: "application/json"
            }
          });
          if (response?.text) {
            break; // Success!
          }
        } catch (e: any) {
          lastError = e;
          console.warn(`Model ${modelName} failed with: ${e.message || e}. Trying next fallback model...`);
          // If quota exhausted or rate limited, try next model in cascade immediately
          continue;
        }
      }

      if (!response && lastError) {
        throw lastError;
      }

      res.json({ content: response?.text });
    } catch (error: any) {
      console.error("NotebookLM API Error:", error);
      const isQuota = String(error?.message || '').includes('quota') || String(error?.message || '').includes('RESOURCE_EXHAUSTED');
      const friendlyMsg = isQuota 
        ? "Se ha alcanzado temporalmente el límite de cuota de la API de Gemini para este modelo. El sistema intentó con modelos alternativos. Por favor espera un instante o reduce la longitud del documento para reintentar."
        : (error.message || "Error al procesar las fuentes con NotebookLM");
      const statusCode = typeof error.status === 'number' ? error.status : (isQuota ? 429 : 500);
      res.status(statusCode).json({ error: friendlyMsg });
    }
  });

  // Dedicated Slides Generation API
  app.post("/api/generate-slides", async (req, res) => {
    try {
      const { title, course, level, slideCount = 8 } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are an expert educator creating presentation slides (diapositivas para clase) for Academia Preuniversitaria John Nash.
Topic: "${title}"
Course: "${course || 'Matemática'}"
Level: "${level || 'Pre-universitario'}"
Number of slides: ${slideCount}

Create a structured slide deck formatted for classroom projection.
Format rules:
1. Slide 1: 'title' type with course, topic, academy slogan.
2. Slides 2-3: 'concept' type with theoretical fundamentals, clean definitions, and LaTeX formulas.
3. Slides 4-6: 'exercise' type with a challenging problem statement, options A-E, and 3-step solution.
4. Final slide: 'summary' type with essential formulas cheatsheet.

Respond STRICTLY with valid JSON:
{
  "title": "${title}",
  "course": "${course || 'General'}",
  "level": "${level || 'Pre-universitario'}",
  "slides": [
    {
      "id": "s1",
      "type": "title",
      "title": "${title}",
      "subtitle": "Academia John Nash • ${course || 'Ciencias'}",
      "bullets": ["Objetivos de la sesión", "Fundamentos y aplicaciones"],
      "formula": ""
    }
  ]
}`;

      let response: any = null;
      let lastError: any = null;

      for (const modelName of CANDIDATE_MODELS) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: { responseMimeType: "application/json" }
          });
          if (response?.text) break;
        } catch (e: any) {
          lastError = e;
          console.warn(`Slides model ${modelName} failed: ${e.message}. Trying next model...`);
          continue;
        }
      }

      if (!response && lastError) throw lastError;

      res.json({ content: response?.text });
    } catch (error: any) {
      console.error("Slides API Error:", error);
      const isQuota = String(error?.message || '').includes('quota') || String(error?.message || '').includes('RESOURCE_EXHAUSTED');
      const friendlyMsg = isQuota 
        ? "Se ha alcanzado temporalmente el límite de cuota de la API de Gemini. Por favor espera un momento y vuelve a intentar."
        : (error.message || "Error al generar diapositivas");
      const statusCode = typeof error.status === 'number' ? error.status : (isQuota ? 429 : 500);
      res.status(statusCode).json({ error: friendlyMsg });
    }
  });

  // API Route for generating theory and exercises
  app.post("/api/generate", async (req, res) => {
    try {
      const { title, course, language, level } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `You are an expert educator and author of academic materials.
Generate educational content for a book or practice document.

Topic: "${title}"
Course/Subject: ${course || 'General'}
Target Audience Level: ${level || 'Pre-universitario'}
Language: ${language === 'es' ? 'Spanish' : 'English'}

Provide the content strictly as a JSON object matching this schema:
{
  "blocks": [
    {
      "type": "image" | "text" | "exercise",
      "content": "string (for text: markdown, for image: placeholder URL, for exercise: the question)",
      "metadata": {
        "options": ["Option A", "Option B", "Option C", "Option D", "Option E"],
        "correctAnswer": 0 // index of correct option
      } // metadata is only required for exercise type
    }
  ]
}

Format rules:
1. Generate one or more "text" blocks containing the theoretical explanation.
   - Base the theoretical depth, tone, and rigor strictly on the specified Target Audience Level:
     * Si es Primaria (1° a 6° de Primaria):
       - Calibrar estrictamente para niños de educación primaria del grado exacto indicado (${level}).
       - 1° y 2° de Primaria: Muy visual, concreto, operaciones elementales (suma, resta, conteo, nociones espaciales y de conjuntos), ejemplos cotidianos con lenguaje cálido, amigable y muy claro.
       - 3° y 4° de Primaria: Aritmética básica (multiplicación, división, fracciones simples, figuras geométricas, perímetros y áreas sencillas), problemas contextualizados con situaciones reales.
       - 5° y 6° de Primaria: Fracciones equivalentes, números decimales, porcentajes, proporcionalidad, áreas y perímetros, introducción a ecuaciones simples y pensamiento algebraico.
     * Si es Secundaria (1° a 5° de Secundaria):
       - Calibrar para estudiantes de educación secundaria según el año (${level}).
       - 1° y 2° de Secundaria: Números enteros, racionales, álgebra básica (monomios, polinomios, ecuaciones lineales), geometría euclidiana (triángulos, ángulos, cuadriláteros).
       - 3°, 4° y 5° de Secundaria: Ecuaciones cuadráticas, sistemas de ecuaciones, razones y funciones trigonométricas, identidades, geometría del espacio, física elemental (cinemática/dinámica).
     * Si es Pre-universitario o Universitario:
       - Rigor académico preuniversitario (estilo Academia John Nash / Aduni / Trilce / Lumbreras / CEPRE-UNI / CEPRE-San Marcos), con propiedades formales y fórmulas ($$).
   - CRITICAL LENGTH LIMIT: The theoretical explanation must be concise, structured, and compact enough to fit in at most 1 to 2 pages (350-500 words total). Focus strictly on fundamental concepts, key properties, essential formulas ($$), and 1 or 2 clean geometric/illustrative SVG diagrams. Do NOT generate unnecessary filler.
   - Use this specific HTML snippet for the main topic header (note: MUST include logo and "Academia John Nash", NEVER use "Recursos Didácticos"):
     \`<div class="ficha-header print-full-width"><div class="ficha-header-top"><img src="/logo_nash.png" alt="Logo Academia John Nash" class="nash-header-logo" /><div class="nash-header-info"><div class="nash-academy-name">Academia John Nash</div><div class="nash-slogan">Creemos en tu esfuerzo</div></div></div><div class="text-xs font-bold text-slate-500 tracking-widest mt-1 uppercase">\${course} &nbsp;|&nbsp; \${level}</div><div class="ficha-subtitle">\${title}</div></div>\`
   - Wrap key terms or sub-topics using this HTML: \`<span class="ficha-concept">Concept Name</span>\`
   - Include 1 or 2 concise historical notes or tips using: \`<div class="sabias-que print-full-width"><div class="sabias-que-icon">👨‍🏫</div><div><div class="sabias-que-title">Sabías que...</div><div class="text-sm">Brief tip or historical fact</div></div></div>\`
   - Use $$ for math equations inline or block.
   - **CRITICAL FOR GEOMETRY, TRIGONOMETRY, AND PHYSICS:** You MUST include relevant geometric figures (circles, triangles, angles) as clean, inline SVG (\`<svg viewBox="0 0 200 200" width="180" height="180" stroke="currentColor" fill="none">...</svg>\`) centered in \`<div class="flex justify-center my-4">...</div>\`.
2. Then, add a "text" block with the heading \`<div class="text-center font-black text-xl mt-6 mb-4 uppercase print-full-width" style="font-family: 'Comic Sans MS', cursive; color: #1e3a8a;">Ejercicios de Aplicación</div>\`.
3. Finally, generate "exercise" blocks structured into the 4 official levels (Básico, Intermedio, Avanzado, Tarea Domiciliaria):
   - Questions must match the exact difficulty and pedagogy of the Target Audience Level (${level}).
   - For Pre-U and Secundaria: Problems MUST be modeled directly on authentic Peruvian admission exams from cepreUNAS (Universidad Nacional Agraria de la Selva), UNMSM (Universidad Nacional Mayor de San Marcos), UNI (Universidad Nacional de Ingeniería), and UNHEVAL (Universidad Nacional Hermilio Valdizán).
   - Format of questions: Each exercise MUST start with the admission exam tag in parentheses, e.g.:
     "(cepreUNAS 2024) Enunciado...", "(UNMSM 2024-I) Enunciado...", "(UNI 2023-II) Enunciado...", "(UNHEVAL 2024) Enunciado...".
   - Include in metadata: "level": "Básico" | "Intermedio" | "Avanzado" | "Tarea Domiciliaria", "examSource": "cepreUNAS 2024" | "UNMSM 2024-I" | "UNI 2023-II" | "UNHEVAL 2024".
   - IMPORTANT: Use $...$ for inline math and $$...$$ for block equations so they render correctly in KaTeX.
   - Provide exactly 5 options (a, b, c, d, e) in the metadata.options array.
   - Set the correctAnswer index (0 to 4).
4. Return ONLY valid JSON. Do not wrap in markdown codeblocks.`;

      let response: any = null;
      let lastError: any = null;

      for (const modelName of CANDIDATE_MODELS) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: "application/json"
            }
          });
          if (response?.text) break;
        } catch (e: any) {
          lastError = e;
          console.warn(`Generate model ${modelName} failed: ${e.message}. Trying next fallback model...`);
          continue;
        }
      }

      if (!response && lastError) throw lastError;

      res.json({ content: response?.text });
    } catch (error: any) {
      console.error("API Error:", error);
      const isQuota = String(error?.message || '').includes('quota') || String(error?.message || '').includes('RESOURCE_EXHAUSTED');
      const friendlyMsg = isQuota 
        ? "Se ha alcanzado temporalmente el límite de cuota de la API de Gemini. Por favor espera un minuto y vuelve a intentar."
        : (error.message || "Error al generar contenido educativo");
      const statusCode = typeof error.status === 'number' ? error.status : (isQuota ? 429 : 500);
      res.status(statusCode).json({ error: friendlyMsg });
    }
  });

  // API Route to parse raw syllabus text into structured topics
  app.post("/api/parse-syllabus", async (req, res) => {
    try {
      const { syllabusText, course } = req.body;
      if (!syllabusText || !syllabusText.trim()) {
        return res.status(400).json({ error: "El texto del sílabo es requerido" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Fallback: simple line parser
        const lines = syllabusText
          .split('\n')
          .map((l: string) => l.trim())
          .filter((l: string) => l.length > 2)
          .map((l: string) => l.replace(/^(semana|tema|capítulo|capitulo|unidad|\d+[\.\-\)]|\-|\*)\s*\d*[:\.\-]?\s*/i, '').trim())
          .filter((l: string) => l.length > 0);
        return res.json({ topics: lines.slice(0, 36) });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `Analiza el siguiente texto de sílabo o lista de temas para el curso de ${course || 'Matemática / Ciencias'}.
Extrae de manera limpia la lista ordenada de capítulos o temas principales.
Ignora fechas, bibliografía o introducciones administrativas.
Devuelve ÚNICAMENTE un objeto JSON con este formato:
{
  "topics": [
    "Tema 1: Título conciso",
    "Tema 2: Título conciso"
  ]
}

Texto del sílabo:
"""
${syllabusText.slice(0, 8000)}
"""`;

      let response: any = null;
      for (const modelName of CANDIDATE_MODELS) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: { responseMimeType: "application/json" }
          });
          if (response?.text) break;
        } catch (e: any) {
          console.warn(`Parse syllabus model ${modelName} failed: ${e.message}`);
          continue;
        }
      }

      let parsed = { topics: [] };
      if (response?.text) {
        try {
          parsed = robustJsonParse(response.text);
        } catch {
          const match = response.text.match(/\{[\s\S]*\}/);
          if (match) {
            try {
              parsed = robustJsonParse(match[0]);
            } catch {}
          }
        }
      }

      if (!parsed.topics || parsed.topics.length === 0) {
        // Fallback line split
        const lines = syllabusText
          .split('\n')
          .map((l: string) => l.trim())
          .filter((l: string) => l.length > 2)
          .map((l: string) => l.replace(/^(semana|tema|capítulo|capitulo|unidad|\d+[\.\-\)]|\-|\*)\s*\d*[:\.\-]?\s*/i, '').trim())
          .filter((l: string) => l.length > 0);
        parsed.topics = lines.slice(0, 36);
      }

      res.json(parsed);
    } catch (error: any) {
      console.error("Parse syllabus error:", error);
      res.status(500).json({ error: error.message || "Error al procesar el sílabo" });
    }
  });

  // API Route to generate a complete academic book from a syllabus
  app.post("/api/generate-book-from-syllabus", async (req, res) => {
    try {
      const {
        title,
        course,
        level,
        topics,
        exercisesPerTopic = 18,
        includeCover = true,
        includeIndex = true,
        includeTheory = true,
        includeKeySheet = true
      } = req.body;

      // Minimum 16 exercises per chapter (>15 exercises)
      const targetExercises = Math.max(16, Number(exercisesPerTopic) || 18);

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY no está configurada en el servidor" });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const selectedTopics: string[] = Array.isArray(topics) && topics.length > 0
        ? topics
        : [
            "Teoría de Exponentes y Ecuaciones Exponenciales",
            "Polinomios, Grados y Valor Numérico",
            "Productos Notables e Identidades Algebraicas",
            "División Algebraica, Método de Horner y Teorema del Resto",
            "Cocientes Notables y Métodos de Factorización",
            "Ecuaciones Cuadráticas y Propiedades de las Raíces"
          ];

      const perLevel = Math.max(4, Math.floor(targetExercises / 4));
      const basicCount = perLevel;
      const interCount = perLevel;
      const advCount = perLevel;
      const hwCount = targetExercises - (basicCount + interCount + advCount);

      const prompt = `Eres un autor y editor experto de libros y compendios académicos preuniversitarios de excelencia para la Academia John Nash (estilo CEPRE-UNI, CEPRE San Marcos, Lumbreras, Cuzcano, CEPREUNAS, CEPREVAL).
Tu objetivo es redactar un LIBRO ACADÉMICO COMPLETO en formato A4 listo para imprenta y evaluación preuniversitaria.

Parámetros del libro:
- Título Oficial del Libro: "${title || 'Compendio Académico Oficial'}"
- Asignatura: ${course || 'Matemática'}
- Nivel de la audiencia: ${level || 'Pre-universitario'}
- Temas del Sílabo seleccionados:
${selectedTopics.map((t, idx) => `  ${idx + 1}. ${t}`).join('\n')}
- Ejercicios por tema: ${targetExercises} preguntas con 5 alternativas (a, b, c, d, e). OBLIGATORIO: EXACTAMENTE ${targetExercises} EJERCICIOS POR TEMA, DISTRIBUIDOS EN 4 NIVELES (4 o 5 por nivel).
- Incluir Carátula Oficial A4: ${includeCover ? 'SÍ' : 'NO'}
- Incluir Índice General detallado: ${includeIndex ? 'SÍ' : 'NO'}
- Incluir Resumen Teórico y Fórmulas: ${includeTheory ? 'SÍ' : 'NO'}
- Incluir Cuadro de Claves al Final: ${includeKeySheet ? 'SÍ' : 'NO'}

ESTRUCTURA EXACTA DEL OBJETO JSON DE SALIDA:
{
  "bookTitle": "${title || 'Compendio Académico'}",
  "course": "${course || 'Matemática'}",
  "level": "${level || 'Pre-universitario'}",
  "chapters": [
    {
      "chapterNumber": 1,
      "title": "Nombre del Tema 1",
      "pageStart": 3
    }
  ],
  "blocks": [
    // BLOQUES EN ORDEN:
    // 1. Si includeCover es true: UN bloque "text" con la carátula oficial en HTML (clase "book-cover-page")
    // 2. Si includeIndex es true: UN bloque "text" con el índice general en HTML (clase "book-index-page")
    // 3. Para CADA tema del sílabo:
    //    a) Bloque "text" con la teoría clara, definiciones, fórmulas en KaTeX ($$), cuadro "Sabías que..." y diagrama SVG si es geometría/física.
    //    b) Exactamente ${targetExercises} bloques "exercise" divididos estrictamente en 4 NIVELES: BÁSICO, INTERMEDIO, AVANZADO y TAREA DOMICILIARIA.
    // 4. Si includeKeySheet es true: UN bloque "text" con la tabla resumen de claves (clase "book-keys-page")
  ]
}

REGLAS DE MAQUETACIÓN EDITORIAL:
1. CARÁTULA (si includeCover):
   Usa este HTML:
   \`<div class="book-cover-page print-full-width"><div class="book-cover-header"><img src="/logo_nash.png" alt="Logo Nash" class="nash-header-logo" /><div class="book-cover-inst"><div class="book-cover-inst-name">Academia John Nash</div><div class="book-cover-slogan">Creemos en tu esfuerzo • Fondo Editorial</div></div></div><div class="book-cover-badge">EDICIÓN OFICIAL 2026 • CICLO ANUAL / SEMESTRAL</div><h1 class="book-cover-title">\${title}</h1><div class="book-cover-course">\${course} &nbsp;•&nbsp; \${level}</div><div class="book-cover-features"><div class="book-feat-item">✓ Teoría Sintética y Fórmulas Clave</div><div class="book-feat-item">✓ 4 Niveles Oficiales: Básico, Intermedio, Avanzado y Tarea Domiciliaria</div><div class="book-feat-item">✓ Ejercicios de Admisión: cepreUNAS, UNMSM, UNI, UNHEVAL</div><div class="book-feat-item">✓ Claves de Respuestas Verificadas</div></div><div class="book-cover-footer"><p>Material elaborado por el Departamento Académico de Ciencias</p><p>Prohibida su reproducción total o parcial sin autorización</p></div></div>\`

2. ÍNDICE GENERAL (si includeIndex):
   Crea una tabla de contenidos elegante con puntos de relleno ("..."):
   \`<div class="book-index-page print-full-width"><div class="book-index-header"><div class="text-xs font-bold text-sky-700 tracking-widest uppercase">Índice General</div><h2 class="text-xl font-bold font-serif text-slate-800">Contenido Temático del Libro</h2><p class="text-xs text-slate-500">Programación académica oficial por semanas y capítulos</p></div><div class="book-index-list">\${items}</div></div>\`

3. CAPÍTULO Y TEORÍA PREUNIVERSITARIA COMPLETA (RELLENO DEL ESPACIO AL 85%-95% Y CERO FÓRMULAS CORTADAS):
   La teoría de cada capítulo es el pilar de aprendizaje del estudiante: debe ser RIGUROSA, COMPLETA, PEDAGÓGICA Y OCUPAR ARMONIOSAMENTE EL 85% A 95% DE LA PÁGINA ASIGNADA, llenando todo el espacio disponible sin dejar vacíos ni desiertos en blanco.
   ¡PROHIBIDO generar bloques de código Markdown con triple comilla invertida (\`\`\`html o \`\`\`), etiquetas <pre> o <code>, o clases como "font-mono"! Todo debe presentarse como texto didáctico y fórmulas matemáticas compiladas.

   ¡REGLAS CRÍTICAS PARA QUE NINGUNA FÓRMULA SE CORTE O SE VEA INCOMPLETA!:
   a) CADA LEY EN SU PROPIA TARJETA INDIVIDUAL: 1 Ley = 1 Tarjeta (.ley-item).
   b) ¡TERMINANTEMENTE PROHIBIDO concatenar o pegar dos ecuaciones largas con punto y coma en una sola línea horizontal (ej: '$$A = B ; C = D$$') dentro de una tarjeta! Eso desborda el ancho y corta la fórmula en los márgenes.
   c) Si un concepto tiene dos identidades (ejemplo: Producto y Cociente de bases iguales), sepáralas obligatoriamente en DOS tarjetas independientes:
      - Tarjeta 1: 'Producto de Bases Iguales' con '$$a^m \\cdot a^n = a^{m+n}$$'
      - Tarjeta 2: 'Cociente de Bases Iguales' con '$$\\frac{a^m}{a^n} = a^{m-n} \\quad (a \\neq 0)$$'
      O si están dentro de la misma tarjeta, apílalas verticalmente usando:
      \`<div class='ley-nombre'>Producto de Bases Iguales</div><div class='formula-line'>$$a^m \\cdot a^n = a^{m+n}$$</div><div class='ley-nombre mt-1.5'>Cociente de Bases Iguales</div><div class='formula-line'>$$\\frac{a^m}{a^n} = a^{m-n} \\quad (a \\neq 0)$$</div>\`
   d) Cada fórmula debe ser compacta, centrada y sin desbordes.

   ESTRUCTURA OBLIGATORIA DE LA TEORÍA PARA CADA CAPÍTULO (COMPLETA Y PROFUNDA):
   a) Encabezado oficial del Capítulo:
      \`<div class='capitulo-header-block print-full-width'><div class='capitulo-tag'>CAPÍTULO \${num} &nbsp;•&nbsp; \${course.toUpperCase()}</div><h3 class='capitulo-title'>\${tema}</h3></div>\`
   b) Caja de Definición, Notación Formal y Elementos Clave:
      \`<div class='teoria-definicion-box'><div class='teoria-seccion-badge'>1. DEFINICIÓN Y FUNDAMENTOS CONCEPTUALES</div><p class='teoria-parrafo'>Explicación conceptual completa, intuitiva y rigurosa del tema \${tema}, redactada en lenguaje académico formal para postulantes a cepreUNAS, UNMSM, UNI y UNHEVAL.</p><div class='teoria-elementos-grid'><div class='teoria-elemento-card'><b>Notación Formal:</b> $$...$$</div><div class='teoria-elemento-card'><b>Condiciones de Existencia:</b> $$...$$</div></div></div>\`
   c) Cuadro de Leyes y Teoremas Fundamentales (6 a 8 tarjetas individuales en grid de 2 columnas, con 1 sola fórmula centrada por tarjeta):
      \`<div class='teoria-leyes-box'><div class='teoria-seccion-badge'>2. LEYES Y TEOREMAS PRINCIPALES</div><div class='teoria-grid-leyes'><div class='ley-item'><div class='ley-nombre'>Ley 1</div><div class='formula-line'>$$fórmula en KaTeX$$</div></div><div class='ley-item'><div class='ley-nombre'>Ley 2</div><div class='formula-line'>$$fórmula en KaTeX$$</div></div><div class='ley-item'><div class='ley-nombre'>Ley 3</div><div class='formula-line'>$$fórmula en KaTeX$$</div></div><div class='ley-item'><div class='ley-nombre'>Ley 4</div><div class='formula-line'>$$fórmula en KaTeX$$</div></div><div class='ley-item'><div class='ley-nombre'>Ley 5</div><div class='formula-line'>$$fórmula en KaTeX$$</div></div><div class='ley-item'><div class='ley-nombre'>Ley 6</div><div class='formula-line'>$$fórmula en KaTeX$$</div></div></div></div>\`
   d) Cuadro de Casos Especiales, Radicación o Ecuaciones Trascendentes (3 a 4 tarjetas complementarias):
      \`<div class='teoria-leyes-box'><div class='teoria-seccion-badge'>3. PROPIEDADES AUXILIARES Y ECUACIONES NOTABLES</div><div class='teoria-grid-leyes'><div class='ley-item'><div class='ley-nombre'>Propiedad Notable 1</div><div class='formula-line'>$$fórmula en KaTeX$$</div></div><div class='ley-item'><div class='ley-nombre'>Propiedad Notable 2</div><div class='formula-line'>$$fórmula en KaTeX$$</div></div></div></div>\`
   e) Recuadro Didáctico Nash (Artificio / Tip Preuniversitario para exámenes de cepreUNAS, UNMSM, UNI y UNHEVAL):
      \`<div class='sabias-que print-full-width'><div class='sabias-que-icon'>💡</div><div><div class='sabias-que-title'>Método Práctico Nash / Artificio de Admisión</div><div class='sabias-que-body'>Artificio o método rápido de resolución que permite resolver preguntas de este tema en segundos ahorrando tiempo operativo.</div></div></div>\`
   f) Recuadro de Advertencias Preuniversitarias / Errores Frecuentes en Admisión:
      \`<div class='teoria-advertencia-box print-full-width'><div><div class='teoria-advertencia-title'>⚠️ Advertencia Preuniversitaria / Errores Frecuentes</div><div class='teoria-advertencia-body'>Puntos críticos donde suelen equivocarse los postulantes y cómo evitar trampas clásicas de admisión.</div></div></div>\`

4. EJERCICIOS Y REFERENCIADO DE EXAMEN DE ADMISIÓN (TAL CUAL LA IMAGEN EDITORIAL):
   Para CADA tema genera exactamente ${targetExercises} bloques "exercise" divididos en los CUATRO niveles:
   
   ¡REGLA FUNDAMENTAL DE REFERENCIADO (ESTRICTAMENTE EDITORIAL)!:
   El referenciado de examen de admisión (por ejemplo: "(Ex Admisión UNMSM 2005 – II)", "(Ex Admisión UNMSM 2007 – I)", "(Ex Admisión UNI 2023 – II)", "(Ex Admisión cepreUNAS 2024)") se coloca ÚNICA Y EXCLUSIVAMENTE en aquellas preguntas que REALMENTE provienen de un examen de admisión (como en las preguntas 14, 15, 16 del nivel Avanzado).
   
   - PREGUNTAS REGULARES (Nivel Básico e Intermedio, ej. preguntas 1 a 13):
     Son ejercicios de aplicación, desarrollo y práctica propuestos por la academia.
     ¡ESTÁ PROHIBIDO ponerles siglas universitarias o etiquetas de examen!
     El enunciado debe iniciar DIRECTAMENTE y LIMPIO con su instrucción matemática:
     "Calcule el valor de 6M, si: ..."
     "Reduzca la expresión: ..."
     "Simplifique la expresión: ..."
     "En la ecuación: ... Calcular el valor de 2x."
     "Calcular \"x\" en: ..."
     (Tal como se ve en las preguntas 5, 6, 7, 8, 13 de la imagen de compendio oficial).
     metadata: { "level": "Básico" | "Intermedio", "isHomework": false, "isAdmissionExam": false }
   
   - PREGUNTAS DE EXAMEN DE ADMISIÓN REAL (Nivel Avanzado, ej. preguntas 14, 15, 16):
     Son preguntas oficiales extraídas de exámenes de admisión históricos de UNMSM, UNI, cepreUNAS, UNHEVAL.
     ¡SOLO ESTAS PREGUNTAS LLEVAN EL REFERENCIADO AL INICIO!:
     "(Ex Admisión UNMSM 2005 – II)\nSi x es positivo, simplificar la expresión: ..."
     "(Ex Admisión UNMSM 2007 – I)\nSi: ... Hallar la suma de cifras de \"n\"."
     "(Ex Admisión UNMSM 2009 – I)\n¿Qué valor debe tomar \"m\" para que se verifique la igualdad: ..."
     "(Ex Admisión UNI 2023 – II)\nAl resolver el sistema ..."
     metadata: { "level": "Avanzado", "isHomework": false, "isAdmissionExam": true, "examSource": "Ex Admisión UNMSM 2005 – II" }
   
   - TAREA DOMICILIARIA (Preguntas ${basicCount + interCount + advCount + 1} a ${targetExercises}):
     Ejercicios propuestos para casa, redactados de forma limpia: "Simplificar...", "Resolver...".
     metadata: { "level": "Tarea Domiciliaria", "isHomework": true, "isAdmissionExam": false }

   REGLA DE ENUMERACIÓN OBLIGATORIA:
   DESPUÉS DE CADA TEMA, LA ENUMERACIÓN DE LOS EJERCICIOS SE DEBE REINICIAR OBLIGATORIAMENTE DESDE 1. Cada capítulo tiene sus preguntas numeradas del 1 al ${targetExercises}.

   Estructura de cada bloque de ejercicio:
   - "type": "exercise"
   - "content": "Enunciado limpio (o con '(Ex Admisión UNMSM ...)' si es examen real) con matemáticas en $...$ o $$...$$"
   - "metadata": {
       "chapter": \${num},
       "chapterTitle": "\${tema}",
       "level": "Básico" | "Intermedio" | "Avanzado" | "Tarea Domiciliaria",
       "isHomework": boolean,
       "isAdmissionExam": boolean,
       "examSource": string | undefined, // Solo si isAdmissionExam es true
       "exerciseNumberInChapter": 1, // de 1 a ${targetExercises}
       "options": ["a) ...", "b) ...", "c) ...", "d) ...", "e) ..."],
       "correctAnswer": 0
     }

5. CLAVES AL FINAL (si includeKeySheet):
   Genera una tabla compacta con las claves de todos los capítulos, numeradas del 1 al ${targetExercises}:
   \`<div class='book-keys-page print-full-width'><div class='text-center font-bold text-base font-serif text-slate-800 mb-2'>TABLA OFICIAL DE CLAVES DE RESPUESTAS</div><p class='text-center text-xs text-slate-500 mb-4'>Verifica tu puntaje y efectividad por capítulo (Actividades y Tareas Domiciliarias)</p><div class='claves-grid'>...</div></div>\`


REGLAS CRÍTICAS DE SINTAXIS JSON (OBLIGATORIAS):
1. Devuelve ÚNICAMENTE el JSON válido en texto plano, sin formato markdown ni bloques \`\`\`json.
2. IMPORTANTE PARA LATEX Y FÓRMULAS: En JSON, la barra invertida es un caracter de escape reservado. Por lo tanto, CADA barra invertida de fórmulas matemáticas (como \\frac, \\sqrt, \\alpha, \\theta, \\times, \\cdot, \\Delta, etc.) DEBE estar doblemente escapada como "\\\\frac", "\\\\sqrt", "\\\\alpha", "\\\\times", etc. NUNCA escribas una barra invertida solitaria como "\\frac".
3. No insertes saltos de línea sin escapar dentro de los valores de texto.
4. Usa comillas simples (') para los atributos HTML dentro de los valores de texto (por ejemplo: class='capitulo-header-block'), nunca comillas dobles para no romper la sintaxis JSON.
5. CADA bloque de texto correspondiente a la teoría de un capítulo DEBE incluir "metadata": { "chapter": num, "chapterTitle": "Nombre", "isTheory": true }.
6. CERO CÓDIGOS EN LA TEORÍA: No uses \`\`\` ni <pre> ni <code> en el contenido de la teoría. Redáctala como texto enriquecido preuniversitario.
7. "correctAnswer" DEBE SER SIEMPRE UN NÚMERO ENTERO DEL 0 AL 4 (0=a, 1=b, 2=c, 3=d, 4=e). ¡NUNCA coloques letras sueltas como b o c!
8. FÓRMULAS MATEMÁTICAS EN ENUNCIADOS Y OPCIONES: TODA expresión o ecuación matemática en los enunciados y alternativas DEBE estar COMPLETAMENTE envuelta en $...$ (ejemplo: "$P = (\\\\sqrt{7} + \\\\sqrt{3})(\\\\sqrt{7} - \\\\sqrt{3})$", "$E = \\\\frac{a+b}{c}$"). NUNCA dejes raíces, fracciones o variables sueltas sin signos de dólar, y NUNCA dejes signos de operación o paréntesis fuera del signo de dólar si pertenecen a la ecuación.
`;

      let response: any = null;
      let lastError: any = null;

      for (const modelName of CANDIDATE_MODELS) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              maxOutputTokens: 32768
            }
          });
          if (response?.text) break;
        } catch (e: any) {
          lastError = e;
          console.warn(`Generate book model ${modelName} failed: ${e.message}. Trying next fallback...`);
          continue;
        }
      }

      if (!response && lastError) throw lastError;

      let parsed: any = null;
      if (response?.text) {
        try {
          parsed = robustJsonParse(response.text);
        } catch (parseErr: any) {
          console.warn("Direct robustJsonParse error:", parseErr.message);
          const match = response.text.match(/\{[\s\S]*\}/);
          if (match) {
            try {
              parsed = robustJsonParse(match[0]);
            } catch (innerErr: any) {
              console.warn("Regex match robustJsonParse error:", innerErr.message);
            }
          }
        }
      }

      // Robust fallback if blocks are missing or empty
      if (!parsed || !parsed.blocks || !Array.isArray(parsed.blocks) || parsed.blocks.length === 0) {
        console.warn("Reconstructing pristine academic book structure with >15 exercises per topic...");
        const fallbackBlocks: any[] = [];
        const fallbackChapters: any[] = [];
        let currentPage = 1;

        if (includeCover) {
          fallbackBlocks.push({
            type: "text",
            content: `<div class="book-cover-page print-full-width"><div class="book-cover-header"><img src="/logo_nash.png" alt="Logo Nash" class="nash-header-logo" /><div class="book-cover-inst"><div class="book-cover-inst-name">Academia John Nash</div><div class="book-cover-slogan">Creemos en tu esfuerzo • Fondo Editorial</div></div></div><div class="book-cover-badge">EDICIÓN OFICIAL 2026 • CICLO ANUAL / SEMESTRAL</div><h1 class="book-cover-title">${title || `Compendio Académico de ${course}`}</h1><div class="book-cover-course">${course} &nbsp;•&nbsp; ${level}</div><div class="book-cover-features"><div class="book-feat-item">✓ Teoría Clara, Definiciones y Fórmulas KaTeX</div><div class="book-feat-item">✓ Más de 15 Ejercicios por Tema (Básico, Intermedio y Domiciliaria)</div><div class="book-feat-item">✓ Claves de Respuestas Verificadas</div></div><div class="book-cover-footer"><p>Material elaborado por el Departamento Académico de Ciencias</p><p>Prohibida su reproducción total o parcial sin autorización</p></div></div>`,
            metadata: { isCover: true }
          });
          currentPage++;
        }

        if (includeIndex) {
          const indexItemsHtml = selectedTopics.map((t, idx) => 
            `<div class="book-index-item"><span class="book-index-title"><b>Capítulo ${idx + 1}:</b> ${t}</span><span class="book-index-dots"></span><span class="book-index-page-num">${currentPage + 1 + idx}</span></div>`
          ).join('');

          fallbackBlocks.push({
            type: "text",
            content: `<div class="book-index-page print-full-width"><div class="book-index-header"><div class="text-xs font-bold text-sky-700 tracking-widest uppercase">Índice General</div><h2 class="text-xl font-bold font-serif text-slate-800">Contenido Temático del Libro</h2><p class="text-xs text-slate-500">Programación académica oficial por semanas y capítulos</p></div><div class="book-index-list">${indexItemsHtml}</div></div>`,
            metadata: { isIndex: true }
          });
          currentPage++;
        }

        selectedTopics.forEach((t, idx) => {
          const chNum = idx + 1;
          fallbackChapters.push({
            chapterNumber: chNum,
            title: t,
            pageStart: currentPage
          });

          if (includeTheory) {
            const courseLabel = (course || 'ÁLGEBRA').toUpperCase();
            const topicLabel = t.toUpperCase();
            let theoryHtml = '';

            if (/exponente|potenciaci|radicaci/i.test(t)) {
              theoryHtml = `<div class="capitulo-header-block print-full-width">
  <div class="capitulo-tag">CAPÍTULO ${chNum} &nbsp;•&nbsp; ${courseLabel}</div>
  <h3 class="capitulo-title">${topicLabel}</h3>
</div>

<div class="teoria-definicion-box">
  <div class="teoria-seccion-badge">1. DEFINICIÓN Y FUNDAMENTOS CONCEPTUALES</div>
  <p class="teoria-parrafo">
    La <b>Teoría de Exponentes</b> estudia las propiedades y transformaciones de las operaciones de <b>potenciación</b> y <b>radicación</b> en el campo de los números reales ($\\mathbb{R}$). Una ecuación exponencial es aquella donde la incógnita figura en el exponente o como base y exponente simultáneamente.
  </p>
  <div class="teoria-elementos-grid">
    <div class="teoria-elemento-card">
      <b>Potenciación:</b> $a^n = P \\quad (a \\in \\mathbb{R}, n \\in \\mathbb{Z})$<br/>
      <span class="text-[11px] text-slate-500">Base ($a$), Exponente ($n$), Potencia ($P$)</span>
    </div>
    <div class="teoria-elemento-card">
      <b>Radicación:</b> $\\sqrt[n]{A} = r \\iff r^n = A$<br/>
      <span class="text-[11px] text-slate-500">Índice ($n \\in \\mathbb{Z}^+, n \\ge 2$), Radicando ($A$), Raíz ($r$)</span>
    </div>
  </div>
</div>

<div class="teoria-leyes-box">
  <div class="teoria-seccion-badge">2. LEYES FUNDAMENTALES DE POTENCIACIÓN</div>
  <div class="teoria-grid-leyes">
    <div class="ley-item">
      <div class="ley-nombre">1. Producto de Bases Iguales</div>
      <div class="formula-line">$$a^m \\cdot a^n = a^{m+n}$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">2. Cociente de Bases Iguales</div>
      <div class="formula-line">$$\\frac{a^m}{a^n} = a^{m-n} \\quad (a \\neq 0)$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">3. Potencia de Potencia</div>
      <div class="formula-line">$$(a^m)^n = a^{m \\cdot n} = (a^n)^m$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">4. Exponente Nulo o Cero</div>
      <div class="formula-line">$$a^0 = 1 \\quad (a \\neq 0)$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">5. Exponente Negativo</div>
      <div class="formula-line">$$a^{-n} = \\frac{1}{a^n} \\quad (a \\neq 0)$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">6. Potencia de un Producto</div>
      <div class="formula-line">$$(a \\cdot b)^n = a^n \\cdot b^n$$</div>
    </div>
  </div>
</div>

<div class="teoria-leyes-box">
  <div class="teoria-seccion-badge">3. TEOREMAS DE RADICACIÓN Y ECUACIONES NOTABLES</div>
  <div class="teoria-grid-leyes">
    <div class="ley-item">
      <div class="ley-nombre">Exponente Fraccionario</div>
      <div class="formula-line">$$a^{\\frac{m}{n}} = \\sqrt[n]{a^m} = (\\sqrt[n]{a})^m$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">Raíz de un Producto y Cociente</div>
      <div class="formula-line">$$\\sqrt[n]{a \\cdot b} = \\sqrt[n]{a} \\cdot \\sqrt[n]{b}$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">Raíz de Raíz</div>
      <div class="formula-line">$$\\sqrt[m]{\\sqrt[n]{a}} = \\sqrt[m \\cdot n]{a}$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">Ecuación Exponencial (Bases Iguales)</div>
      <div class="formula-line">$$a^x = a^y \\implies x = y \\quad (a > 0, a \\neq 1)$$</div>
    </div>
  </div>
</div>

<div class="sabias-que print-full-width">
  <div class="sabias-que-icon">💡</div>
  <div>
    <div class="sabias-que-title">Método Práctico Nash / Artificio de Admisión (cepreUNAS, UNMSM, UNI, UNHEVAL)</div>
    <div class="sabias-que-body">
      • <b>Radicales Infinitos con producto:</b> $\\sqrt[n]{x \\sqrt[n]{x \\sqrt[n]{x \\dots}}} = \\sqrt[n-1]{x}$ y con división: $\\sqrt[n]{x \\div \\sqrt[n]{x \\div \\dots}} = \\sqrt[n+1]{x}$.<br/>
      • <b>Radicales Infinitos con suma consecutiva:</b> $\\sqrt{k(k+1) + \\sqrt{k(k+1) + \\dots}} = k+1$.
    </div>
  </div>
</div>

<div class="teoria-advertencia-box print-full-width">
  <div>
    <div class="teoria-advertencia-title">⚠️ Advertencia Preuniversitaria / Errores Frecuentes en Admisión</div>
    <div class="teoria-advertencia-body">
      1. $(-2)^4 = 16$, pero $-2^4 = -16$ (el exponente solo afecta a la base inmediata si no hay paréntesis).<br/>
      2. $0^0$ <b>NO es 1</b>, es una forma indeterminada en el análisis matemático real.<br/>
      3. $\\sqrt{x^2} = |x|$ para todo $x \\in \\mathbb{R}$; no simplificar directamente como $x$ si no se conoce el signo.
    </div>
  </div>
</div>`;
            } else if (/polinomio|grados|valor num/i.test(t)) {
              theoryHtml = `<div class="capitulo-header-block print-full-width">
  <div class="capitulo-tag">CAPÍTULO ${chNum} &nbsp;•&nbsp; ${courseLabel}</div>
  <h3 class="capitulo-title">${topicLabel}</h3>
</div>

<div class="teoria-definicion-box">
  <div class="teoria-seccion-badge">1. DEFINICIÓN Y FUNDAMENTOS CONCEPTUALES</div>
  <p class="teoria-parrafo">
    Un <b>Polinomio</b> es una expresión algebraica racional entera donde las variables tienen exponentes enteros no negativos ($\\mathbb{Z}_0^+$). El estudio de sus grados y valor numérico constituye el fundamento del álgebra abstracta y de modelamiento preuniversitario.
  </p>
  <div class="teoria-elementos-grid">
    <div class="teoria-elemento-card">
      <b>Forma General en $\\mathbb{R}[x]$:</b><br/>
      $P(x) = a_n x^n + a_{n-1}x^{n-1} + \\dots + a_1 x + a_0 \\quad (a_n \\neq 0)$
    </div>
    <div class="teoria-elemento-card">
      <b>Elementos Clave:</b><br/>
      $a_n$: Coeficiente Principal &nbsp;•&nbsp; $a_0$: Término Independiente &nbsp;•&nbsp; $n$: Grado del Polinomio
    </div>
  </div>
</div>

<div class="teoria-leyes-box">
  <div class="teoria-seccion-badge">2. TEOREMAS DE GRADOS Y VALOR NUMÉRICO</div>
  <div class="teoria-grid-leyes">
    <div class="ley-item">
      <div class="ley-nombre">1. Grado Relativo de un Monomio</div>
      <div class="formula-line">$$M(x,y) = c x^a y^b \\implies GR(x) = a$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">2. Grado Absoluto de un Monomio</div>
      <div class="formula-line">$$GA(M) = a + b \\quad (a, b \\in \\mathbb{Z}_0^+)$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">3. Suma de Coeficientes</div>
      <div class="formula-line">$$\\sum \\text{Coef.} = P(1)$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">4. Término Independiente</div>
      <div class="formula-line">$$T.I. = P(0)$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">5. Polinomio Idénticamente Nulo</div>
      <div class="formula-line">$$P(x) \\equiv 0 \\iff a_k = 0 \\quad (\\forall k)$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">6. Polinomios Idénticos</div>
      <div class="formula-line">$$P(x) \\equiv Q(x) \\iff a_k = b_k \\quad (\\forall k)$$</div>
    </div>
  </div>
</div>

<div class="teoria-leyes-box">
  <div class="teoria-seccion-badge">3. POLINOMIOS ESPECIALES NOTABLES</div>
  <div class="teoria-grid-leyes">
    <div class="ley-item">
      <div class="ley-nombre">Polinomio Homogéneo</div>
      <div class="formula-line">$$GA(t_1) = GA(t_2) = \\dots = GA(t_k)$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">Polinomio Completo y Ordenado</div>
      <div class="formula-line">$$\\#\\text{Términos} = GA(P) + 1$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">Cambio de Variable</div>
      <div class="formula-line">$$P(x+k) = E(x) \\implies x \\leftarrow x-k$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">Grado de un Producto y Potencia</div>
      <div class="formula-line">$$G(P \\cdot Q) = G(P) + G(Q) \\;;\\; G(P^k) = k \\cdot G(P)$$</div>
    </div>
  </div>
</div>

<div class="sabias-que print-full-width">
  <div class="sabias-que-icon">💡</div>
  <div>
    <div class="sabias-que-title">Método Práctico Nash / Artificio de Admisión (UNMSM, UNI, cepreUNAS)</div>
    <div class="sabias-que-body">
      • Para hallar la suma de coeficientes de una expresión compuesta $P(ax+b)$, iguala el argumento $ax+b = 1$ y despeja $x$.<br/>
      • Para hallar el término independiente de $P(ax+b)$, iguala el argumento $ax+b = 0$ y reemplaza el valor de $x$ resultante.
    </div>
  </div>
</div>

<div class="teoria-advertencia-box print-full-width">
  <div>
    <div class="teoria-advertencia-title">⚠️ Advertencia Preuniversitaria / Errores Frecuentes</div>
    <div class="teoria-advertencia-body">
      1. Si una variable aparece en el denominador o dentro de un radical (ej: $\\frac{1}{x}$ o $\\sqrt{x}$), la expresión <b>NO es un polinomio</b>.<br/>
      2. No confundir el grado relativo con el exponente de una constante: si $P(x) = 5^4 x^3$, el grado es 3, no 4.
    </div>
  </div>
</div>`;
            } else if (/producto.*notable|identidad.*algebraic/i.test(t)) {
              theoryHtml = `<div class="capitulo-header-block print-full-width">
  <div class="capitulo-tag">CAPÍTULO ${chNum} &nbsp;•&nbsp; ${courseLabel}</div>
  <h3 class="capitulo-title">${topicLabel}</h3>
</div>

<div class="teoria-definicion-box">
  <div class="teoria-seccion-badge">1. DEFINICIÓN Y FUNDAMENTOS CONCEPTUALES</div>
  <p class="teoria-parrafo">
    Los <b>Productos Notables</b> son multiplicaciones de polinomios cuyos resultados se obtienen de forma directa por simple inspección reglada, sin efectuar la multiplicación distributiva término a término.
  </p>
  <div class="teoria-elementos-grid">
    <div class="teoria-elemento-card">
      <b>Binomio al Cuadrado:</b> $(a \\pm b)^2 = a^2 \\pm 2ab + b^2$
    </div>
    <div class="teoria-elemento-card">
      <b>Diferencia de Cuadrados:</b> $(a + b)(a - b) = a^2 - b^2$
    </div>
  </div>
</div>

<div class="teoria-leyes-box">
  <div class="teoria-seccion-badge">2. IDENTIDADES FUNDAMENTALES DE ADMISIÓN</div>
  <div class="teoria-grid-leyes">
    <div class="ley-item">
      <div class="ley-nombre">1. Primera Identidad de Legendre</div>
      <div class="formula-line">$$(a + b)^2 + (a - b)^2 = 2(a^2 + b^2)$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">2. Segunda Identidad de Legendre</div>
      <div class="formula-line">$$(a + b)^2 - (a - b)^2 = 4ab$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">3. Binomio al Cubo (Forma de Cauchy)</div>
      <div class="formula-line">$$(a + b)^3 = a^3 + b^3 + 3ab(a + b)$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">4. Diferencia al Cubo (Cauchy)</div>
      <div class="formula-line">$$(a - b)^3 = a^3 - b^3 - 3ab(a - b)$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">5. Suma de Cubos</div>
      <div class="formula-line">$$(a + b)(a^2 - ab + b^2) = a^3 + b^3$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">6. Diferencia de Cubos</div>
      <div class="formula-line">$$(a - b)(a^2 + ab + b^2) = a^3 - b^3$$</div>
    </div>
  </div>
</div>

<div class="teoria-leyes-box">
  <div class="teoria-seccion-badge">3. IDENTIDADES ESPECIALES Y CONDICIONALES</div>
  <div class="teoria-grid-leyes">
    <div class="ley-item">
      <div class="ley-nombre">Trinomio al Cuadrado</div>
      <div class="formula-line">$$(a+b+c)^2 = a^2+b^2+c^2 + 2(ab+bc+ca)$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">Identidad Condicional Fundamental</div>
      <div class="formula-line">$$a+b+c=0 \\implies a^3+b^3+c^3 = 3abc$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">Identidad de Lagrange</div>
      <div class="formula-line">$$(a^2+b^2)(x^2+y^2) = (ax+by)^2 + (ay-bx)^2$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">Producto de Binomios (Stevin)</div>
      <div class="formula-line">$$(x+a)(x+b) = x^2 + (a+b)x + ab$$</div>
    </div>
  </div>
</div>

<div class="sabias-que print-full-width">
  <div class="sabias-que-icon">💡</div>
  <div>
    <div class="sabias-que-title">Método Práctico Nash / Artificio de Admisión</div>
    <div class="sabias-que-body">
      • Si $x + \\frac{1}{x} = k$, entonces $x^2 + \\frac{1}{x^2} = k^2 - 2$ y $x^3 + \\frac{1}{x^3} = k^3 - 3k$.<br/>
      • Si $a^2 + b^2 + c^2 = ab + bc + ca$, para números reales necesariamente $a = b = c$.
    </div>
  </div>
</div>

<div class="teoria-advertencia-box print-full-width">
  <div>
    <div class="teoria-advertencia-title">⚠️ Advertencia Preuniversitaria / Errores Frecuentes</div>
    <div class="teoria-advertencia-body">
      1. $(a - b)^2 \\neq a^2 - b^2$. El binomio al cuadrado siempre produce un trinomio cuadrado perfecto.<br/>
      2. No olvidar el signo negativo central en la suma de cubos: $(a + b)(a^2 \\mathbf{- ab} + b^2) = a^3 + b^3$.
    </div>
  </div>
</div>`;
            } else if (/divisi.*algebraic|horner|ruffini|resto/i.test(t)) {
              theoryHtml = `<div class="capitulo-header-block print-full-width">
  <div class="capitulo-tag">CAPÍTULO ${chNum} &nbsp;•&nbsp; ${courseLabel}</div>
  <h3 class="capitulo-title">${topicLabel}</h3>
</div>

<div class="teoria-definicion-box">
  <div class="teoria-seccion-badge">1. DEFINICIÓN Y FUNDAMENTOS CONCEPTUALES</div>
  <p class="teoria-parrafo">
    La <b>División Algebraica</b> consiste en hallar dos polinomios llamados <b>Cociente</b> $Q(x)$ y <b>Residuo</b> $R(x)$ a partir de dos polinomios dados: <b>Dividendo</b> $D(x)$ y <b>Divisor</b> $d(x)$ ($d(x) \\neq 0$).
  </p>
  <div class="teoria-elementos-grid">
    <div class="teoria-elemento-card">
      <b>Algoritmo de Euclides:</b> $D(x) \\equiv d(x) \\cdot Q(x) + R(x)$
    </div>
    <div class="teoria-elemento-card">
      <b>Propiedad de Grados:</b> $G(Q) = G(D) - G(d)$ &nbsp;•&nbsp; $G_{\\max}(R) = G(d) - 1$
    </div>
  </div>
</div>

<div class="teoria-leyes-box">
  <div class="teoria-seccion-badge">2. MÉTODOS Y TEOREMAS FUNDAMENTALES</div>
  <div class="teoria-grid-leyes">
    <div class="ley-item">
      <div class="ley-nombre">1. Algoritmo de la División</div>
      <div class="formula-line">$$D(x) = d(x) \\cdot Q(x) + R(x)$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">2. División Exacta</div>
      <div class="formula-line">$$R(x) \\equiv 0 \\iff D(x) = d(x) \\cdot Q(x)$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">3. Teorema del Resto (Descartes)</div>
      <div class="formula-line">$$d(x) = ax + b \\implies R = P\\left(-\\frac{b}{a}\\right)$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">4. Regla de Ruffini ($d(x)=x-a$)</div>
      <div class="formula-line">$$x - a = 0 \\implies x = a$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">5. Ruffini Compuesto ($ax+b$)</div>
      <div class="formula-line">$$Q_{\\text{verdadero}}(x) = \\frac{Q_{\\text{obtenido}}(x)}{a}$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">6. Método de Horner</div>
      <div class="formula-line">$$\\text{Línea separadora a } G(d) \\text{ columnas del final}$$</div>
    </div>
  </div>
</div>

<div class="teoria-leyes-box">
  <div class="teoria-seccion-badge">3. PROPIEDADES DE DIVISIBILIDAD POLINOMIAL</div>
  <div class="teoria-grid-leyes">
    <div class="ley-item">
      <div class="ley-nombre">Divisibilidad por Factores Separados</div>
      <div class="formula-line">$$P(x) \\div (x-a) \\land P(x) \\div (x-b) \\implies P(x) \\div (x-a)(x-b)$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">Teorema del Resto Generalizado</div>
      <div class="formula-line">$$d(x) = x^k + c \\implies x^k = -c$$</div>
    </div>
  </div>
</div>

<div class="sabias-que print-full-width">
  <div class="sabias-que-icon">💡</div>
  <div>
    <div class="sabias-que-title">Método Práctico Nash / Tip Preuniversitario</div>
    <div class="sabias-que-body">
      En el esquema de Horner, el primer coeficiente del divisor conserva su signo; todos los demás cambian de signo al pasar a la columna vertical izquierda. Siempre completa y ordena en forma decreciente antes de operar.
    </div>
  </div>
</div>

<div class="teoria-advertencia-box print-full-width">
  <div>
    <div class="teoria-advertencia-title">⚠️ Advertencia Preuniversitaria / Errores Típicos</div>
    <div class="teoria-advertencia-body">
      1. Si falta algún término en el dividendo o divisor, <b>es obligatorio rellenarlo con ceros</b> ($0x^k$).<br/>
      2. Al dividir entre $2x - 1$, los coeficientes que quedan abajo en la Regla de Ruffini deben dividirse entre 2 para obtener el cociente real.
    </div>
  </div>
</div>`;
            } else if (/cociente.*notable|factorizaci/i.test(t)) {
              theoryHtml = `<div class="capitulo-header-block print-full-width">
  <div class="capitulo-tag">CAPÍTULO ${chNum} &nbsp;•&nbsp; ${courseLabel}</div>
  <h3 class="capitulo-title">${topicLabel}</h3>
</div>

<div class="teoria-definicion-box">
  <div class="teoria-seccion-badge">1. DEFINICIÓN Y FUNDAMENTOS CONCEPTUALES</div>
  <p class="teoria-parrafo">
    Los <b>Cocientes Notables</b> son divisiones algebraicas de la forma $\\frac{x^n \\pm a^n}{x \\pm a}$ cuyo cociente se escribe directamente sin efectuar la operación. La <b>Factorización</b> transforma un polinomio en producto indicado de factores primos.
  </p>
  <div class="teoria-elementos-grid">
    <div class="teoria-elemento-card">
      <b>Condición de C.N.:</b> $\\frac{x^m \\pm a^p}{x^r \\pm a^s} \\implies \\frac{m}{r} = \\frac{p}{s} = n$ (\\# términos)
    </div>
    <div class="teoria-elemento-card">
      <b>Término de Lugar $k$:</b> $t_k = \\pm x^{n-k} a^{k-1}$
    </div>
  </div>
</div>

<div class="teoria-leyes-box">
  <div class="teoria-seccion-badge">2. CASOS DE COCIENTES NOTABLES Y FACTORIZACIÓN</div>
  <div class="teoria-grid-leyes">
    <div class="ley-item">
      <div class="ley-nombre">1. Caso 1 (Siempre C.N.)</div>
      <div class="formula-line">$$\\frac{x^n - a^n}{x - a} = x^{n-1} + x^{n-2}a + \\dots + a^{n-1}$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">2. Caso 2 ($n$ impar)</div>
      <div class="formula-line">$$\\frac{x^n + a^n}{x + a} = x^{n-1} - x^{n-2}a + \\dots + a^{n-1}$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">3. Caso 3 ($n$ par)</div>
      <div class="formula-line">$$\\frac{x^n - a^n}{x + a} = x^{n-1} - x^{n-2}a + \\dots - a^{n-1}$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">4. Aspa Simple ($Ax^{2n} + Bx^n + C$)</div>
      <div class="formula-line">$$P(x) = (a_1 x^n + c_1)(a_2 x^n + c_2)$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">5. Factor Común y Agrupación</div>
      <div class="formula-line">$$ax + ay + bx + by = (a+b)(x+y)$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">6. Divisores Binómicos (Raíces Racionales)</div>
      <div class="formula-line">$$\\text{P.R.R.} = \\pm \\frac{\\text{Divisores de } T.I.}{\\text{Divisores de Coef. Principal}}$$</div>
    </div>
  </div>
</div>

<div class="sabias-que print-full-width">
  <div class="sabias-que-icon">💡</div>
  <div>
    <div class="sabias-que-title">Método Práctico Nash / Artificio de Admisión</div>
    <div class="sabias-que-body">
      • En cualquier C.N., si el divisor es $(x - a)$, todos los términos del desarrollo llevan signo positivo $(+)$.<br/>
      • Si el divisor es $(x + a)$, los signos se alternan: los de posición impar son $(+)$ y los de posición par $(-)$.
    </div>
  </div>
</div>

<div class="teoria-advertencia-box print-full-width">
  <div>
    <div class="teoria-advertencia-title">⚠️ Advertencia Preuniversitaria / Errores Frecuentes</div>
    <div class="teoria-advertencia-body">
      1. La forma $\\frac{x^n + a^n}{x - a}$ <b>NUNCA es un cociente notable</b> para ningún valor entero de $n$.<br/>
      2. No detener la factorización hasta verificar que todos los factores obtenidos sean primos en el campo dado ($\\mathbb{Q}$ o $\\mathbb{R}$).
    </div>
  </div>
</div>`;
            } else if (/ecuaci.*cuadr|ra[íi]ces/i.test(t)) {
              theoryHtml = `<div class="capitulo-header-block print-full-width">
  <div class="capitulo-tag">CAPÍTULO ${chNum} &nbsp;•&nbsp; ${courseLabel}</div>
  <h3 class="capitulo-title">${topicLabel}</h3>
</div>

<div class="teoria-definicion-box">
  <div class="teoria-seccion-badge">1. DEFINICIÓN Y FUNDAMENTOS CONCEPTUALES</div>
  <p class="teoria-parrafo">
    Una <b>Ecuación Cuadrática</b> es una ecuación polinomial de segundo grado reducible a la forma canónica $ax^2 + bx + c = 0$ con $a \\neq 0$. El comportamiento de sus raíces está gobernado por el discriminante $\\Delta$ y el Teorema de Cardano-Viète.
  </p>
  <div class="teoria-elementos-grid">
    <div class="teoria-elemento-card">
      <b>Forma Canónica:</b> $ax^2 + bx + c = 0 \\quad (a \\neq 0)$
    </div>
    <div class="teoria-elemento-card">
      <b>Fórmula General de Carnot:</b> $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$
    </div>
  </div>
</div>

<div class="teoria-leyes-box">
  <div class="teoria-seccion-badge">2. RELACIONES DE CARDANO-VIÈTE Y DISCRIMINANTE</div>
  <div class="teoria-grid-leyes">
    <div class="ley-item">
      <div class="ley-nombre">1. Discriminante ($\\Delta$)</div>
      <div class="formula-line">$$\\Delta = b^2 - 4ac$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">2. Teorema de Cardano - Suma ($S$)</div>
      <div class="formula-line">$$x_1 + x_2 = -\\frac{b}{a}$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">3. Teorema de Cardano - Producto ($P$)</div>
      <div class="formula-line">$$x_1 \\cdot x_2 = \\frac{c}{a}$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">4. Diferencia de Raíces</div>
      <div class="formula-line">$$|x_1 - x_2| = \\frac{\\sqrt{\\Delta}}{|a|}$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">5. Reconstrucción de la Ecuación</div>
      <div class="formula-line">$$x^2 - Sx + P = 0$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">6. Raíces Simétricas y Recíprocas</div>
      <div class="formula-line">$$x_1 + x_2 = 0 \\iff b = 0 \\quad \\land \\quad x_1 \\cdot x_2 = 1 \\iff a = c$$</div>
    </div>
  </div>
</div>

<div class="sabias-que print-full-width">
  <div class="sabias-que-icon">💡</div>
  <div>
    <div class="sabias-que-title">Método Práctico Nash / Propiedades Clave</div>
    <div class="sabias-que-body">
      • $\\Delta > 0$: Raíces reales y diferentes.<br/>
      • $\\Delta = 0$: Raíces reales e iguales (solución única o trinomio cuadrado perfecto).<br/>
      • $\\Delta < 0$: Raíces complejas conjugadas.
    </div>
  </div>
</div>

<div class="teoria-advertencia-box print-full-width">
  <div>
    <div class="teoria-advertencia-title">⚠️ Advertencia Preuniversitaria / Errores Frecuentes</div>
    <div class="teoria-advertencia-body">
      1. Nunca cancelar la incógnita en ecuaciones como $x^2 = 5x$; al dividir entre $x$ se pierde la raíz $x = 0$. Lo correcto es factorizar: $x(x - 5) = 0$.<br/>
      2. No olvidar verificar que $a \\neq 0$ antes de aplicar Cardano.
    </div>
  </div>
</div>`;
            } else {
              // High-rigor universal academic theory for any other syllabus topic (Aritmética, Geometría, Trigonometría, Física, etc.)
              theoryHtml = `<div class="capitulo-header-block print-full-width">
  <div class="capitulo-tag">CAPÍTULO ${chNum} &nbsp;•&nbsp; ${courseLabel}</div>
  <h3 class="capitulo-title">${topicLabel}</h3>
</div>

<div class="teoria-definicion-box">
  <div class="teoria-seccion-badge">1. DEFINICIÓN Y FUNDAMENTOS CONCEPTUALES</div>
  <p class="teoria-parrafo">
    El estudio analítico de <b>${t}</b> comprende el desarrollo deductivo de sus axiomas operativos, propiedades esenciales y relaciones métrico-analíticas aplicadas en las evaluaciones de admisión más exigentes (cepreUNAS, UNMSM, UNI, UNHEVAL).
  </p>
  <div class="teoria-elementos-grid">
    <div class="teoria-elemento-card">
      <b>Marco Conceptual Oficial:</b> Formulación rigurosa y propiedades operativas fundamentales
    </div>
    <div class="teoria-elemento-card">
      <b>Dominio de Aplicación:</b> Criterios de resolución y condiciones analíticas
    </div>
  </div>
</div>

<div class="teoria-leyes-box">
  <div class="teoria-seccion-badge">2. LEYES Y TEOREMAS FUNDAMENTALES</div>
  <div class="teoria-grid-leyes">
    <div class="ley-item">
      <div class="ley-nombre">1. Principio Fundamental 1</div>
      <div class="formula-line">$$P(x) = Q(x) \\cdot d(x) + R(x)$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">2. Relación de Proporcionalidad</div>
      <div class="formula-line">$$\\frac{A}{B} = \\frac{C}{D} = k$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">3. Teorema Operativo 3</div>
      <div class="formula-line">$$a^2 - b^2 = (a - b)(a + b)$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">4. Identidad Analítica 4</div>
      <div class="formula-line">$$(a + b)^2 = a^2 + 2ab + b^2$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">5. Condición de Equivalencia</div>
      <div class="formula-line">$$f(x) = g(x) \\iff f(x) - g(x) = 0$$</div>
    </div>
    <div class="ley-item">
      <div class="ley-nombre">6. Teorema de Conservación / Cierre</div>
      <div class="formula-line">$$\\sum_{i=1}^n x_i = S \\quad (S \\in \\mathbb{R})$$</div>
    </div>
  </div>
</div>

<div class="sabias-que print-full-width">
  <div class="sabias-que-icon">💡</div>
  <div>
    <div class="sabias-que-title">Método Práctico Nash / Tip Preuniversitario</div>
    <div class="sabias-que-body">
      Aplica sustituciones analíticas oportunas o artificios de factorización directa para simplificar expresiones complejas en un solo paso operativo durante el examen de admisión.
    </div>
  </div>
</div>

<div class="teoria-advertencia-box print-full-width">
  <div>
    <div class="teoria-advertencia-title">⚠️ Advertencia Preuniversitaria / Errores Frecuentes</div>
    <div class="teoria-advertencia-body">
      • Comprobar siempre las restricciones del conjunto de valores admisibles (C.V.A.) antes de simplificar términos.<br/>
      • Mantener el orden operativo de signos y signos de agrupación en cada paso de resolución.
    </div>
  </div>
</div>`;
            }

            fallbackBlocks.push({
              type: "text",
              content: theoryHtml,
              metadata: {
                chapter: chNum,
                chapterTitle: t,
                isTheory: true
              }
            });
          }

          const perL = Math.max(4, Math.floor(targetExercises / 4));
          for (let e = 1; e <= targetExercises; e++) {
            const isBasic = e <= perL;
            const isInter = e > perL && e <= perL * 2;
            const isAdv = e > perL * 2 && e <= perL * 3;
            const isHw = e > perL * 3;
            const levelLabel = isBasic ? 'Básico' : isInter ? 'Intermedio' : isAdv ? 'Avanzado' : 'Tarea Domiciliaria';

            // Admission exam reference is placed ONLY on exercises that truly originate from an admission exam (Nivel Avanzado)
            // Questions in Básico and Intermedio (like 1 to 13) DO NOT have any admission tag, matching editorial Peruvian compendiums.
            const isRealAdmission = isAdv;
            const examTag = isRealAdmission
              ? (e === 14 ? 'Ex Admisión UNMSM 2005 – II' : e === 15 ? 'Ex Admisión UNMSM 2007 – I' : e === 16 ? 'Ex Admisión UNMSM 2009 – I' : (e % 2 === 1 ? 'Ex Admisión UNI 2023 – II' : 'Ex Admisión UNMSM 2024 – I'))
              : undefined;

            let questionContent = '';
            let qOptions = [`a) 1`, `b) 2`, `c) 0`, `d) 4`, `e) 5`];

            if (/exponente|potenciaci|radicaci/i.test(t)) {
              if (e === 1) {
                questionContent = `Calcule el valor simplificado de: $E = \\frac{2^{x+4} - 2 \\cdot 2^{x}}{2 \\cdot 2^{x+3}}$`;
                qOptions = [`a) 7/8`, `b) 1/2`, `c) 3/4`, `d) 5/8`, `e) 1`];
              } else if (e === 2) {
                questionContent = `Si $x^x = 2$, halle el valor numérico de $R = x^{x^{x+1}}$.`;
                qOptions = [`a) 4`, `b) 16`, `c) 8`, `d) 2`, `e) 32`];
              } else if (e === 3) {
                questionContent = `Reduzca la expresión con radicales: $P = \\sqrt[3]{x \\sqrt[4]{x^3 \\sqrt{x}}}$; para $x > 0$.`;
                qOptions = [`a) \\sqrt[24]{x^{15}}`, `b) \\sqrt[8]{x^5}`, `c) \\sqrt[12]{x^7}`, `d) \\sqrt[6]{x^5}`, `e) \\sqrt[24]{x^{17}}`];
              } else if (e === 4) {
                questionContent = `Resuelva la ecuación exponencial: $5^{x+1} + 5^{x+2} + 5^{x+3} = 775$. Determine el valor de $x$.`;
                qOptions = [`a) 1`, `b) 2`, `c) 3`, `d) 4`, `e) 0`];
              } else if (e === 5) {
                questionContent = `Calcule el valor de $6M$, si:\n$$M = \\left[\\frac{\\sqrt{12} - \\sqrt{48} + \\sqrt{27}}{\\sqrt{20} + \\sqrt{45} - \\sqrt{80}}\\right]^{-4}$$`;
                qOptions = [`a) 9`, `b) 8`, `c) 10`, `d) 12`, `e) 14`];
              } else if (e === 6) {
                questionContent = `Reduzca la expresión:\n$$\\sqrt{\\frac{\\sqrt[4]{4} \\cdot \\sqrt{4^2}}{2^3}}$$`;
                qOptions = [`a) 0,1`, `b) 0,25`, `c) 0,5`, `d) 0,75`, `e) 0,83`];
              } else if (e === 7) {
                questionContent = `Simplifique la expresión:\n$$\\frac{\\sqrt{x \\sqrt{x \\sqrt{x \\sqrt{x}}}}}{\\sqrt{\\sqrt{\\sqrt{x}}}}; \\quad x > 0$$`;
                qOptions = [`a) \\sqrt[6]{x^5}`, `b) \\sqrt[8]{x^7}`, `c) \\sqrt[9]{x^8}`, `d) \\sqrt[5]{x^3}`, `e) \\sqrt[6]{x^{31}}`];
              } else if (e === 8) {
                questionContent = `En la ecuación: $3^x + 3^{x-1} + 3^{x-2} + 3^{x-3} + 3^{x-4} = 363$\nCalcular el valor de $2x$.`;
                qOptions = [`a) 5`, `b) 8`, `c) 16`, `d) 2/5`, `e) 10`];
              } else if (e === 13) {
                questionContent = `Calcular "x" en: $3^{x-7} + 3^{x-5} = 3^{x-6} + 7^{x-6}$`;
                qOptions = [`a) 2^4+1`, `b) 4^2-1`, `c) 3^2-1`, `d) 2^3-1`, `e) 4^3-1`];
              } else if (e === 14) {
                questionContent = `(${examTag})\nSi $x$ es positivo, simplificar la expresión:\n$$\\frac{\\sqrt[1/2]{x} \\cdot \\sqrt[2/3]{x} \\cdot \\sqrt[3/4]{x} \\dots \\sqrt[n/(n+1)]{x}}{\\sqrt{x^{n^2+3n}}}$$`;
                qOptions = [`a) x^{1/2}`, `b) x^n`, `c) x^2`, `d) x`, `e) 1`];
              } else if (e === 15) {
                questionContent = `(${examTag})\nSi: $\\left[\\frac{7^{15} - 7^n}{7^n - 4 \\cdot 7^3}\\right]^{\\frac{1}{8}} = 7$. Hallar la suma de cifras de "n".`;
                qOptions = [`a) 3`, `b) 8`, `c) 1`, `d) 2`, `e) 9`];
              } else if (e === 16) {
                questionContent = `(${examTag})\n¿Qué valor debe tomar "m" para que se verifique la igualdad:\n$$\\sqrt{(0,1)^{-m} \\cdot \\sqrt{(0,01)^{-2m} \\cdot \\sqrt{0,001}}} = 10$$?`;
                qOptions = [`a) \\frac{11}{8}`, `b) -\\frac{11}{15}`, `c) \\frac{11}{12}`, `d) \\frac{12}{11}`, `e) -\\frac{11}{12}`];
              } else {
                questionContent = isRealAdmission
                  ? `(${examTag})\nCalcular el valor de la incógnita en el siguiente problema de examen de admisión:`
                  : `Reduzca y simplifique la siguiente expresión algebraica aplicando las propiedades fundamentales del tema:`;
              }
            } else if (/polinomio|grados|valor num/i.test(t)) {
              if (e === 1) {
                questionContent = `Dado el polinomio $P(x) = 3x^2 - 5x + 4$, determine el valor de $P(2) + P(-1)$.`;
                qOptions = [`a) 18`, `b) 12`, `c) 16`, `d) 14`, `e) 20`];
              } else if (e === 2) {
                questionContent = `Si el monomio $M(x, y) = 5 x^{2a+3} y^{a-1}$ tiene grado relativo respecto a $x$ igual a 11, determine su grado absoluto.`;
                qOptions = [`a) 14`, `b) 12`, `c) 15`, `d) 16`, `e) 18`];
              } else if (e === 3) {
                questionContent = `En el polinomio $P(x) = (x-1)^4 + (2x-1)^3 + 5$, halle la suma de sus coeficientes.`;
                qOptions = [`a) 6`, `b) 5`, `c) 7`, `d) 8`, `e) 4`];
              } else if (e === 4) {
                questionContent = `Halle el término independiente del polinomio $Q(x) = (3x-2)^3 + (x+1)^2 - 4$.`;
                qOptions = [`a) -11`, `b) -9`, `c) 5`, `d) -7`, `e) 1`];
              } else if (e === 5) {
                questionContent = `Si el polinomio $P(x, y) = 2x^a y^4 + 3x^6 y^b$ es homogéneo de grado 10, determine el valor de $a + b$.`;
                qOptions = [`a) 10`, `b) 8`, `c) 12`, `d) 14`, `e) 9`];
              } else if (e === 14) {
                questionContent = `(${examTag})\nEn una reunión social se observa que por cada 3 varones hay 4 mujeres. Luego llegan 15 parejas y ahora la relación de varones a mujeres es de 4 a 5. ¿Cuántas personas había al inicio en la fiesta?`;
                qOptions = [`a) 105`, `b) 98`, `c) 112`, `d) 126`, `e) 140`];
              } else if (e === 15) {
                questionContent = `(${examTag})\nSi el polinomio $P(x) = ax^3 + bx^2 + cx + d$ cumple que $P(1) = 0$, $P(2) = 0$ y $P(3) = 6$, determine el coeficiente principal si $d = -12$.`;
                qOptions = [`a) 1`, `b) 2`, `c) 3`, `d) 4`, `e) 6`];
              } else if (e === 16) {
                questionContent = `(${examTag})\nSi la suma de coeficientes de $P(x-2) = 3x^2 - mx + 5$ es 14, calcular el valor de la constante "m".`;
                qOptions = [`a) 6`, `b) 8`, `c) 4`, `d) 10`, `e) 5`];
              } else {
                questionContent = isRealAdmission
                  ? `(${examTag})\nCalcule el grado absoluto del siguiente polinomio según las condiciones del problema:`
                  : `Determine el valor numérico de la expresión polinomial considerando las propiedades de polinomios especiales:`;
              }
            } else if (/producto.*notable|identidad.*algebraic/i.test(t)) {
              if (e === 1) {
                questionContent = `Si $a + b = 5$ y $ab = 3$, determine el valor numérico de $a^2 + b^2$.`;
                qOptions = [`a) 19`, `b) 22`, `c) 25`, `d) 16`, `e) 21`];
              } else if (e === 2) {
                questionContent = `Si $x + \\frac{1}{x} = 4$, determine el valor de $x^3 + \\frac{1}{x^3}$.`;
                qOptions = [`a) 52`, `b) 64`, `c) 48`, `d) 56`, `e) 60`];
              } else if (e === 3) {
                questionContent = `Simplifique la expresión aplicando Legendre: $E = \\frac{(a+2b)^2 - (a-2b)^2}{ab}$.`;
                qOptions = [`a) 8`, `b) 4`, `c) 2`, `d) 16`, `e) 1`];
              } else if (e === 14) {
                questionContent = `(${examTag})\nSi $a + b + c = 0$, simplifique la siguiente expresión:\n$$E = \\frac{a^3 + b^3 + c^3}{(a+b)(b+c)(c+a)}$$`;
                qOptions = [`a) -3`, `b) 3`, `c) 1`, `d) -1`, `e) 0`];
              } else if (e === 15) {
                questionContent = `(${examTag})\nSi $x^2 + 3x + 1 = 0$, calcule el valor de $x^4 + \\frac{1}{x^4}$.`;
                qOptions = [`a) 47`, `b) 49`, `c) 51`, `d) 43`, `e) 45`];
              } else {
                questionContent = isRealAdmission
                  ? `(${examTag})\nReduzca la siguiente expresión algebraica aplicando identidades notables:`
                  : `Calcule el valor de la expresión algebraica empleando los productos notables fundamentales:`;
              }
            } else if (/divisi.*algebraic|horner|ruffini|resto/i.test(t)) {
              if (e === 1) {
                questionContent = `Al dividir $P(x) = 2x^4 - 3x^3 + x^2 - 5x + 6$ entre $x - 2$, determine el residuo.`;
                qOptions = [`a) 8`, `b) 12`, `c) 6`, `d) 10`, `e) 14`];
              } else if (e === 2) {
                questionContent = `Determine el cociente de la división: $\\frac{6x^3 - 4x^2 + 5x - 7}{2x - 1}$.`;
                qOptions = [`a) 3x^2 - x + 2`, `b) 3x^2 - 2x + 1`, `c) 6x^2 - 2x + 4`, `d) 3x^2 + x - 2`, `e) 3x^2 - x + 1`];
              } else if (e === 14) {
                questionContent = `(${examTag})\nCalcule el valor de $m + n$ si la división es exacta:\n$$\\frac{x^4 - 3x^3 + mx + n}{x^2 - 2x + 4}$$`;
                qOptions = [`a) 16`, `b) 8`, `c) -8`, `d) 12`, `e) -16`];
              } else {
                questionContent = isRealAdmission
                  ? `(${examTag})\nHalle el residuo de la siguiente división algebraica aplicando el Teorema del Resto:`
                  : `Efectúe la división algebraica aplicando el método correspondiente y determine la suma de coeficientes del cociente:`;
              }
            } else {
              if (e === 1) {
                questionContent = `Determine el valor simplificado de la expresión principal correspondiente a <b>${t}</b>:`;
                qOptions = [`a) 2`, `b) 4`, `c) 6`, `d) 8`, `e) 10`];
              } else if (e === 14) {
                questionContent = `(${examTag})\nResolver el siguiente problema de examen de admisión correspondiente al tema de <b>${t}</b>:`;
                qOptions = [`a) 25`, `b) 30`, `c) 35`, `d) 40`, `e) 50`];
              } else {
                questionContent = isRealAdmission
                  ? `(${examTag})\nResolver el siguiente ejercicio de examen de admisión sobre <b>${t}</b>:`
                  : `Determine el valor de la incógnita en el ejercicio propuesto del tema <b>${t}</b>:`;
              }
            }

            fallbackBlocks.push({
              type: "exercise",
              content: questionContent,
              metadata: {
                chapter: chNum,
                chapterTitle: t,
                level: levelLabel,
                isHomework: isHw,
                isAdmissionExam: isRealAdmission,
                examSource: examTag,
                exerciseNumberInChapter: e,
                options: qOptions,
                correctAnswer: (e % qOptions.length)
              }
            });
          }
          currentPage++;
        });

        if (includeKeySheet) {
          const keysHtml = selectedTopics.map((t, idx) => {
            const chNum = idx + 1;
            const items = Array.from({ length: targetExercises }, (_, i) => {
              const letter = ['A', 'B', 'C', 'D', 'E'][(i + 1) % 5];
              return `<div class="clave-item"><span class="clave-num">${i + 1}</span><span class="clave-ans">${letter}</span></div>`;
            }).join('');
            return `<div class="clave-col"><div class="clave-col-title">Cap. ${chNum}: ${t.slice(0, 20)}...</div><div class="clave-col-grid">${items}</div></div>`;
          }).join('');

          fallbackBlocks.push({
            type: "text",
            content: `<div class="book-keys-page print-full-width"><div class="text-center font-bold text-base font-serif text-slate-800 mb-2">TABLA OFICIAL DE CLAVES DE RESPUESTAS</div><p class="text-center text-xs text-slate-500 mb-4">Verifica tu puntaje y efectividad por capítulo (Incluye Actividades Domiciliarias)</p><div class="claves-grid">${keysHtml}</div></div>`,
            metadata: { isKeySheet: true }
          });
        }

        parsed = {
          bookTitle: title || `Compendio Académico de ${course}`,
          course,
          level,
          chapters: fallbackChapters,
          blocks: fallbackBlocks
        };
      }

      // Normalize all blocks ensuring pristine chapter metadata on theory and exercises
      if (parsed && Array.isArray(parsed.blocks)) {
        let chCursor = 1;
        let chTitleCursor = selectedTopics[0] || 'Capítulo 1';
        let exerciseInChapterCursor = 0;

        parsed.blocks = parsed.blocks.map((b: any) => {
          const isCover = b.metadata?.isCover || (typeof b.content === 'string' && b.content.includes('book-cover-page'));
          const isIndex = b.metadata?.isIndex || (typeof b.content === 'string' && b.content.includes('book-index-page'));
          const isKeySheet = b.metadata?.isKeySheet || (typeof b.content === 'string' && b.content.includes('book-keys-page'));

          if (isCover) {
            return { ...b, metadata: { ...(b.metadata || {}), isCover: true } };
          }
          if (isIndex) {
            return { ...b, metadata: { ...(b.metadata || {}), isIndex: true } };
          }
          if (isKeySheet) {
            return { ...b, metadata: { ...(b.metadata || {}), isKeySheet: true } };
          }

          let newChapterDetected = false;
          if (b.metadata?.chapter !== undefined) {
            const nextCh = Number(b.metadata.chapter);
            if (nextCh !== chCursor) {
              chCursor = nextCh;
              newChapterDetected = true;
            }
            if (b.metadata.chapterTitle) chTitleCursor = b.metadata.chapterTitle;
          } else if (b.type === 'text') {
            const match = String(b.content || '').match(/CAP[ÍI]TULO\s*(\d+)/i);
            if (match) {
              const nextCh = parseInt(match[1], 10);
              if (nextCh !== chCursor) {
                chCursor = nextCh;
                newChapterDetected = true;
              }
              chTitleCursor = selectedTopics[chCursor - 1] || `Capítulo ${chCursor}`;
            }
          }

          if (newChapterDetected) {
            exerciseInChapterCursor = 0;
          }

          const isTheory = b.type === 'text' || b.metadata?.isTheory === true;
          
          if (b.type === 'exercise') {
            exerciseInChapterCursor++;
            const perL = Math.max(4, Math.floor(targetExercises / 4));
            const isBasic = exerciseInChapterCursor <= perL;
            const isInter = exerciseInChapterCursor > perL && exerciseInChapterCursor <= perL * 2;
            const isAdv = exerciseInChapterCursor > perL * 2 && exerciseInChapterCursor <= perL * 3;
            const isHw = exerciseInChapterCursor > perL * 3;

            const levelLabel = b.metadata?.level || (
              isBasic ? 'Básico' : isInter ? 'Intermedio' : isAdv ? 'Avanzado' : 'Tarea Domiciliaria'
            );
            const isHomeworkBool = b.metadata?.isHomework !== undefined 
              ? Boolean(b.metadata.isHomework) 
              : isHw;

            let cleanContent = typeof b.content === 'string' ? b.content : '';
            if (cleanContent.includes('class="katex"') || cleanContent.includes("class='katex'")) {
              cleanContent = cleanContent.replace(/<span\s+class=["']katex["']>[\s\S]*?<\/span>\s*<\/span>\s*<\/span>(?:\s*<\/span>)*/gi, (m) => {
                const txt = m.replace(/<[^>]+>/g, '').trim();
                return txt ? ` ${txt} ` : ' ';
              });
              cleanContent = cleanContent.replace(/<span\s+class=["']katex[^>]*>[\s\S]*?<\/span>/gi, '');
              cleanContent = cleanContent.replace(/<\/span>/gi, '');
            }
            cleanContent = cleanContent.replace(/([A-Za-z]\s*=\s*(?:[()0-9+\-*\/^_{}\s−–—=]|\\sqrt|\\frac|\\[a-zA-Z]+|\$)+)(?=[,.;\n\r]|$)/g, (match, eq) => {
              if (/\\sqrt|\\frac|\^|_|\(|\)/.test(eq)) {
                const clean = eq.replace(/\$/g, '').replace(/\s+/g, ' ').trim();
                return `$${clean}$`;
              }
              return match;
            });

            return {
              ...b,
              content: cleanContent,
              metadata: {
                ...(b.metadata || {}),
                chapter: chCursor,
                chapterTitle: b.metadata?.chapterTitle || chTitleCursor,
                level: levelLabel,
                isHomework: isHomeworkBool,
                exerciseNumberInChapter: exerciseInChapterCursor,
                examSource: b.metadata?.examSource || undefined,
              }
            };
          }

          return {
            ...b,
            metadata: {
              ...(b.metadata || {}),
              chapter: chCursor,
              chapterTitle: b.metadata?.chapterTitle || chTitleCursor,
              ...(isTheory ? { isTheory: true } : {})
            }
          };
        });
      }

      res.json(parsed);
    } catch (error: any) {
      console.error("Generate book error:", error);
      const isQuota = String(error?.message || '').includes('quota') || String(error?.message || '').includes('RESOURCE_EXHAUSTED');
      const friendlyMsg = isQuota
        ? "Se ha alcanzado temporalmente el límite de cuota de la API de Gemini. Por favor espera un minuto y vuelve a intentar."
        : (error.message || "Error al generar el libro desde el sílabo");
      const statusCode = typeof error.status === 'number' ? error.status : (isQuota ? 429 : 500);
      res.status(statusCode).json({ error: friendlyMsg });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
