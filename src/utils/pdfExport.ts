import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { DocumentInfo } from '../types';
import { ExamView } from '../components/ExamView';

export interface PdfExportOptions {
  pageSize?: 'a4' | 'letter' | 'legal';
  orientation?: 'portrait' | 'landscape';
  includeHeaderFooter?: boolean;
  fontSize?: number; // font size in pt, defaults to 12
  examBadge?: string;
  onProgress?: (status: string, current?: number, total?: number) => void;
  signal?: AbortSignal;
}

/**
 * Exports the document to a high-resolution, 2-column Pre-University Exam PDF
 * guaranteeing ZERO sliced questions or broken layouts.
 * Supports graceful cancellation at any point via AbortSignal.
 */
export async function exportToPdf(
  doc: DocumentInfo,
  options: PdfExportOptions = {}
): Promise<boolean> {
  const {
    pageSize = 'a4',
    orientation = 'portrait',
    fontSize = 11.5,
    onProgress,
    signal,
  } = options;

  let stagingDiv: HTMLDivElement | null = null;
  let reactRoot: any = null;

  try {
    if (signal?.aborted) {
      throw new DOMException('Descarga cancelada por el usuario', 'AbortError');
    }

    onProgress?.('Preparando maquetación de examen preuniversitario...', 0, 1);

    // Wait for KaTeX and custom fonts to be ready
    if (document.fonts) {
      await document.fonts.ready;
    }

    if (signal?.aborted) {
      throw new DOMException('Descarga cancelada por el usuario', 'AbortError');
    }

    // For exact A4 printing, ALWAYS generate paginated A4 pages via the off-screen staging area
    onProgress?.('Preparando maquetación de libro en páginas A4 exactas...', 0, 1);
    stagingDiv = document.createElement('div');
    stagingDiv.id = 'pdf-export-staging-area';
    stagingDiv.style.position = 'fixed';
    stagingDiv.style.left = '-10000px';
    stagingDiv.style.top = '0px';
    stagingDiv.style.width = '820px';
    stagingDiv.style.backgroundColor = '#ffffff';
    stagingDiv.style.zIndex = '-99999';
    stagingDiv.style.pointerEvents = 'none';
    document.body.appendChild(stagingDiv);

    reactRoot = createRoot(stagingDiv);
    reactRoot.render(
      React.createElement(ExamView, {
        document: doc,
        fontSize: fontSize,
        interactive: false,
        forcePaginated: true, // Forces all authentic A4 pages
        watermark: doc.watermark,
        margins: doc.margins,
      })
    );

    // Give KaTeX and math rendering time to finish typesetting, with cancellation awareness
    await new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        return reject(new DOMException('Descarga cancelada por el usuario', 'AbortError'));
      }
      const timer = setTimeout(resolve, 550);
      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMException('Descarga cancelada por el usuario', 'AbortError'));
      }, { once: true });
    });

    if (signal?.aborted) {
      throw new DOMException('Descarga cancelada por el usuario', 'AbortError');
    }

    const pageElements: HTMLElement[] = Array.from(stagingDiv.querySelectorAll('.exam-page')) as HTMLElement[];

    if (pageElements.length === 0) {
      throw new Error('No se pudieron generar las páginas del libro para exportar en A4.');
    }

    const totalPages = pageElements.length;
    onProgress?.(`Iniciando captura de alta definición (${totalPages} ${totalPages === 1 ? 'página' : 'páginas'})...`, 0, totalPages);

    // Base dimensions in mm
    let baseWidthMM = 210;
    let baseHeightMM = 297;
    
    if (pageSize === 'letter') {
      baseWidthMM = 215.9;
      baseHeightMM = 279.4;
    } else if (pageSize === 'legal') {
      baseWidthMM = 215.9;
      baseHeightMM = 355.6;
    }

    const pdfWidthMM = orientation === 'portrait' ? baseWidthMM : baseHeightMM;
    const pdfHeightMM = orientation === 'portrait' ? baseHeightMM : baseWidthMM;

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: pageSize,
      compress: true,
    });

    for (let i = 0; i < totalPages; i++) {
      if (signal?.aborted) {
        throw new DOMException('Descarga cancelada por el usuario', 'AbortError');
      }

      const pageEl = pageElements[i];
      onProgress?.(`Procesando Página ${i + 1} de ${totalPages} en formato A4...`, i + 1, totalPages);

      // Dynamically measure actual rendered height to prevent cutting off any content or formulas
      const pageRect = pageEl.getBoundingClientRect();
      const actualHeight = Math.max(1160, Math.ceil(Math.max(pageEl.scrollHeight || 0, pageEl.offsetHeight || 0, pageRect.height || 0)));
      const actualWidth = 820;

      // Capture the individual page with 2x retina clarity matching full height
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: actualWidth,
        height: actualHeight,
        windowWidth: actualWidth,
        windowHeight: actualHeight,
      });

      if (signal?.aborted) {
        throw new DOMException('Descarga cancelada por el usuario', 'AbortError');
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.96);

      if (i > 0) {
        pdf.addPage([pdfWidthMM, pdfHeightMM], orientation);
      }

      // Render full bleed exact A4 page (210mm x 297mm) preserving entire content
      pdf.addImage(
        imgData,
        'JPEG',
        0,
        0,
        pdfWidthMM,
        pdfHeightMM,
        undefined,
        'FAST'
      );
    }

    if (signal?.aborted) {
      throw new DOMException('Descarga cancelada por el usuario', 'AbortError');
    }

    onProgress?.('¡Descargando archivo PDF!', totalPages, totalPages);

    const sanitizedTitle = (doc.title || 'Examen_Preuniversitario')
      .trim()
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\-_ ]/g, '')
      .replace(/\s+/g, '_');

    pdf.save(`${sanitizedTitle}_Examen_2Col.pdf`);
    return true;
  } catch (error: any) {
    if (error?.name === 'AbortError' || error?.message?.toLowerCase().includes('cancelad')) {
      console.info('Exportación PDF cancelada limpiamente.');
      return false;
    }
    console.error('Error al exportar a PDF:', error);
    throw error;
  } finally {
    if (reactRoot) {
      try {
        reactRoot.unmount();
      } catch (e) {
        // ignore unmount errors
      }
    }
    if (stagingDiv && stagingDiv.parentNode) {
      stagingDiv.parentNode.removeChild(stagingDiv);
    }
  }
}
