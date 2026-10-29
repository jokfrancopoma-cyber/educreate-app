/**
 * Resilient JSON parser for LLM responses.
 * Handles unescaped LaTeX backslashes (e.g. \sqrt, \alpha, \frac, \theta, \times),
 * markdown code blocks, raw unescaped newlines/tabs inside strings, trailing commas,
 * unescaped internal double quotes inside HTML/text, and truncated JSON structures.
 */

/**
 * Sanitizes unquoted literals that LLMs often generate, such as:
 * - "correctAnswer": b, -> "correctAnswer": 1,
 * - "correctAnswer": (b), -> "correctAnswer": 1,
 * - "correctAnswer": "b", -> "correctAnswer": 1,
 * - "key": b, -> "key": "b",
 */
export function sanitizeUnquotedLiterals(input: string): string {
  if (!input || typeof input !== 'string') return '';

  // 1. Convert unquoted or parenthesized correctAnswer letters (a-e or A-E) to integer indices (0-4)
  let res = input.replace(
    /(["'](?:correctAnswer|answer|clave)["']\s*:\s*)\(?([a-eA-E])\)?(?=\s*[,}\]])/g,
    (_m, prefix, letter) => {
      const idx = { a: 0, b: 1, c: 2, d: 3, e: 4 }[letter.toLowerCase()];
      return `${prefix}${idx ?? 0}`;
    }
  );

  // 2. Convert quoted correctAnswer letters ("a"-"e") to integer indices (0-4)
  res = res.replace(
    /(["'](?:correctAnswer|answer|clave)["']\s*:\s*)["']([a-eA-E])["'](?=\s*[,}\]])/g,
    (_m, prefix, letter) => {
      const idx = { a: 0, b: 1, c: 2, d: 3, e: 4 }[letter.toLowerCase()];
      return `${prefix}${idx ?? 0}`;
    }
  );

  // 3. Convert any unquoted single letter after a colon into a quoted string (e.g. "opt": b, -> "opt": "b",)
  res = res.replace(/(:\s*)([a-zA-Z])(?=\s*[,}\]])/g, (_m, prefix, letter) => {
    return `${prefix}"${letter}"`;
  });

  return res;
}

export function repairJsonString(text: string): string {
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
        // Preserve any whitespace after colon
        while (i < text.length && /\s/.test(text[i])) {
          res += text[i];
          i++;
        }

        // Check if an unquoted word or parenthesized letter follows before a delimiter (, } ])
        const remaining = text.slice(i);
        const identMatch = remaining.match(/^(\(?([a-zA-Z_][a-zA-Z0-9_]*)\)?)(?=\s*[,}\]])/);
        if (identMatch) {
          const fullToken = identMatch[1];
          const rawWord = identMatch[2];

          // Valid standard JSON literals: true, false, null
          if (rawWord === 'true' || rawWord === 'false' || rawWord === 'null') {
            res += rawWord;
            i += fullToken.length;
            continue;
          }

          // If the preceding key is correctAnswer, answer, or clave and it's a letter a-e
          const isAnswerKey = /["'](?:correctAnswer|answer|clave)["']\s*:\s*$/i.test(res);
          if (isAnswerKey && /^[a-eA-E]$/.test(rawWord)) {
            const letterMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, e: 4 };
            res += String(letterMap[rawWord.toLowerCase()] ?? 0);
            i += fullToken.length;
            continue;
          }

          // Quote any other unquoted identifier so JSON parser accepts it
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
      // Check if preceded by an odd number of backslashes (already escaped)
      let backslashes = 0;
      let j = res.length - 1;
      while (j >= 0 && res[j] === '\\') {
        backslashes++;
        j--;
      }

      if (backslashes % 2 === 0) {
        // Not escaped by backslash. Check if this is truly the closing quote or an unescaped inner quote (HTML or text)
        let nextChar = '';
        for (let k = i + 1; k < text.length; k++) {
          if (!/\s/.test(text[k])) {
            nextChar = text[k];
            break;
          }
        }

        // In JSON, after a property key closing quote comes ':', and after a property value closing quote comes ',' or '}' or ']'
        // If the following character is NOT one of these, it is an unescaped quote inside the string (e.g. <div class="box"> or "palabra")
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

    // Literal unescaped control characters inside JSON strings
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

export function robustJsonParse<T = any>(rawText: string): T {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Texto vacío o inválido para parsear');
  }

  // 1. Direct attempt
  try {
    return JSON.parse(rawText);
  } catch {
    // Continue with resilient parsing
  }

  // Pre-sanitize unquoted literals (e.g. "correctAnswer": b, -> "correctAnswer": 1,)
  let text = sanitizeUnquotedLiterals(rawText.trim());

  try {
    return JSON.parse(text);
  } catch {
    // Continue
  }

  // 2. Strip markdown fences
  if (text.startsWith('```json')) text = text.replace(/^```json\s*/i, '');
  else if (text.startsWith('```')) text = text.replace(/^```\s*/, '');
  text = text.replace(/\s*```$/, '');

  try {
    return JSON.parse(text);
  } catch {
    // Continue
  }

  // 3. Extract JSON object or array substring if there is commentary before/after
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
  } catch {
    // Continue
  }

  // 4. Character-level repair of unescaped quotes, LaTeX backslashes, and control characters
  let repaired = repairJsonString(text);

  // 5. Remove trailing commas before } or ]
  repaired = repaired.replace(/,\s*([}\]])/g, '$1');

  try {
    return JSON.parse(repaired);
  } catch {
    // Continue to truncation recovery
  }

  // 6. Stack-based LIFO closure for truncated JSON (e.g. LLM output cut off by token limit)
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

  // If truncated in an incomplete key: e.g. , "key"
  closed = closed.replace(/,\s*"[^":]*"?\s*$/, '');
  // If truncated after colon: e.g. "key":
  closed = closed.replace(/:\s*$/, ': null');
  // Remove dangling commas at the very end
  closed = closed.replace(/,\s*$/, '');

  // Close remaining open structures in strict LIFO order
  while (stack.length > 0) {
    const top = stack.pop();
    if (top === '{') closed += '}';
    else if (top === '[') closed += ']';
  }

  return JSON.parse(closed);
}

export function safeJsonParse<T>(rawText: string, fallback: T): T {
  try {
    return robustJsonParse<T>(rawText);
  } catch (e) {
    console.warn('safeJsonParse returned fallback due to error:', e);
    return fallback;
  }
}
