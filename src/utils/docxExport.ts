import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  Header, 
  Footer, 
  PageNumber, 
  AlignmentType, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle, 
  ShadingType,
  PageOrientation
} from "docx";
import { DocumentInfo } from "../types";

function cleanMath(text: string) {
  if (!text) return "";
  // Strip block math $$ and inline math $
  let cleaned = text.replace(/\$\$(.*?)\$\$/g, '$1').replace(/\$(.*?)\$/g, '$1');
  // Clean common LaTeX commands to readable plain text in Word
  cleaned = cleaned
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, '$1√($2)')
    .replace(/\\theta/g, 'θ')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\pi/g, 'π')
    .replace(/\\pm/g, '±')
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\sin/g, 'sen')
    .replace(/\\cos/g, 'cos')
    .replace(/\\tan/g, 'tan')
    .replace(/\\csc/g, 'csc')
    .replace(/\\sec/g, 'sec')
    .replace(/\\cot/g, 'cot')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\infty/g, '∞')
    .replace(/\\circ/g, '°');
  return cleaned;
}

export const exportToDocx = async (
  docData: DocumentInfo, 
  fontSize: number = 12,
  options: { examBadge?: string } = {}
) => {
  const children: Paragraph[] = [];
  const runSize = fontSize * 2; // docx sizes are in half-points (12pt = 24 half-points)

  // Section Header banner inside the document (Title / Course)
  const subjectTitle = docData.subject ? `${docData.subject.toUpperCase()} - LIBRO DE CLASE` : "HABILIDAD LÓGICO-MATEMÁTICA";
  
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: docData.title ? docData.title.toUpperCase() : subjectTitle,
          bold: true,
          size: 24, // 12pt
          color: "0369a1", // sky-700
        }),
      ],
      spacing: { before: 120, after: 60 },
      keepNext: true,
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "EJERCICIOS DE APLICACIÓN",
          bold: true,
          size: 18, // 9pt
          color: "0f172a", // slate-900
        }),
      ],
      spacing: { after: 200 },
      keepNext: true,
    })
  );

  let exerciseCounter = 0;

  for (const block of docData.blocks) {
    const blockRunSize = (block.metadata?.fontSize ? Number(block.metadata.fontSize) : fontSize) * 2;

    if (block.type === 'text') {
      const lines = block.content.split('\n');
      for (const line of lines) {
        if (line.startsWith('# ')) {
          children.push(new Paragraph({ 
            text: cleanMath(line.replace('# ', '')), 
            heading: HeadingLevel.HEADING_2, 
            spacing: { before: 160, after: 120 },
            keepNext: true 
          }));
        } else if (line.startsWith('## ')) {
          children.push(new Paragraph({ 
            text: cleanMath(line.replace('## ', '')), 
            heading: HeadingLevel.HEADING_3, 
            spacing: { before: 140, after: 100 },
            keepNext: true 
          }));
        } else if (line.trim().length > 0) {
          const stripped = line.replace(/<[^>]*>?/gm, '').trim();
          if (stripped.length > 0) {
            children.push(new Paragraph({
              children: [new TextRun({ text: cleanMath(stripped), size: blockRunSize })],
              spacing: { after: 120 },
            }));
          }
        }
      }
    } else if (block.type === 'math') {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: cleanMath(block.content), italics: true, size: blockRunSize + 2, bold: true })],
        spacing: { before: 140, after: 140 },
        keepNext: true,
      }));
    } else if (block.type === 'graph') {
      const isGeom = block.metadata?.graphType === 'geometry' || block.content?.startsWith('geometry:');
      const label = isGeom ? `[Figura: ${block.metadata?.geometryType || 'Diagrama Geométrico'}]` : `[Gráfica: y = ${cleanMath(block.content)}]`;
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: label, bold: true, color: "0369a1", size: blockRunSize - 2 })],
        spacing: { before: 120, after: 120 },
        keepNext: true,
      }));
    } else if (block.type === 'exercise') {
      exerciseCounter++;

      // Authentic Exam Question Header: "PREGUNTA N.º 21" in bold cyan-blue (#0284c7)
      children.push(new Paragraph({
        children: [
          new TextRun({ 
            text: `PREGUNTA N.º ${exerciseCounter}`, 
            bold: true, 
            color: "0284c7", 
            size: blockRunSize + 2 
          }),
        ],
        spacing: { before: 200, after: 60 },
        keepNext: true,
        keepLines: true,
      }));

      // Question body text
      children.push(new Paragraph({
        children: [
          new TextRun({ text: cleanMath(block.content), size: blockRunSize }),
        ],
        spacing: { after: 100 },
        keepNext: true,
        keepLines: true,
      }));

      // Alternatives: A), B), C), D), E)
      if (block.metadata?.options && block.metadata.options.length > 0) {
        const cleanedOpts = block.metadata.options.map((opt: string) => {
          let optText = cleanMath(opt);
          return optText.replace(/^[A-Ea-e][\)\.]\s*/, '').trim();
        });

        const maxLen = cleanedOpts.reduce((max: number, o: string) => Math.max(max, o.length), 0);

        if (maxLen <= 14 && cleanedOpts.length === 5) {
          // Exam Format: 3 options on row 1, 2 options on row 2
          children.push(new Paragraph({
            children: [
              new TextRun({ text: "   A) ", bold: true, color: "0369a1", size: blockRunSize }),
              new TextRun({ text: `${cleanedOpts[0]}        `, size: blockRunSize }),
              new TextRun({ text: "B) ", bold: true, color: "0369a1", size: blockRunSize }),
              new TextRun({ text: `${cleanedOpts[1]}        `, size: blockRunSize }),
              new TextRun({ text: "C) ", bold: true, color: "0369a1", size: blockRunSize }),
              new TextRun({ text: `${cleanedOpts[2]}`, size: blockRunSize }),
            ],
            spacing: { after: 40 },
            keepNext: true,
            keepLines: true,
          }));
          children.push(new Paragraph({
            children: [
              new TextRun({ text: "   D) ", bold: true, color: "0369a1", size: blockRunSize }),
              new TextRun({ text: `${cleanedOpts[3]}        `, size: blockRunSize }),
              new TextRun({ text: "E) ", bold: true, color: "0369a1", size: blockRunSize }),
              new TextRun({ text: `${cleanedOpts[4]}`, size: blockRunSize }),
            ],
            spacing: { after: 200 },
            keepLines: true,
          }));
        } else if (maxLen <= 26 && cleanedOpts.length >= 4) {
          // 2 options per row
          for (let i = 0; i < cleanedOpts.length; i += 2) {
            const letter1 = String.fromCharCode(65 + i);
            const opt1 = cleanedOpts[i];
            const hasSecond = i + 1 < cleanedOpts.length;
            const letter2 = hasSecond ? String.fromCharCode(65 + i + 1) : '';
            const opt2 = hasSecond ? cleanedOpts[i + 1] : '';

            const isLastRow = i + 2 >= cleanedOpts.length;

            const runs = [
              new TextRun({ text: `   ${letter1}) `, bold: true, color: "0369a1", size: blockRunSize }),
              new TextRun({ text: `${opt1}            `, size: blockRunSize }),
            ];
            if (hasSecond) {
              runs.push(
                new TextRun({ text: `${letter2}) `, bold: true, color: "0369a1", size: blockRunSize }),
                new TextRun({ text: `${opt2}`, size: blockRunSize })
              );
            }
            children.push(new Paragraph({
              children: runs,
              spacing: { after: isLastRow ? 200 : 40 },
              keepNext: !isLastRow,
              keepLines: true,
            }));
          }
        } else {
          // 1 option per line for longer sentences
          cleanedOpts.forEach((optText: string, idx: number) => {
            const letter = String.fromCharCode(65 + idx);
            const isLast = idx === cleanedOpts.length - 1;
            children.push(new Paragraph({
              children: [
                new TextRun({ text: `   ${letter}) `, bold: true, color: "0369a1", size: blockRunSize }),
                new TextRun({ text: optText, size: blockRunSize }),
              ],
              spacing: { after: isLast ? 200 : 40 },
              keepNext: !isLast,
              keepLines: true,
            }));
          });
        }
      }
    } else if (block.type === 'image') {
      if (block.content) {
        children.push(new Paragraph({
          children: [new TextRun({ text: `[Imagen: ${block.content}]`, italics: true, color: "888888", size: runSize - 4 })],
          spacing: { before: 120, after: 120 },
          alignment: AlignmentType.CENTER,
          keepNext: true,
        }));
      }
    }
  }

  // Build the Header Table matching the Nash Banner
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "auto" },
      left: { style: BorderStyle.NONE, size: 0, color: "auto" },
      right: { style: BorderStyle.NONE, size: 0, color: "auto" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
      bottom: { style: BorderStyle.SINGLE, size: 12, color: "000000" }, // 1.5pt solid black
    },
    rows: [
      new TableRow({
        children: [
          // Left Institution info
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: { top: 40, bottom: 40, left: 120, right: 60 },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: "ACADEMIA JOHN NASH\n",
                    bold: true,
                    color: "000000",
                    size: 24, // 12pt
                  }),
                  new TextRun({
                    text: "Creemos en tu esfuerzo",
                    italics: true,
                    color: "78350f",
                    size: 20, // 10pt
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Build Footer with Centered Circular Page Number Badge
  const footerParagraph = new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text: "( ",
        bold: true,
        color: "0284c7",
        size: 18,
      }),
      new TextRun({
        children: [PageNumber.CURRENT],
        bold: true,
        color: "0284c7",
        size: 18,
      }),
      new TextRun({
        text: " )",
        bold: true,
        color: "0284c7",
        size: 18,
      }),
    ],
    spacing: { before: 100 },
  });

  // Create document configured natively with 2 COLUMNS and CENTER DIVIDER LINE!
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 }, // 0.5 in margins
            size: { 
              orientation: PageOrientation.PORTRAIT,
              width: 11906, // A4 Width
              height: 16838 // A4 Height
            },
          },
          column: {
            count: 2, // 2-column layout
            space: 576, // 0.4 in gap
            separate: true, // Native vertical dividing line!
          },
        },
        headers: {
          default: new Header({
            children: [headerTable],
          }),
        },
        footers: {
          default: new Footer({
            children: [footerParagraph],
          }),
        },
        children: children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${docData.title.replace(/\s+/g, '_')}_Examen_2Col.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
