/**
 * Utility functions for mathematics detection, formatting, and rendering
 */

export interface ParsedOption {
  isMath: boolean;
  mathCode: string;
  displayValue: string;
}

/**
 * Parses an option string to determine if it is a mathematical expression
 * and extracts the clean LaTeX formula without dollar signs.
 */
export function parseOptionMath(raw: string): ParsedOption {
  if (!raw || typeof raw !== 'string') {
    return { isMath: false, mathCode: '', displayValue: '' };
  }

  let clean = raw.trim();

  // Strip redundant leading "a) ", "b) " if user typed it into the input
  clean = clean.replace(/^[A-Ea-e]\)\s*/, '');

  // If already wrapped in $...$ or $$...$$
  const dollarMatch = clean.match(/^\${1,2}([\s\S]*?)\${1,2}$/);
  if (dollarMatch) {
    const math = dollarMatch[1].trim();
    return {
      isMath: true,
      mathCode: math,
      displayValue: math,
    };
  }

  // Check if it contains LaTeX commands or common math notations
  const hasLatex = /\\(frac|sqrt|sin|cos|tan|csc|sec|cot|alpha|beta|gamma|theta|lambda|pi|pm|times|div|le|ge|neq|approx|circ|cdot|infty|overline|text)/.test(clean);
  const hasMathExpr = /[\^_]\{?[a-zA-Z0-9+-]+\}?/.test(clean) || (/[\/\^]/.test(clean) && /[a-zA-Z0-9]/.test(clean));

  if (hasLatex || hasMathExpr) {
    return {
      isMath: true,
      mathCode: clean,
      displayValue: clean,
    };
  }

  return {
    isMath: false,
    mathCode: '',
    displayValue: clean,
  };
}

/**
 * Automatically wraps bare LaTeX commands in $...$ if not already enclosed in math delimiters.
 */
export function autoWrapLatexInText(text: string): string {
  if (!text) return '';

  // If already contains $ or $$, check if there are also loose unescaped commands
  if (!text.includes('$')) {
    const isPureMath = /\\(frac|sqrt|sin|cos|tan|csc|sec|cot|alpha|beta|theta|pi|pm|times|div|le|ge|neq|approx|circ|cdot)/.test(text) ||
                       (/^[-+*/=0-9a-zA-Z\s\(\)\^_{}\\]+$/.test(text) && /[\^_]/.test(text));
    if (isPureMath) {
      return `$${text}$`;
    }
  }

  return text;
}
