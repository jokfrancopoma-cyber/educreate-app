import React from 'react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export interface TextWithMathProps {
  text: string;
  inline?: boolean;
  className?: string;
}

/**
 * Pre-processes text and HTML to ensure all mathematical formulas ($$...$$ and $...$)
 * are rendered into genuine KaTeX symbols, removing raw code blocks, code fences, and monospace artifacts.
 */
export function renderMathInText(rawText: string): string {
  if (!rawText) return '';

  let updated = String(rawText);

  // 1. Strip accidental literal \n, /n, \r, or n\ at the very start of the text
  updated = updated.replace(/^(?:\s*\\+n|\s*\/+n|\s*\\+r|\s*n\\|\s*[\r\n])+/gi, '');

  // Convert literal \n followed by a capital letter or sentence punctuation to real newline
  updated = updated.replace(/\\n(?=[A-ZÁÉÍÓÚ¿¡\s"«(])/g, '\n');

  // 1b. Unescape HTML entities if text arrived escaped from AI JSON (e.g. &lt;div class=...)
  if (updated.includes('&lt;') && updated.includes('&gt;')) {
    updated = updated
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
  }

  // 2. Remove accidental Markdown code fences (```html, ```latex, ```markdown, etc.)
  updated = updated.replace(/```(?:html|latex|markdown|xml|json|tex|math)?\s*\n?([\s\S]*?)\n?```/gi, '$1');
  updated = updated.replace(/^```[a-z]*\s*\n?/i, '').replace(/\n?```\s*$/i, '');

  // 3. Remove 4+ space leading indentation on lines to PREVENT Markdown from turning them into <pre><code> blocks!
  updated = updated.replace(/^[ \t]{4,}(<[\s\S]*?>)/gm, '$1');
  updated = updated.replace(/^[ \t]{4,}/gm, '  ');

  // 4. Remove font-mono from around math or LaTeX to avoid raw programmer code appearance
  updated = updated.replace(/\bfont-mono\b/g, 'font-serif');

  // 5. Replace legacy header placeholders
  updated = updated.replace(
    /<div class="ficha-title">\s*Recursos Didácticos\s*<\/div>/gi,
    `<div class="ficha-header-top"><img src="/logo_nash.png" alt="Logo Academia John Nash" class="nash-header-logo" /><div class="nash-header-info"><div class="nash-academy-name">Academia John Nash</div><div class="nash-slogan">Creemos en tu esfuerzo</div></div></div>`
  );
  updated = updated.replace(/Recursos Didácticos/gi, 'Academia John Nash');

  // 5b. Smart repair for legacy combined theory cards (e.g., "PRODUCTO Y COCIENTE DE BASES IGUALES")
  // Prevents horizontal clipping by splitting combined titles and formulas into stacked lines with individual labels
  updated = updated.replace(
    /<div class=['"]ley-item['"]>\s*<span class=['"]ley-nombre['"]>\s*PRODUCTO Y COCIENTE DE BASES IGUALES\s*<\/span>\s*[\$\$]{1,2}([\s\S]*?)[\$\$]{1,2}\s*<\/div>/gi,
    `<div class='ley-item'><div class='ley-nombre'>Producto de Bases Iguales</div><div class='formula-line'>$$a^m \\cdot a^n = a^{m+n}$$</div><div class='ley-nombre mt-1.5'>Cociente de Bases Iguales</div><div class='formula-line'>$$\\frac{a^m}{a^n} = a^{m-n} \\quad (a \\neq 0)$$</div></div>`
  );
  updated = updated.replace(
    /<div class=['"]ley-item['"]>\s*<span class=['"]ley-nombre['"]>\s*POTENCIA DE POTENCIA Y EXPONENTE NEGATIVO\s*<\/span>\s*[\$\$]{1,2}([\s\S]*?)[\$\$]{1,2}\s*<\/div>/gi,
    `<div class='ley-item'><div class='ley-nombre'>Potencia de Potencia</div><div class='formula-line'>$$(a^m)^n = a^{m \\cdot n}$$</div><div class='ley-nombre mt-1.5'>Exponente Negativo</div><div class='formula-line'>$$a^{-n} = \\frac{1}{a^n} \\quad (a \\neq 0)$$</div></div>`
  );
  updated = updated.replace(
    /<div class=['"]ley-item['"]>\s*<span class=['"]ley-nombre['"]>\s*EXPONENTE FRACCIONARIO Y RADICALES\s*<\/span>\s*[\$\$]{1,2}([\s\S]*?)[\$\$]{1,2}\s*<\/div>/gi,
    `<div class='ley-item'><div class='ley-nombre'>Exponente Fraccionario</div><div class='formula-line'>$$a^{\\frac{m}{n}} = \\sqrt[n]{a^m}$$</div><div class='ley-nombre mt-1.5'>Raíz de un Producto</div><div class='formula-line'>$$\\sqrt[n]{a \\cdot b} = \\sqrt[n]{a} \\cdot \\sqrt[n]{b}$$</div></div>`
  );
  updated = updated.replace(
    /<div class=['"]ley-item['"]>\s*<span class=['"]ley-nombre['"]>\s*PRINCIPIO DE IGUALDAD DE BASES Y ANALOG[ÍI]A\s*<\/span>\s*[\$\$]{1,2}([\s\S]*?)[\$\$]{1,2}\s*<\/div>/gi,
    `<div class='ley-item'><div class='ley-nombre'>Igualdad de Bases</div><div class='formula-line'>$$a^x = a^y \\implies x = y \\quad (a > 0, a \\neq 1)$$</div><div class='ley-nombre mt-1.5'>Por Analogía o Semejanza</div><div class='formula-line'>$$x^x = a^a \\implies x = a$$</div></div>`
  );

  // 5c. Clean up any serialized KaTeX HTML spans that may have contaminated raw text
  if (updated.includes('class="katex"') || updated.includes("class='katex'")) {
    updated = updated.replace(/<span\s+class=["']katex["']>[\s\S]*?<\/span>\s*<\/span>\s*<\/span>(?:\s*<\/span>)*/gi, (match) => {
      const text = match.replace(/<[^>]+>/g, '').trim();
      return text ? ` ${text} ` : ' ';
    });
    updated = updated.replace(/<span\s+class=["']katex[^>]*>[\s\S]*?<\/span>/gi, '');
    updated = updated.replace(/<\/span>/gi, '');
  }

  // 5d. Clean up any accidental raw katex-error span strings from previous renders
  updated = updated.replace(/<span\s+class=["']katex-error["'][^>]*>([\s\S]*?)<\/span>/gi, '$1');

  // 5e. Automatically repair corrupted KaTeX error fragments or damaged quadratic formulas
  if (
    updated.includes('in math mode') ||
    updated.includes('style="color:#cc0000"') ||
    updated.includes("style='color:#cc0000'") ||
    updated.includes('Diferencia de Ra') ||
    updated.includes('DIFERENCIA DE RA')
  ) {
    // Restore damaged Diferencia de Raíces formula from image_f8d17995
    updated = updated.replace(
      /(<div class=['"]ley-nombre['"]>\s*(?:\d+\.\s*)?Diferencia de Ra[íi]ces\s*<\/div>\s*<div class=['"]formula-line['"]>)[\s\S]*?(<\/div>\s*<\/div>)/gi,
      '$1$$|x_1 - x_2| = \\frac{\\sqrt{\\Delta}}{|a|}$$ $2'
    );
    // Remove raw KaTeX error text and style fragments
    updated = updated.replace(/&#x27;\s*in math mode at position \d+:[^<>\n$"]*/gi, '');
    updated = updated.replace(/['"]?\s*in math mode at position \d+:[^<>\n$"]*/gi, '');
    updated = updated.replace(/style=["']color:#cc0000["'][^>]*>/gi, '>');
    updated = updated.replace(/undefined/g, '');
  }

  // 5f. Unify full equations (e.g. P = (\sqrt{7} + \sqrt{3})(\sqrt{7} - \sqrt{3})) into a single clean math formula
  updated = updated.replace(/([A-Za-z]\s*=\s*(?:[()0-9+\-*\/^_{}\s−–—=]|\\sqrt|\\frac|\\[a-zA-Z]+|\$)+)(?=[,.;\n\r]|$)/g, (match, eq) => {
    // If it contains roots, fractions, or variables with operations, wrap the whole equation as $...$
    if (/\\sqrt|\\frac|\^|_|\(|\)/.test(eq)) {
      const clean = eq.replace(/\$/g, '').replace(/\s+/g, ' ').trim();
      return `$${clean}$`;
    }
    return match;
  });

  // 5g. Auto-wrap loose LaTeX fractions and roots not yet enclosed in $...$
  if (!updated.includes('<span class="katex') && !updated.includes("class='katex'")) {
    updated = updated.replace(/(?<![\$\w\\])(?:\\frac\{[^{}]*\}\{[^{}]*\}|\\sqrt\{[^{}]*\}|\\sqrt\[\d+\]\{[^{}]*\})(?![\$\w])/g, (match) => `$${match}$`);
  }

  // 6. Format multi-equation display math in $$...$$ (stacks multiple equations separated by ;)
  updated = updated.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
    let cleanFormula = formula.trim().replace(/\\\\([a-zA-Z])/g, '\\$1');
    if (
      !cleanFormula.includes('\\begin{') &&
      (cleanFormula.includes('\\quad ;') || cleanFormula.includes('; \\quad') || cleanFormula.includes(';\\quad') || cleanFormula.includes('\\qquad') || cleanFormula.includes(' ; '))
    ) {
      const parts = cleanFormula
        .split(/(?:\s*\\quad\s*;\s*\\quad\s*|\s*;\s*\\quad\s*|\s*\\quad\s*;\s*|\s*\\qquad\s*|\s*;\s*)/)
        .map(p => p.trim())
        .filter(Boolean);
      if (parts.length > 1) {
        cleanFormula = `\\begin{gathered}${parts.join(' \\\\ ')}\\end{gathered}`;
      }
    }
    try {
      return katex.renderToString(cleanFormula, {
        displayMode: true,
        throwOnError: false,
        output: 'html'
      });
    } catch {
      return match;
    }
  });

  // NOTE: Inline math ($...$) is rendered natively and safely by react-markdown with remark-math and rehype-katex.
  // Pre-rendering inline math into HTML strings via regex is avoided to prevent string corruption and invalid attribute errors.

  return updated;
}

export const TextWithMath: React.FC<TextWithMathProps> = ({ text, inline = false, className = '' }) => {
  const processedText = React.useMemo(() => {
    return renderMathInText(text);
  }, [text]);

  if (inline) {
    return (
      <span className={`markdown-body inline text-slate-900 leading-relaxed font-serif [&>p]:inline [&>p]:m-0 [&>div]:inline ${className}`}>
        <Markdown 
          remarkPlugins={[remarkMath]} 
          rehypePlugins={[rehypeRaw, [rehypeKatex, { throwOnError: false, strict: false }]]}
          components={{
            p: ({ children }: any) => <span className="inline">{children}</span>,
            div: ({ children }: any) => <span className="inline">{children}</span>,
            pre: ({ children }: any) => <span className="theory-block-clean my-0.5 not-prose inline-block">{children}</span>,
            code: ({ inline: isCodeInline, className: codeClass, children, ...props }: any) => {
              const raw = String(children || '').replace(/\n$/, '');
              return (
                <span className="font-serif italic font-medium text-slate-900 bg-sky-50/60 px-1 py-0.5 rounded border border-sky-100/80">
                  {raw}
                </span>
              );
            },
          }}
        >
          {processedText}
        </Markdown>
      </span>
    );
  }

  return (
    <div className={`markdown-body text-slate-900 leading-relaxed font-serif ${className}`}>
      <Markdown 
        remarkPlugins={[remarkMath]} 
        rehypePlugins={[rehypeRaw, [rehypeKatex, { throwOnError: false, strict: false }]]}
        components={{
          // Never render code as a programmer monospace block in pre-university academic materials
          pre: ({ children }: any) => <div className="theory-block-clean my-1 not-prose">{children}</div>,
          code: ({ inline: isCodeInline, className: codeClass, children, ...props }: any) => {
            const raw = String(children || '').replace(/\n$/, '');
            // If it's a formula or text, render cleanly with serif academic typography
            return (
              <span className="font-serif italic font-medium text-slate-900 bg-sky-50/60 px-1 py-0.5 rounded border border-sky-100/80">
                {raw}
              </span>
            );
          },
        }}
      >
        {processedText}
      </Markdown>
    </div>
  );
};
