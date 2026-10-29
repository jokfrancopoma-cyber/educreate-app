export type Subject = 'Math' | 'Physics' | 'Chemistry' | 'Biology' | 'General';

export type BlockType = 'text' | 'math' | 'graph' | 'exercise' | 'image';

export type AppView = 'dashboard' | 'editor' | 'exams' | 'slides' | 'notebooklm' | 'practice' | 'settings' | 'book_creator';

export interface Block {
  id: string;
  type: BlockType;
  content: string; // For text, math equation, or graph function
  metadata?: any;  // For exercise options, graph bounds, etc.
}

export interface ChapterInfo {
  chapterNumber: number;
  title: string;
  pageStart?: number;
}

export interface WatermarkConfig {
  type: 'none' | 'image' | 'text' | 'default';
  imageUrl?: string;
  imageScale?: number;
  washout?: boolean;
  text?: string;
  fontFamily?: 'serif' | 'sans';
  layout?: 'diagonal' | 'horizontal';
  textColor?: string;
  opacity?: number;
}

export interface MarginConfig {
  preset?: 'normal' | 'empaste' | 'anillado' | 'compacto' | 'custom';
  marginTop?: number;       // in px (e.g. 24px - 60px)
  marginBottom?: number;    // in px (e.g. 26px - 65px)
  marginLeft?: number;      // in px (e.g. 20px - 45px)
  marginRight?: number;     // in px (e.g. 20px - 45px)
  bindingGutter?: number;   // margen extra de empaste/lomo (e.g. 0px - 50px)
  mirrorMargins?: boolean;  // márgenes simétricos/alternados para impresión a doble cara (par/impar)
  showBindingGuide?: boolean; // mostrar guía visual del lomo en pantalla
}

export interface DocumentInfo {
  id: string;
  title: string;
  subject: Subject;
  blocks: Block[];
  createdAt: Date;
  updatedAt: Date;
  isBook?: boolean;
  syllabus?: string;
  chapters?: ChapterInfo[];
  watermark?: WatermarkConfig;
  margins?: MarginConfig;
}

export interface Template {
  id: string;
  title: string;
  subject: Subject;
  description: string;
  previewColor: string;
  defaultBlocks: Block[];
}

export interface NotebookSource {
  id: string;
  name: string;
  type: 'pdf' | 'link' | 'text';
  url?: string;
  base64?: string;
  content?: string;
  size?: string;
  isActive: boolean;
  addedAt: Date;
}

export interface ExtractedExercise {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  topic?: string;
  difficulty?: 'Básico' | 'Intermedio' | 'Avanzado' | 'Tarea Domiciliaria';
}

export interface SlideStep {
  stepTitle: string;
  stepMath?: string;
  stepExplanation: string;
}

export interface Slide {
  id: string;
  type: 'title' | 'concept' | 'exercise' | 'summary';
  title: string;
  subtitle?: string;
  bullets?: string[];
  formula?: string;
  diagramSvg?: string;
  exercise?: {
    question: string;
    options: string[];
    correctAnswer: number;
    steps: SlideStep[];
  };
  notes?: string;
}

export interface SlideDeck {
  id: string;
  title: string;
  course: string;
  level: string;
  slides: Slide[];
}

