import React, { useMemo, useState } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import { 
  FileText, 
  Download, 
  Printer, 
  Edit3, 
  Layers, 
  CheckCircle2,
  AlignJustify,
  Stamp,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { Block, DocumentInfo, WatermarkConfig, MarginConfig } from '../types';
import { TextWithMath } from './TextWithMath';
import { GraphRenderer } from './GraphRenderer';
import { parseOptionMath } from '../utils/mathUtils';
import { WatermarkModal } from './WatermarkModal';
import { MarginsModal, DEFAULT_MARGIN_CONFIG } from './MarginsModal';

export interface ExamViewProps {
  document: DocumentInfo;
  fontSize?: number;
  interactive?: boolean;
  forcePaginated?: boolean;
  onEditBlock?: (blockId: string) => void;
  onDownloadPdf?: (options?: { orientation?: 'portrait' | 'landscape'; customFontSize?: number; pageSize?: 'a4' | 'letter' | 'legal' }) => void;
  onDownloadDocx?: () => void;
  onPrintBrowser?: () => void;
  isExportingPdf?: boolean;
  watermark?: WatermarkConfig;
  onUpdateWatermark?: (config: WatermarkConfig) => void;
  margins?: MarginConfig;
  onUpdateMargins?: (config: MarginConfig) => void;
}

export interface ExamPageData {
  pageNumber: number;
  theoryBlocks: Block[];
  leftColumn: { block: Block; num: number }[];
  rightColumn: { block: Block; num: number }[];
  showSubjectBanner?: boolean;
  isCover?: boolean;
  isIndex?: boolean;
  isKeySheet?: boolean;
  chapterNumber?: number;
  chapterTitle?: string;
}

/**
 * Height estimation and balanced split algorithm to ensure left and right columns
 * finish at virtually the exact same bottom baseline without leftover blank spaces.
 */
export function splitExercisesBalanced(exercises: { block: Block; num: number }[]) {
  if (exercises.length === 0) return { left: [], right: [] };
  if (exercises.length === 1) return { left: exercises, right: [] };

  const heights = exercises.map((item) => {
    const textLen = (item.block.content || '').length;
    const optCount = item.block.metadata?.options?.length || 0;
    const maxOptLen = (item.block.metadata?.options || []).reduce(
      (m: number, o: string) => Math.max(m, (o || '').length),
      0
    );
    let optRows = 0;
    if (optCount > 0) {
      if (maxOptLen <= 13) optRows = Math.ceil(optCount / 3);
      else if (maxOptLen <= 26) optRows = Math.ceil(optCount / 2);
      else optRows = optCount;
    }
    const hasGraph =
      item.block.metadata?.graphType || item.block.content?.includes('geometry:');

    const textHeight = Math.max(24, Math.ceil(textLen / 55) * 19);
    const optHeight = optRows * 20;
    const graphHeight = hasGraph ? (item.block.metadata?.height || 200) : 0;
    return 32 + textHeight + optHeight + graphHeight + 12;
  });

  const totalHeight = heights.reduce((a, b) => a + b, 0);
  const targetHalf = totalHeight / 2;

  let currentLeftHeight = 0;
  let bestSplitIndex = 1;
  let minDiff = Infinity;

  for (let i = 1; i < exercises.length; i++) {
    currentLeftHeight += heights[i - 1];
    const diff = Math.abs(currentLeftHeight - targetHalf);
    if (diff < minDiff) {
      minDiff = diff;
      bestSplitIndex = i;
    }
  }

  return {
    left: exercises.slice(0, bestSplitIndex),
    right: exercises.slice(bestSplitIndex),
  };
}

/**
 * Splits exercises into evenly distributed batches so that no page ends up
 * with an awkward tiny tail (e.g. 1 or 2 dangling exercises leaving a whole page empty).
 */
export function paginateExerciseBatches(
  exercises: { block: Block; num: number }[],
  maxPerPage = 12
): { block: Block; num: number }[][] {
  if (exercises.length === 0) return [];
  if (exercises.length <= maxPerPage) return [exercises];

  const total = exercises.length;
  const numPages = Math.ceil(total / maxPerPage);
  const perPage = Math.ceil(total / numPages);

  const batches: { block: Block; num: number }[][] = [];
  for (let i = 0; i < total; i += perPage) {
    batches.push(exercises.slice(i, i + perPage));
  }
  return batches;
}

/**
 * Calculates how exercises and book sections are paginated across authentic 2-column A4 exam pages.
 */
export function paginateExam(
  doc: DocumentInfo,
  options: {
    exercisesPerPage?: 'auto' | 4 | 6 | 8 | 10 | 12;
    fontSize?: number;
  } = {}
): ExamPageData[] {
  const { exercisesPerPage = 'auto' } = options;

  // Detect if this document is a complete Book with cover, index, chapters, or key sheet
  const coverBlock = doc.blocks.find(
    (b) => b.metadata?.isCover || b.metadata?.section === 'cover' || b.content?.includes('book-cover-page')
  );
  const indexBlock = doc.blocks.find(
    (b) => b.metadata?.isIndex || b.metadata?.section === 'index' || b.content?.includes('book-index-page')
  );
  const keySheetBlock = doc.blocks.find(
    (b) => b.metadata?.isKeySheet || b.metadata?.section === 'keys' || b.content?.includes('book-keys-page')
  );

  const hasChapters = doc.blocks.some((b) => b.metadata?.chapter !== undefined);
  const isBook = Boolean(doc.isBook || coverBlock || indexBlock || keySheetBlock || hasChapters);

  if (!isBook) {
    // STANDARD SINGLE DOCUMENT / EXAM FLOW
    const theoryBlocks = doc.blocks.filter((b) => b.type !== 'exercise');
    const exerciseBlocks = doc.blocks.filter((b) => b.type === 'exercise');

    let exCounter = 0;
    const numberedExercises = exerciseBlocks.map((block) => {
      exCounter++;
      return { block, num: exCounter };
    });

    const pages: ExamPageData[] = [];
    let targetPerPage = 12;
    if (exercisesPerPage === 4) targetPerPage = 4;
    else if (exercisesPerPage === 6) targetPerPage = 6;
    else if (exercisesPerPage === 8) targetPerPage = 8;
    else if (exercisesPerPage === 10) targetPerPage = 10;
    else if (exercisesPerPage === 12) targetPerPage = 12;
    else {
      const hasGraphs = exerciseBlocks.some(
        (b) => b.metadata?.graphType || b.content?.includes('geometry:')
      );
      const avgLen =
        exerciseBlocks.reduce((acc, b) => acc + (b.content?.length || 0), 0) /
        Math.max(1, exerciseBlocks.length);

      if (hasGraphs || avgLen > 280) {
        targetPerPage = 8;
      } else if (avgLen > 180) {
        targetPerPage = 10;
      } else {
        targetPerPage = 12;
      }
    }

    // Balance exercises across pages to avoid awkward blank tails
    const theoryLength = theoryBlocks.reduce((acc, b) => acc + (b.content?.length || 0), 0);
    const hasLongTheory = theoryLength > 850;

    let pageNumber = 1;

    if (theoryBlocks.length > 0 && hasLongTheory) {
      // 1. Detailed theory gets its own dedicated full page
      pages.push({
        pageNumber: pageNumber++,
        theoryBlocks: theoryBlocks,
        leftColumn: [],
        rightColumn: [],
        showSubjectBanner: true,
      });

      // Exercises flow onto subsequent balanced pages
      if (numberedExercises.length > 0) {
        const batches = paginateExerciseBatches(numberedExercises, targetPerPage);
        for (const batch of batches) {
          const { left, right } = splitExercisesBalanced(batch);
          pages.push({
            pageNumber: pageNumber++,
            theoryBlocks: [],
            leftColumn: left,
            rightColumn: right,
            showSubjectBanner: false,
          });
        }
      }
    } else if (theoryBlocks.length > 0 && numberedExercises.length > 0) {
      // 2. Concise theory at top of Page 1 with initial batch of at most 4 exercises (guaranteeing zero cutoffs)
      const firstBatchSize = theoryLength < 450 ? 6 : 4;
      const firstBatch = numberedExercises.slice(0, firstBatchSize);
      const remaining = numberedExercises.slice(firstBatchSize);

      const { left: left1, right: right1 } = splitExercisesBalanced(firstBatch);
      pages.push({
        pageNumber: pageNumber++,
        theoryBlocks: theoryBlocks,
        leftColumn: left1,
        rightColumn: right1,
        showSubjectBanner: true,
      });

      if (remaining.length > 0) {
        const batches = paginateExerciseBatches(remaining, targetPerPage);
        for (const batch of batches) {
          const { left, right } = splitExercisesBalanced(batch);
          pages.push({
            pageNumber: pageNumber++,
            theoryBlocks: [],
            leftColumn: left,
            rightColumn: right,
            showSubjectBanner: false,
          });
        }
      }
    } else if (numberedExercises.length > 0) {
      // 3. Only exercises
      const batches = paginateExerciseBatches(numberedExercises, targetPerPage);
      for (const batch of batches) {
        const { left, right } = splitExercisesBalanced(batch);
        pages.push({
          pageNumber: pageNumber++,
          theoryBlocks: [],
          leftColumn: left,
          rightColumn: right,
          showSubjectBanner: pageNumber === 1,
        });
      }
    }

    if (pages.length === 0) {
      pages.push({
        pageNumber: 1,
        theoryBlocks: theoryBlocks,
        leftColumn: [],
        rightColumn: [],
        showSubjectBanner: true,
      });
    }

    return pages;
  }

  // BOOK PAGINATION FLOW
  const pages: ExamPageData[] = [];
  let pageNumber = 1;

  // 1. Cover Page
  if (coverBlock) {
    pages.push({
      pageNumber: pageNumber++,
      theoryBlocks: [coverBlock],
      leftColumn: [],
      rightColumn: [],
      showSubjectBanner: false,
      isCover: true,
    });
  }

  // 2. Index Page
  if (indexBlock) {
    pages.push({
      pageNumber: pageNumber++,
      theoryBlocks: [indexBlock],
      leftColumn: [],
      rightColumn: [],
      showSubjectBanner: false,
      isIndex: true,
    });
  }

  // Content blocks excluding standalone full-page blocks
  const contentBlocks = doc.blocks.filter(
    (b) => b !== coverBlock && b !== indexBlock && b !== keySheetBlock
  );

  // Group blocks by chapter with chapter-aware matching
  const chapterMap = new Map<number, { title?: string; theory: Block[]; exercises: Block[] }>();
  let currentChapterNum = 1;

  for (const block of contentBlocks) {
    if (block.metadata?.chapter !== undefined) {
      currentChapterNum = Number(block.metadata.chapter);
    } else if (block.type === 'text') {
      const match = String(block.content || '').match(/CAP[ÍI]TULO\s*(\d+)/i);
      if (match) {
        currentChapterNum = parseInt(match[1], 10);
      }
    }

    if (!chapterMap.has(currentChapterNum)) {
      chapterMap.set(currentChapterNum, {
        title: block.metadata?.chapterTitle,
        theory: [],
        exercises: [],
      });
    }
    const group = chapterMap.get(currentChapterNum)!;
    if (block.metadata?.chapterTitle && !group.title) {
      group.title = block.metadata.chapterTitle;
    }

    if (block.type === 'exercise') {
      group.exercises.push(block);
    } else {
      group.theory.push(block);
    }
  }

  for (const [chNum, group] of chapterMap.entries()) {
    let chapterExerciseCounter = 0;
    const numbered = group.exercises.map((block) => {
      chapterExerciseCounter++;
      return { block, num: chapterExerciseCounter };
    });

    const theoryLength = group.theory.reduce((acc, b) => acc + (b.content?.length || 0), 0);
    const hasLongTheory = theoryLength > 850;

    let targetPerPage = 12;
    if (typeof exercisesPerPage === 'number') {
      targetPerPage = exercisesPerPage;
    } else {
      const hasGraphs = group.exercises.some((b) => b.metadata?.graphType || b.content?.includes('geometry:'));
      const avgLen = group.exercises.reduce((acc, b) => acc + (b.content?.length || 0), 0) / Math.max(1, group.exercises.length);
      if (hasGraphs || avgLen > 280) targetPerPage = 8;
      else if (avgLen > 180) targetPerPage = 10;
      else targetPerPage = 12;
    }

    if (group.theory.length > 0 && hasLongTheory) {
      // 1. Detailed theory takes its own dedicated full page
      pages.push({
        pageNumber: pageNumber++,
        theoryBlocks: group.theory,
        leftColumn: [],
        rightColumn: [],
        showSubjectBanner: false,
        chapterNumber: chNum,
        chapterTitle: group.title,
      });

      // Exercises follow on subsequent pages in balanced batches
      const batches = paginateExerciseBatches(numbered, targetPerPage);
      for (const batch of batches) {
        const { left, right } = splitExercisesBalanced(batch);
        pages.push({
          pageNumber: pageNumber++,
          theoryBlocks: [],
          leftColumn: left,
          rightColumn: right,
          showSubjectBanner: false,
          chapterNumber: chNum,
          chapterTitle: group.title,
        });
      }
    } else if (group.theory.length > 0 && numbered.length > 0) {
      // 2. Concise Theory (<= 850 chars) + initial 4 exercises (2 in each column)
      // This guarantees zero page overflow and zero cutoffs in PDF export while eliminating wasted blank space!
      const firstBatchSize = theoryLength < 450 ? 6 : 4;
      const firstBatch = numbered.slice(0, firstBatchSize);
      const remainingExercises = numbered.slice(firstBatchSize);

      const { left: left1, right: right1 } = splitExercisesBalanced(firstBatch);
      pages.push({
        pageNumber: pageNumber++,
        theoryBlocks: group.theory,
        leftColumn: left1,
        rightColumn: right1,
        showSubjectBanner: false,
        chapterNumber: chNum,
        chapterTitle: group.title,
      });

      // Remaining exercises (Nivel Intermedio + Actividad Domiciliaria) flow onto subsequent pages in balanced batches
      if (remainingExercises.length > 0) {
        const remainingBatches = paginateExerciseBatches(remainingExercises, targetPerPage);
        for (const batch of remainingBatches) {
          const { left, right } = splitExercisesBalanced(batch);
          pages.push({
            pageNumber: pageNumber++,
            theoryBlocks: [],
            leftColumn: left,
            rightColumn: right,
            showSubjectBanner: false,
            chapterNumber: chNum,
            chapterTitle: group.title,
          });
        }
      }
    } else if (group.theory.length > 0) {
      // Only theory, no exercises
      pages.push({
        pageNumber: pageNumber++,
        theoryBlocks: group.theory,
        leftColumn: [],
        rightColumn: [],
        showSubjectBanner: false,
        chapterNumber: chNum,
        chapterTitle: group.title,
      });
    } else if (numbered.length > 0) {
      // Only exercises, no theory
      const batches = paginateExerciseBatches(numbered, targetPerPage);
      for (const batch of batches) {
        const { left, right } = splitExercisesBalanced(batch);
        pages.push({
          pageNumber: pageNumber++,
          theoryBlocks: [],
          leftColumn: left,
          rightColumn: right,
          showSubjectBanner: false,
          chapterNumber: chNum,
          chapterTitle: group.title,
        });
      }
    }
  }

  // 3. Final Answer Keys Page
  if (keySheetBlock) {
    pages.push({
      pageNumber: pageNumber++,
      theoryBlocks: [keySheetBlock],
      leftColumn: [],
      rightColumn: [],
      showSubjectBanner: false,
      isKeySheet: true,
    });
  }

  return pages;
}

export const ExamView: React.FC<ExamViewProps> = ({
  document: doc,
  fontSize = 12,
  interactive = true,
  forcePaginated = false,
  onEditBlock,
  onDownloadPdf,
  onDownloadDocx,
  onPrintBrowser,
  isExportingPdf = false,
  watermark: propWatermark,
  onUpdateWatermark,
  margins: propMargins,
  onUpdateMargins,
}) => {
  // Check if document is a book
  const isBookDocument = useMemo(() => {
    return Boolean(
      doc.isBook || 
      doc.blocks.some(b => b.metadata?.isCover || b.metadata?.isIndex || b.metadata?.chapter !== undefined || b.content?.includes('book-cover-page'))
    );
  }, [doc]);

  // Default to 'pages' mode for exact A4 rendering and printing
  const [layoutMode, setLayoutMode] = useState<'continuous' | 'pages'>('pages');
  const [exercisesPerPageMode, setExercisesPerPageMode] = useState<'auto' | 6 | 8 | 10 | 12>('auto');
  const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null);

  // Word-style custom watermark state
  const [showWatermarkModal, setShowWatermarkModal] = useState<boolean>(false);
  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig>(() => {
    if (propWatermark) return propWatermark;
    if (doc.watermark) return doc.watermark;
    try {
      const saved = localStorage.getItem('nash_watermark_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { type: 'default', opacity: 0.05, imageScale: 0.9, washout: true };
  });

  const handleSaveWatermark = (newConfig: WatermarkConfig) => {
    setWatermarkConfig(newConfig);
    try {
      localStorage.setItem('nash_watermark_settings', JSON.stringify(newConfig));
    } catch {}
    onUpdateWatermark?.(newConfig);
  };

  // Margins & binding gutter state for book publishing and empaste
  const [showMarginsModal, setShowMarginsModal] = useState<boolean>(false);
  const [marginsConfig, setMarginsConfig] = useState<MarginConfig>(() => {
    if (propMargins) return propMargins;
    if (doc.margins) return doc.margins;
    try {
      const saved = localStorage.getItem('nash_book_margins');
      if (saved) return JSON.parse(saved);
    } catch {}
    return isBookDocument ? DEFAULT_MARGIN_CONFIG : {
      preset: 'normal',
      marginTop: 48,
      marginBottom: 56,
      marginLeft: 40,
      marginRight: 40,
      bindingGutter: 0,
      mirrorMargins: false,
      showBindingGuide: false,
    };
  });

  const handleSaveMargins = (newConfig: MarginConfig) => {
    setMarginsConfig(newConfig);
    try {
      localStorage.setItem('nash_book_margins', JSON.stringify(newConfig));
    } catch {}
    onUpdateMargins?.(newConfig);
  };

  /**
   * Calculates authentic page paddings including vertical clearance (superior/inferior)
   * and binding gutter for empaste/anillado (mirroring odd/even pages for physical books).
   */
  const getPagePadding = (pageNumber: number) => {
    const top = marginsConfig.marginTop ?? 56;
    const bottom = marginsConfig.marginBottom ?? 64;
    const leftBase = marginsConfig.marginLeft ?? 42;
    const rightBase = marginsConfig.marginRight ?? 42;
    const gutter = marginsConfig.bindingGutter ?? 0;

    if (marginsConfig.mirrorMargins && gutter > 0) {
      const isOdd = pageNumber % 2 !== 0; // 1, 3, 5... (página impar / anverso / derecha)
      if (isOdd) {
        // Lomo a la izquierda en páginas impares
        return {
          paddingTop: `${top}px`,
          paddingBottom: `${bottom}px`,
          paddingLeft: `${leftBase + gutter}px`,
          paddingRight: `${rightBase}px`,
          gutterSide: 'left' as const,
        };
      } else {
        // Lomo a la derecha en páginas pares (2, 4, 6... reverso / izquierda)
        return {
          paddingTop: `${top}px`,
          paddingBottom: `${bottom}px`,
          paddingLeft: `${leftBase}px`,
          paddingRight: `${rightBase + gutter}px`,
          gutterSide: 'right' as const,
        };
      }
    }

    // Default unilateral gutter (e.g. spiral binding on left)
    return {
      paddingTop: `${top}px`,
      paddingBottom: `${bottom}px`,
      paddingLeft: `${leftBase + gutter}px`,
      paddingRight: `${rightBase}px`,
      gutterSide: gutter > 0 ? ('left' as const) : null,
    };
  };

  /**
   * Visual indicator on screen of the binding gutter area (no-print)
   */
  const renderBindingGuide = (gutterSide: 'left' | 'right' | null) => {
    if (!marginsConfig.showBindingGuide || !gutterSide || (marginsConfig.bindingGutter || 0) <= 0) {
      return null;
    }
    return (
      <div
        className={`absolute top-0 bottom-0 ${gutterSide === 'left' ? 'left-0 border-r' : 'right-0 border-l'} border-dashed border-amber-400 bg-amber-400/10 pointer-events-none select-none z-0 no-print flex items-center justify-center`}
        style={{ width: `${marginsConfig.bindingGutter || 30}px` }}
        title="Espacio de Empaste / Lomo Reservado"
      >
        <span className="text-[7.5px] font-bold text-amber-800 uppercase tracking-widest -rotate-90 select-none">
          EMPASTE
        </span>
      </div>
    );
  };

  const pages = useMemo(() => {
    return paginateExam(doc, { exercisesPerPage: exercisesPerPageMode, fontSize });
  }, [doc, exercisesPerPageMode, fontSize]);

  const allNumberedExercises = useMemo(() => {
    const exerciseBlocks = doc.blocks.filter((b) => b.type === 'exercise');
    let counter = 0;
    let currentChapter: number | string | undefined = undefined;

    return exerciseBlocks.map((block) => {
      if (isBookDocument) {
        const ch = block.metadata?.chapter;
        if (ch !== undefined && ch !== currentChapter) {
          currentChapter = ch;
          counter = 0;
        }
      }
      counter++;
      return { block, num: counter };
    });
  }, [doc.blocks, isBookDocument]);

  const continuousColumns = useMemo(() => {
    return splitExercisesBalanced(allNumberedExercises);
  }, [allNumberedExercises]);

  const theoryBlocks = useMemo(() => {
    return doc.blocks.filter((b) => b.type !== 'exercise');
  }, [doc.blocks]);

  const hasCustomTitle = useMemo(() => {
    if (!doc.title) return false;
    const lower = doc.title.toLowerCase();
    return (
      !lower.includes('untitled') &&
      !lower.includes('sin título') &&
      !lower.includes('sin titulo') &&
      !lower.includes('documento sin')
    );
  }, [doc.title]);

  const hasFichaInTheory = useMemo(() => {
    return doc.blocks.some(
      (b) =>
        b.type === 'text' &&
        (b.content?.includes('ficha-header') ||
          b.content?.includes('ficha-main-title') ||
          b.content?.includes('ficha-badge'))
    );
  }, [doc.blocks]);

  const renderExerciseContent = (block: Block, num: number) => {
    const optionsList: string[] = block.metadata?.options || [];
    const maxOptLength = optionsList.reduce(
      (max: number, o: string) => Math.max(max, (o || '').length),
      0
    );

    let optionLayout = 'grid grid-cols-3 gap-x-2.5 gap-y-0.5';
    if (maxOptLength > 24) {
      optionLayout = 'flex flex-col space-y-0.5';
    } else if (maxOptLength > 12) {
      optionLayout = 'grid grid-cols-2 gap-x-2.5 gap-y-0.5';
    }

    // Authentic Pre-University Admission Exam Detection:
    // Admission exam reference is placed ONLY on exercises that truly originate from an admission exam
    const contentStr = typeof block.content === 'string' ? block.content : '';
    const rawLevel = String(block.metadata?.level || '').toUpperCase();
    const isHomework = Boolean(
      block.metadata?.isHomework || 
      rawLevel.includes('DOMICILIARIA') || 
      rawLevel.includes('TAREA')
    );
    const isAdvanced = !isHomework && (rawLevel.includes('AVANZADO') || (!rawLevel && num >= 14));

    // Check for explicit admission exam match in text: (Ex Admisión ...), (Admisión ...), (Examen de Admisión ...)
    const admissionTextMatch = contentStr.match(/^\s*(?:\d+[\.\-\)]\s*)?\(((?:Ex\.?\s*Admisi[óo]n|Admisi[óo]n|Examen\s+(?:de\s+)?Admisi[óo]n)[^)]+)\)/i);
    
    // An exercise is genuine admission ONLY IF:
    // 1. Explicitly marked isAdmissionExam === true
    // 2. OR its content contains an authentic (Ex Admisión ...) tag
    // 3. OR it is in the Advanced tier (or num >= 14) and has an examSource metadata
    const rawExamSource = block.metadata?.examSource || block.metadata?.admissionSource || '';
    const isExplicitAdmission = Boolean(
      block.metadata?.isAdmissionExam === true ||
      admissionTextMatch ||
      (rawExamSource && (isAdvanced || /admisi|ex\s/i.test(rawExamSource)))
    );

    let admissionTag = '';
    if (isExplicitAdmission) {
      if (admissionTextMatch) {
        admissionTag = `(${admissionTextMatch[1].trim()})`;
      } else if (rawExamSource) {
        const clean = rawExamSource.replace(/^\(|\)$/g, '').trim();
        admissionTag = clean.toLowerCase().startsWith('ex') ? `(${clean})` : `(Ex Admisión ${clean})`;
      }
    }

    // Clean exercise content thoroughly:
    let cleanContent = contentStr;

    // 1. Strip literal \n, \\n, /n, n\, or newlines at the very start of content
    cleanContent = cleanContent.replace(/^(?:\s*\\+n|\s*\/+n|\s*\\+r|\s*n\\|\s*[\r\n])+/gi, '');

    // 2. Strip redundant leading question number (e.g., "5. ", "14. ", "14.- ", "14) ", "1. ")
    cleanContent = cleanContent.replace(/^\s*\d+[\.\-\)]\s*/, '');

    // 3. Strip literal \n or newlines again in case number had \n immediately following it
    cleanContent = cleanContent.replace(/^(?:\s*\\+n|\s*\/+n|\s*\\+r|\s*n\\|\s*[\r\n])+/gi, '');

    // 4. If genuine admission, strip admission tag from content so we don't display it twice
    if (isExplicitAdmission && admissionTag) {
      cleanContent = cleanContent.replace(/^\s*\(((?:Ex\.?\s*Admisi[óo]n|Admisi[óo]n|Examen\s+(?:de\s+)?Admisi[óo]n)[^)]+)\)\s*(?:\\+n|\/+n|n\\|[\r\n])*\s*/gi, '');
      if (rawExamSource) {
        const escaped = rawExamSource.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        cleanContent = cleanContent.replace(new RegExp(`^\\s*\\(?${escaped}\\)?\\s*(?:\\\\+n|\\/+n|n\\\\|[\\r\\n])*\\s*`, 'gi'), '');
      }
    } else {
      // 5. If NOT an authentic admission question (e.g. basic, intermediate, homework exercises 1 to 13),
      // strip any accidental synthetic tags like (cepreUNAS 2024), (UNMSM 2023), (UNHEVAL 2022) at start
      cleanContent = cleanContent.replace(/^\s*\((?:cepreUNAS|UNMSM|UNI|UNHEVAL|CEPRE-UNI|CEPREVAL|UNAS)[^)]*\)\s*(?:\\+n|\/+n|n\\|[\r\n])*\s*/gi, '');
    }

    // 6. Strip any residual literal \n, /n, \r or newlines at start of cleanContent
    cleanContent = cleanContent.replace(/^(?:\s*\\+n|\s*\/+n|\s*\\+r|\s*n\\|\s*[\r\n])+/gi, '').trim();

    // 7. Sanitize any contaminated KaTeX spans or fragmented equation dollars
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

    return (
      <div 
        key={block.id} 
        data-block-type="exercise"
        data-exercise-number={num}
        className={`exam-exercise-item relative font-serif text-black leading-normal mb-3 pb-2 border-b border-dotted border-slate-200 last:border-b-0 group ${
          interactive ? 'cursor-pointer hover:bg-sky-50/50 p-1.5 -m-1.5 rounded-lg transition-colors' : ''
        }`}
        onClick={() => interactive && onEditBlock?.(block.id)}
        title={interactive ? "Haz clic para editar esta pregunta" : undefined}
      >
        {/* Subtle edit button visible on hover only in interactive mode (hidden when printing) */}
        {interactive && (
          <span className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-[10px] text-sky-600 font-sans font-semibold bg-white/95 px-1.5 py-0.5 rounded shadow-xs transition-opacity flex items-center gap-1 no-print z-10">
            <Edit3 className="w-2.5 h-2.5" /> Editar
          </span>
        )}

        {/* Authentic Compendium Exercise Presentation (Matching Peruvian Pre-University Editorial Standards) */}
        {admissionTag ? (
          <div className="mb-1.5">
            {/* Admission Reference Header: Number + Exam Source (e.g. "14. (Ex Admisión UNMSM 2020 – I)") */}
            <div className="font-serif text-black text-[0.96em] font-normal mb-0.5 leading-snug">
              <span className="font-bold mr-1.5">{num}.</span>
              <span className="font-medium text-black">{admissionTag}</span>
            </div>
            {/* Statement begins cleanly on line 2 without any accidental \n */}
            <div className="text-black text-[0.96em] leading-relaxed text-justify">
              <TextWithMath text={cleanContent} />
            </div>
          </div>
        ) : (
          /* Standard Practice / Application Exercise: Direct numbering running inline on the same line */
          <div className="text-black text-[0.96em] leading-relaxed text-justify mb-1.5">
            <span className="font-serif font-bold text-black mr-1.5 select-none">{num}.</span>
            <TextWithMath text={cleanContent} inline={true} />
          </div>
        )}

        {/* Options / Alternativas: Authentic compendium lower-case a), b), c), d), e) */}
        {optionsList.length > 0 && (
          <div className="mt-1 pl-2">
            <div className={optionLayout}>
              {optionsList.map((opt: string, idx: number) => {
                const letter = String.fromCharCode(97 + idx); // a, b, c, d, e
                const parsed = parseOptionMath(opt);
                return (
                  <div key={idx} className="flex items-start gap-1 text-[0.92em] text-black">
                    <span className="font-bold font-serif text-black shrink-0">{letter})</span>
                    <div className="overflow-x-auto text-black">
                      {parsed.isMath ? (
                        <InlineMath math={parsed.mathCode} errorColor="#cc0000" />
                      ) : (
                        <TextWithMath text={parsed.displayValue || opt} inline={true} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * Institutional Header Banner:
   * Displays only ACADEMIA JOHN NASH / Creemos en tu esfuerzo on the left,
   * and the official Nash logo on the right, with a solid dividing rule underneath.
   * Completely removed: UNMSM 2026-I, MATH. LIBRO, and Formato Examen.
   */
  const renderInstitutionalHeader = () => (
    <div className="exam-header-banner relative z-10 border-b-2 border-black pb-2 mb-3 flex items-center justify-between">
      <div className="flex flex-col">
        <span className="font-sans font-black text-[13.5px] tracking-wider text-black uppercase leading-tight">
          ACADEMIA JOHN NASH
        </span>
        <span className="font-serif italic text-[10.5px] text-amber-800 tracking-wide">
          Creemos en tu esfuerzo
        </span>
      </div>

      <div className="flex items-center">
        <img src={"/logo_nash.png"} alt="Academia John Nash" className="w-8 h-8 object-contain" />
      </div>
    </div>
  );

  const renderWatermark = () => {
    const config = watermarkConfig || { type: 'default', opacity: 0.05 };
    if (config.type === 'none') return null;

    if (config.type === 'image') {
      const src = config.imageUrl || '/logo_nash.png';
      const scale = config.imageScale ?? 0.9;
      const opacity = config.opacity ?? 0.08;
      const washout = config.washout !== false;

      return (
        <div 
          className="exam-watermark-bg absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden"
          style={{ opacity }}
        >
          <img
            src={src}
            alt=""
            className={`max-w-[85%] max-h-[85%] object-contain ${washout ? 'grayscale contrast-75' : ''}`}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
            }}
          />
        </div>
      );
    }

    if (config.type === 'text') {
      const text = config.text || 'PREUNIVERSITARIO';
      const isDiagonal = config.layout !== 'horizontal';
      const isSans = config.fontFamily === 'sans';
      const opacity = config.opacity ?? 0.07;
      const textColor = config.textColor || '#1e293b';

      return (
        <div 
          className="exam-watermark-bg absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden"
          style={{ opacity }}
        >
          <div
            className={`font-black uppercase tracking-[0.25em] text-center select-none ${
              isSans ? 'font-sans' : 'font-serif'
            }`}
            style={{
              fontSize: '54px',
              lineHeight: 1.15,
              color: textColor,
              transform: isDiagonal ? 'rotate(-38deg)' : 'none',
              transformOrigin: 'center center',
              whiteSpace: 'nowrap',
              maxWidth: '90%',
            }}
          >
            {text}
          </div>
        </div>
      );
    }

    // Default institutional John Nash watermark
    return (
      <div className="exam-watermark-bg absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none opacity-[0.05] z-0">
        <img src="/logo_nash.png" alt="" className="w-56 h-56 object-contain grayscale" />
        <div className="font-serif font-black text-3xl tracking-widest text-black uppercase mt-3">JOHN NASH</div>
        <div className="text-xs font-black tracking-[0.3em] text-black uppercase mt-1">ACADEMIA PREUNIVERSITARIA</div>
        <div className="text-xs italic font-serif text-amber-900 mt-1">Creemos en tu esfuerzo</div>
      </div>
    );
  };

  /**
   * Continuous Flow View:
   * Exercises flow seamlessly in two balanced columns without arbitrary page breaks or leftover blank spaces.
   */
  const renderContinuousView = () => {
    const top = marginsConfig.marginTop ?? 30;
    const bottom = marginsConfig.marginBottom ?? 36;
    const leftBase = marginsConfig.marginLeft ?? 24;
    const rightBase = marginsConfig.marginRight ?? 24;
    const gutter = marginsConfig.bindingGutter ?? 0;

    return (
      <div
        id="exam-page-continuous"
        className="exam-page bg-white shadow-xl border border-slate-300 rounded-sm mx-auto relative flex flex-col box-border overflow-hidden"
        style={{
          width: '100%',
          maxWidth: '820px',
          minHeight: 'auto',
          height: 'auto',
          paddingTop: `${top}px`,
          paddingBottom: `${bottom}px`,
          paddingLeft: `${leftBase + gutter}px`,
          paddingRight: `${rightBase}px`,
          fontSize: `${fontSize}pt`,
          marginBottom: '32px',
          backgroundColor: '#ffffff',
          color: '#000000',
        }}
      >
        {renderWatermark()}
        {renderBindingGuide('left')}
        {renderInstitutionalHeader()}

        {/* Custom Subject Title only if it's a real custom title and not in a ficha block */}
        {hasCustomTitle && !hasFichaInTheory && (
          <div className="relative z-10 text-center my-2">
            <div className="text-xs sm:text-[13px] font-sans font-black tracking-[0.2em] text-sky-900 uppercase">
              {doc.title.toUpperCase()}
            </div>
            <div className="w-20 h-0.5 bg-sky-700 mx-auto mt-1" />
          </div>
        )}

        {/* Theory Blocks (full width at the top) */}
        {theoryBlocks.length > 0 && (
          <div className="relative z-10 mb-3 border-b border-slate-200 pb-3">
            {theoryBlocks.map((block) => (
              <div 
                key={block.id} 
                className={`mb-2 ${interactive ? 'cursor-pointer hover:bg-slate-50 p-1 rounded' : ''}`}
                onClick={() => interactive && onEditBlock?.(block.id)}
              >
                {block.type === 'text' && (
                  <div className="prose max-w-none text-black leading-relaxed text-[0.95em]">
                    <TextWithMath text={block.content} />
                  </div>
                )}
                {block.type === 'math' && (
                  <div className="py-2 text-center">
                    <BlockMath math={block.content || '\\empty'} />
                  </div>
                )}
                {block.type === 'graph' && (
                  <div className="py-1 flex justify-center">
                    <GraphRenderer 
                      expression={block.content} 
                      domain={block.metadata?.domain || [-10, 10]}
                      color={block.metadata?.color}
                      strokeWidth={block.metadata?.strokeWidth}
                      lineStyle={block.metadata?.lineStyle}
                      showGrid={block.metadata?.showGrid !== false}
                      height={block.metadata?.height || 200}
                      xLabel={block.metadata?.xLabel || 'x'}
                      yLabel={block.metadata?.yLabel || 'y'}
                      title={block.metadata?.title}
                      graphType={block.metadata?.graphType}
                      geometryType={block.metadata?.geometryType}
                      geometryParams={block.metadata?.geometryParams}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Small bold 'Ejercicios' label directly above the first exercise */}
        {allNumberedExercises.length > 0 && (
          <div className="relative z-10 text-left mt-1.5 mb-1">
            <span className="font-serif font-bold text-[11.5px] text-black">
              Ejercicios
            </span>
          </div>
        )}

        {/* Continuous Two-Column Exercise Layout */}
        <div className="exam-two-columns-section relative z-10 flex flex-row w-full min-h-0">
          {/* Left Column */}
          <div className="exam-col-left w-1/2 pr-4 border-r border-black flex flex-col justify-start">
            {continuousColumns.left.length > 0 ? (
              continuousColumns.left.map(({ block, num }) => renderExerciseContent(block, num))
            ) : (
              <div className="text-slate-300 italic text-xs py-4 text-center font-sans">
                (Sin preguntas)
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="exam-col-right w-1/2 pl-4 flex flex-col justify-start">
            {continuousColumns.right.length > 0 ? (
              continuousColumns.right.map(({ block, num }) => renderExerciseContent(block, num))
            ) : (
              <div className="text-slate-300 italic text-xs py-4 text-center font-sans">
                {continuousColumns.left.length === 0 ? '' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Page Footer */}
        <div className="exam-footer relative z-10 mt-5 pt-2.5 border-t border-slate-300 flex items-center justify-between">
          <div className="text-[9.5px] font-sans text-slate-500">
            Academia John Nash • Sistema de Evaluación Preuniversitaria
          </div>
          <div className="text-[9.5px] font-serif italic text-slate-500">
            Libro de Clase
          </div>
        </div>
      </div>
    );
  };

  /**
   * Paginated View:
   * Formats exercises per page with balanced columns so neither column ends early,
   * calibrated strictly to exact A4 dimensions (820px x 1160px).
   */
  const renderExamPage = (page: ExamPageData) => {
    const pagePadding = getPagePadding(page.pageNumber);

    // 1. Cover Page
    if (page.isCover) {
      return (
        <div
          key={`exam-page-${page.pageNumber}`}
          id={`exam-page-${page.pageNumber}`}
          className="exam-page bg-white shadow-xl border border-slate-300 rounded-sm mx-auto relative flex flex-col box-border overflow-hidden"
          style={{
            width: '100%',
            maxWidth: '820px',
            minHeight: '1160px',
            height: '1160px',
            paddingTop: pagePadding.paddingTop,
            paddingBottom: pagePadding.paddingBottom,
            paddingLeft: pagePadding.paddingLeft,
            paddingRight: pagePadding.paddingRight,
            fontSize: `${fontSize}pt`,
            marginBottom: '32px',
            backgroundColor: '#ffffff',
            boxSizing: 'border-box',
          }}
        >
          {renderWatermark()}
          {renderBindingGuide(pagePadding.gutterSide)}
          {page.theoryBlocks.map((block) => (
            <div
              key={block.id}
              className="h-full flex flex-col flex-1 justify-between"
              onClick={() => interactive && onEditBlock?.(block.id)}
            >
              <div className="prose max-w-none text-black leading-relaxed flex-1 flex flex-col">
                <TextWithMath text={block.content} />
              </div>
            </div>
          ))}
        </div>
      );
    }

    // 2. Table of Contents / Index Page
    if (page.isIndex) {
      return (
        <div
          key={`exam-page-${page.pageNumber}`}
          id={`exam-page-${page.pageNumber}`}
          className="exam-page bg-white shadow-xl border border-slate-300 rounded-sm mx-auto relative flex flex-col box-border"
          style={{
            width: '100%',
            maxWidth: '820px',
            minHeight: '1160px',
            height: 'auto',
            paddingTop: pagePadding.paddingTop,
            paddingBottom: pagePadding.paddingBottom,
            paddingLeft: pagePadding.paddingLeft,
            paddingRight: pagePadding.paddingRight,
            fontSize: `${fontSize}pt`,
            marginBottom: '32px',
            backgroundColor: '#ffffff',
            color: '#000000',
            boxSizing: 'border-box',
          }}
        >
          {renderWatermark()}
          {renderBindingGuide(pagePadding.gutterSide)}
          {renderInstitutionalHeader()}
          <div className="flex-1 flex flex-col mt-2">
            {page.theoryBlocks.map((block) => (
              <div
                key={block.id}
                className="flex-1 flex flex-col"
                onClick={() => interactive && onEditBlock?.(block.id)}
              >
                <div className="prose max-w-none text-black leading-relaxed">
                  <TextWithMath text={block.content} />
                </div>
              </div>
            ))}
          </div>
          {renderPageFooter(page.pageNumber)}
        </div>
      );
    }

    // 3. Answer Keys Page
    if (page.isKeySheet) {
      return (
        <div
          key={`exam-page-${page.pageNumber}`}
          id={`exam-page-${page.pageNumber}`}
          className="exam-page bg-white shadow-xl border border-slate-300 rounded-sm mx-auto relative flex flex-col box-border"
          style={{
            width: '100%',
            maxWidth: '820px',
            minHeight: '1160px',
            height: 'auto',
            paddingTop: pagePadding.paddingTop,
            paddingBottom: pagePadding.paddingBottom,
            paddingLeft: pagePadding.paddingLeft,
            paddingRight: pagePadding.paddingRight,
            fontSize: `${fontSize}pt`,
            marginBottom: '32px',
            backgroundColor: '#ffffff',
            color: '#000000',
            boxSizing: 'border-box',
          }}
        >
          {renderWatermark()}
          {renderBindingGuide(pagePadding.gutterSide)}
          {renderInstitutionalHeader()}
          <div className="flex-1 flex flex-col mt-4">
            {page.theoryBlocks.map((block) => (
              <div
                key={block.id}
                className="flex-1 flex flex-col"
                onClick={() => interactive && onEditBlock?.(block.id)}
              >
                <div className="prose max-w-none text-black leading-relaxed">
                  <TextWithMath text={block.content} />
                </div>
              </div>
            ))}
          </div>
          {renderPageFooter(page.pageNumber)}
        </div>
      );
    }

    // 4. Standard Content / Chapter Pages
    const hasExercisesOnPage = page.leftColumn.length > 0 || page.rightColumn.length > 0;

    return (
      <div
        key={`exam-page-${page.pageNumber}`}
        id={`exam-page-${page.pageNumber}`}
        className="exam-page bg-white shadow-xl border border-slate-300 rounded-sm mx-auto relative flex flex-col box-border"
        style={{
          width: '100%',
          maxWidth: '820px',
          minHeight: '1160px',
          height: 'auto',
          paddingTop: pagePadding.paddingTop,
          paddingBottom: pagePadding.paddingBottom,
          paddingLeft: pagePadding.paddingLeft,
          paddingRight: pagePadding.paddingRight,
          fontSize: `${fontSize}pt`,
          marginBottom: '32px',
          backgroundColor: '#ffffff',
          color: '#000000',
          boxSizing: 'border-box',
        }}
      >
        {renderWatermark()}
        {renderBindingGuide(pagePadding.gutterSide)}
        {renderInstitutionalHeader()}

        {/* Subject Banner on start */}
        {page.showSubjectBanner && hasCustomTitle && !hasFichaInTheory && (
          <div className="relative z-10 text-center my-2">
            <div className="text-xs sm:text-[13px] font-sans font-black tracking-[0.2em] text-sky-900 uppercase">
              {doc.title.toUpperCase()}
            </div>
            <div className="w-20 h-0.5 bg-sky-700 mx-auto mt-1" />
          </div>
        )}

        {/* Theory Blocks */}
        {page.theoryBlocks.length > 0 && (
          <div className={`relative z-10 ${hasExercisesOnPage ? 'mb-2 border-b border-slate-200 pb-2' : 'flex-1 flex flex-col justify-between pb-1'}`}>
            {page.theoryBlocks.map((block) => (
              <div 
                key={block.id} 
                className={`${hasExercisesOnPage ? 'mb-2' : 'flex-1 flex flex-col justify-between'} ${interactive ? 'cursor-pointer hover:bg-slate-50 p-1 rounded' : ''}`}
                onClick={() => interactive && onEditBlock?.(block.id)}
              >
                {block.type === 'text' && (
                  <div className={`prose max-w-none text-black leading-relaxed text-[0.92em] ${!hasExercisesOnPage ? 'flex-1 flex flex-col justify-between' : ''}`}>
                    <TextWithMath text={block.content} />
                  </div>
                )}
                {block.type === 'math' && (
                  <div className="py-2 text-center">
                    <BlockMath math={block.content || '\\empty'} />
                  </div>
                )}
                {block.type === 'graph' && (
                  <div className="py-1 flex justify-center">
                    <GraphRenderer 
                      expression={block.content} 
                      domain={block.metadata?.domain || [-10, 10]}
                      color={block.metadata?.color}
                      strokeWidth={block.metadata?.strokeWidth}
                      lineStyle={block.metadata?.lineStyle}
                      showGrid={block.metadata?.showGrid !== false}
                      height={block.metadata?.height || 200}
                      xLabel={block.metadata?.xLabel || 'x'}
                      yLabel={block.metadata?.yLabel || 'y'}
                      title={block.metadata?.title}
                      graphType={block.metadata?.graphType}
                      geometryType={block.metadata?.geometryType}
                      geometryParams={block.metadata?.geometryParams}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Small bold 'Ejercicios' label directly above the first exercise */}
        {hasExercisesOnPage && (
          <div className="relative z-10 text-left my-1">
            <span className="font-serif font-bold text-[11px] sm:text-[11.5px] text-black">
              Ejercicios
            </span>
          </div>
        )}

        {/* Two-Column Exercise Layout with Continuous Central Divider (Only if exercises exist on this page) */}
        {hasExercisesOnPage && (
          <div className="exam-two-columns-section relative z-10 flex flex-row w-full flex-1 min-h-0">
            {/* Left Column */}
            <div className="exam-col-left w-1/2 pr-3.5 border-r border-black flex flex-col justify-start">
              {page.leftColumn.length > 0 ? (
                page.leftColumn.map(({ block, num }) => renderExerciseContent(block, num))
              ) : (
                <div className="text-slate-300 italic text-xs py-2 text-center font-sans">
                  (Sin preguntas)
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="exam-col-right w-1/2 pl-3.5 flex flex-col justify-start">
              {page.rightColumn.length > 0 ? (
                page.rightColumn.map(({ block, num }) => renderExerciseContent(block, num))
              ) : null}
            </div>
          </div>
        )}

        {/* Page Footer pinned at the bottom */}
        {renderPageFooter(page.pageNumber)}
      </div>
    );
  };

  const renderPageFooter = (pageNum: number) => (
    <div className="exam-footer relative z-10 mt-auto pt-2.5 border-t border-slate-300 flex items-center justify-between">
      <div className="text-[9.5px] font-sans text-slate-500">
        Academia John Nash • Sistema de Evaluación Preuniversitaria
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 bottom-2">
        <div className="w-7 h-7 rounded-full bg-sky-700 text-white font-sans font-bold flex items-center justify-center text-xs shadow-xs">
          {pageNum}
        </div>
      </div>

      <div className="text-[9.5px] font-serif italic text-slate-500">
        Pág. {pageNum}
      </div>
    </div>
  );

  const displayedPages = (forcePaginated || selectedPageIndex === null) ? pages : [pages[selectedPageIndex]];

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top Controls Toolbar for Exam View */}
      <div className="w-full max-w-4xl mb-4 px-2 no-print">
        <div className="bg-white text-slate-800 rounded-2xl p-3 sm:p-4 shadow-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3">
          
          {/* Left Title & Status */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
                  Vista Libro Oficial
                </span>
                <span className="bg-sky-500/20 text-sky-300 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                  {allNumberedExercises.length} {allNumberedExercises.length === 1 ? 'Ejercicio' : 'Ejercicios'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Formato institucional Academia John Nash a 2 columnas compactas sin hojas malgastadas.
              </p>
            </div>
          </div>

          {/* Center Configuration Options */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle: Continuous (No blank spaces) vs Pages */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-700 text-xs">
              <button
                id="btn-exam-layout-continuous"
                onClick={() => setLayoutMode('continuous')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all ${
                  layoutMode === 'continuous'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Ejercicios continuos sin cortes de página ni partes en blanco"
              >
                <AlignJustify className="w-3.5 h-3.5" />
                <span>Flujo Continuo</span>
              </button>

              <button
                id="btn-exam-layout-pages"
                onClick={() => setLayoutMode('pages')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all ${
                  layoutMode === 'pages'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Separar en páginas A4 individuales"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Por Páginas</span>
              </button>
            </div>

            {/* Watermark customization button (Word style) */}
            <button
              id="btn-examview-watermark"
              onClick={() => setShowWatermarkModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg text-xs font-bold transition-colors shadow-2xs"
              title="Personalizar o subir marca de agua al estilo Word (Imagen o Texto)"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>Marca de Agua</span>
              {watermarkConfig?.type === 'image' && (
                <span className="text-[9px] bg-sky-600 text-white px-1.5 py-0.2 rounded font-sans font-bold">Imagen</span>
              )}
              {watermarkConfig?.type === 'text' && (
                <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-sans font-bold">Texto</span>
              )}
              {watermarkConfig?.type === 'none' && (
                <span className="text-[9px] bg-slate-300 text-slate-700 px-1 py-0.2 rounded font-sans font-bold">Sin marca</span>
              )}
            </button>

            {/* Margins & Binding Gutter button */}
            <button
              id="btn-examview-margins"
              onClick={() => setShowMarginsModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold transition-colors shadow-2xs"
              title="Regular margen vertical (superior/inferior) y espacio para empaste o encuadernación de libros"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-700" />
              <span>Márgenes y Empaste</span>
              {marginsConfig?.preset === 'empaste' && (
                <span className="text-[9px] bg-amber-600 text-white px-1.5 py-0.2 rounded font-sans font-bold">Empaste</span>
              )}
              {marginsConfig?.preset === 'anillado' && (
                <span className="text-[9px] bg-sky-600 text-white px-1.5 py-0.2 rounded font-sans font-bold">Anillado</span>
              )}
              {marginsConfig?.preset === 'custom' && (
                <span className="text-[9px] bg-purple-600 text-white px-1.5 py-0.2 rounded font-sans font-bold">Personalizado</span>
              )}
            </button>

            {/* Page Navigation Switcher (when in Pages mode) */}
            {layoutMode === 'pages' && pages.length > 1 && (
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-700 text-xs">
                <button
                  onClick={() => setSelectedPageIndex(null)}
                  className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                    selectedPageIndex === null ? 'bg-sky-600 text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Todas
                </button>
                {pages.map((p, idx) => (
                  <button
                    key={p.pageNumber}
                    onClick={() => setSelectedPageIndex(idx)}
                    className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                      selectedPageIndex === idx ? 'bg-sky-600 text-white' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    P{p.pageNumber}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Action Download Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              id="btn-examview-download-pdf-a4"
              onClick={() => onDownloadPdf?.({ orientation: 'portrait', customFontSize: fontSize, pageSize: 'a4' })}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-bold hover:bg-sky-500 transition-colors shadow-sm disabled:opacity-50"
              title="Descargar este libro en PDF A4 exacto página por página para imprenta"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">PDF A4 (Página Exacta)</span>
              <span className="lg:hidden">PDF A4</span>
            </button>
            <button
              id="btn-examview-download-pdf-letter"
              onClick={() => onDownloadPdf?.({ orientation: 'portrait', customFontSize: fontSize, pageSize: 'letter' })}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-bold hover:bg-sky-500 transition-colors shadow-sm disabled:opacity-50"
              title="Descargar este libro en PDF formato Carta"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">PDF Carta</span>
              <span className="lg:hidden">Carta</span>
            </button>

            <button
              id="btn-examview-download-word"
              onClick={() => onDownloadDocx?.()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 transition-colors shadow-sm"
              title="Descargar este libro en Word (.docx) a 2 columnas"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Word (.docx)</span>
            </button>

            <button
              id="btn-examview-print"
              onClick={() => onPrintBrowser?.()}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="Imprimir o Guardar como PDF en Navegador"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* Pages Container */}
      <div id="exam-pages-container" className="w-full flex flex-col items-center">
        {!forcePaginated && layoutMode === 'continuous' ? (
          renderContinuousView()
        ) : (
          displayedPages.map((page) => renderExamPage(page))
        )}
      </div>

      {/* Word-Style Watermark Modal */}
      {showWatermarkModal && (
        <WatermarkModal
          isOpen={showWatermarkModal}
          onClose={() => setShowWatermarkModal(false)}
          config={watermarkConfig}
          onSave={handleSaveWatermark}
        />
      )}

      {/* Margins & Binding Modal */}
      {showMarginsModal && (
        <MarginsModal
          isOpen={showMarginsModal}
          onClose={() => setShowMarginsModal(false)}
          config={marginsConfig}
          onSave={handleSaveMargins}
        />
      )}
    </div>
  );
};

