import React, { useState, useEffect } from 'react';
import { TopNavbar } from './components/TopNavbar';
import { Dashboard } from './components/Dashboard';
import { Editor } from './components/Editor';
import { NotebookLMHub } from './components/NotebookLMHub';
import { SlidesGenerator } from './components/SlidesGenerator';
import { ExamGenerator } from './components/ExamGenerator';
import { BookCreator } from './components/BookCreator';
import { PracticeBank } from './components/PracticeBank';
import { SettingsView } from './components/SettingsView';
import { DocumentInfo, Template, AppView, ExtractedExercise, Block } from './types';
import { TEMPLATES } from './data/templates';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>('doc-initial-nash');
  const [slidesInitialTopic, setSlidesInitialTopic] = useState<string>('Cinemática: MRUV y Gráficas del Movimiento');
  const [documents, setDocuments] = useState<DocumentInfo[]>(() => {
    const saved = localStorage.getItem('educreate_docs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [{
      id: 'doc-initial-nash',
      title: TEMPLATES[0].title,
      subject: TEMPLATES[0].subject,
      blocks: [...TEMPLATES[0].defaultBlocks],
      createdAt: new Date(),
      updatedAt: new Date(),
    }];
  });

  useEffect(() => {
    localStorage.setItem('educreate_docs', JSON.stringify(documents));
  }, [documents]);

  const handleUseTemplate = (template: Template) => {
    const newDoc: DocumentInfo = {
      id: `doc-${Date.now()}`,
      title: `Copy of ${template.title}`,
      subject: template.subject,
      blocks: [...template.defaultBlocks],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setDocuments(prev => [newDoc, ...prev]);
    setActiveDocumentId(newDoc.id);
    setCurrentView('editor');
  };

  const handleNewBlank = () => {
    const newDoc: DocumentInfo = {
      id: `doc-${Date.now()}`,
      title: 'Nuevo Libro John Nash',
      subject: 'Math',
      blocks: [
        {
          id: `block-${Date.now()}-header`,
          type: 'text',
          content: `<div class="ficha-header print-full-width"><div class="ficha-header-top"><img src="/logo_nash.png" alt="Logo Academia John Nash" class="nash-header-logo" /><div class="nash-header-info"><div class="nash-academy-name">Academia John Nash</div><div class="nash-slogan">Creemos en tu esfuerzo</div></div></div><div class="text-xs font-bold text-slate-500 tracking-widest mt-1 uppercase">Matemática &nbsp;|&nbsp; Pre-universitario</div><div class="ficha-subtitle">Libro Oficial de Clase</div></div>`
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setDocuments(prev => [newDoc, ...prev]);
    setActiveDocumentId(newDoc.id);
    setCurrentView('editor');
  };

  const handleUpdateDocument = (updatedDoc: DocumentInfo) => {
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    if (activeDocumentId === id) {
      setActiveDocumentId(null);
      setCurrentView('dashboard');
    }
  };

  // 1. Exam Generated from Exam Generator
  const handleExamGenerated = (newDoc: DocumentInfo) => {
    setDocuments(prev => [newDoc, ...prev]);
    setActiveDocumentId(newDoc.id);
    setCurrentView('editor');
  };

  // 1.1 Book Generated from Book Creator (Syllabus to Book)
  const handleBookGenerated = (newDoc: DocumentInfo) => {
    setDocuments(prev => [newDoc, ...prev]);
    setActiveDocumentId(newDoc.id);
    setCurrentView('editor');
  };

  // 2. Insert Extracted Exercises from NotebookLM into current doc
  const handleAddExercisesToDoc = (exercises: ExtractedExercise[]) => {
    const exerciseBlocks: Block[] = exercises.map((ex, idx) => ({
      id: `block-ex-${Date.now()}-${idx}`,
      type: 'exercise',
      content: ex.question,
      metadata: {
        options: ex.options,
        correctAnswer: ex.correctAnswer,
        explanation: ex.explanation,
        topic: ex.topic
      }
    }));

    if (activeDocumentId && documents.some(d => d.id === activeDocumentId)) {
      setDocuments(prev => prev.map(doc => {
        if (doc.id === activeDocumentId) {
          return {
            ...doc,
            blocks: [...doc.blocks, ...exerciseBlocks],
            updatedAt: new Date()
          };
        }
        return doc;
      }));
    } else {
      // Create new document with these exercises
      const newDoc: DocumentInfo = {
        id: `doc-${Date.now()}`,
        title: 'Libro con Ejercicios Extraídos (NotebookLM)',
        subject: 'Math',
        blocks: [
          {
            id: `block-${Date.now()}-head`,
            type: 'text',
            content: `<div class="ficha-header print-full-width"><div class="ficha-header-top"><img src="/logo_nash.png" alt="Logo Academia John Nash" class="nash-header-logo" /><div class="nash-header-info"><div class="nash-academy-name">Academia John Nash</div><div class="nash-slogan">Creemos en tu esfuerzo</div></div></div><div class="text-xs font-bold text-slate-500 tracking-widest mt-1 uppercase">Ejercicios Espejo &nbsp;|&nbsp; Fuentes IA</div><div class="ficha-subtitle">Práctica Basada en Fuentes (NotebookLM)</div></div>`
          },
          ...exerciseBlocks
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setDocuments(prev => [newDoc, ...prev]);
      setActiveDocumentId(newDoc.id);
    }
    setCurrentView('editor');
  };

  // 3. Create full new exam from NotebookLM exercises
  const handleCreateExamFromExercises = (title: string, exercises: ExtractedExercise[]) => {
    const exerciseBlocks: Block[] = exercises.map((ex, idx) => ({
      id: `block-ex-${Date.now()}-${idx}`,
      type: 'exercise',
      content: ex.question,
      metadata: {
        options: ex.options,
        correctAnswer: ex.correctAnswer,
        explanation: ex.explanation,
        topic: ex.topic
      }
    }));

    const newDoc: DocumentInfo = {
      id: `exam-${Date.now()}`,
      title: title || 'Examen Oficial desde Fuentes',
      subject: 'Math',
      blocks: [
        {
          id: `block-${Date.now()}-head`,
          type: 'text',
          content: `<div class="ficha-header print-full-width"><div class="ficha-header-top"><img src="/logo_nash.png" alt="Logo Academia John Nash" class="nash-header-logo" /><div class="nash-header-info"><div class="nash-academy-name">Academia John Nash</div><div class="nash-slogan">Creemos en tu esfuerzo</div></div></div><div class="text-xs font-bold text-slate-500 tracking-widest mt-1 uppercase">Examen Oficial &nbsp;|&nbsp; Pre-universitario</div><div class="ficha-subtitle">${title || 'Evaluación de Rendimiento'}</div></div>`
        },
        ...exerciseBlocks
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setDocuments(prev => [newDoc, ...prev]);
    setActiveDocumentId(newDoc.id);
    setCurrentView('editor');
  };

  // 4. Create slides from sources
  const handleCreateSlidesFromSources = (title: string) => {
    setSlidesInitialTopic(title || 'Clase Magistral con Fuentes');
    setCurrentView('slides');
  };

  // 5. Add selected from Practice Bank
  const handleAddSelectedPractice = (questions: any[]) => {
    const blocks: Block[] = questions.map((q, idx) => ({
      id: `block-prac-${Date.now()}-${idx}`,
      type: 'exercise',
      content: q.question,
      metadata: {
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        topic: q.topic
      }
    }));

    if (activeDocumentId && documents.some(d => d.id === activeDocumentId)) {
      setDocuments(prev => prev.map(doc => {
        if (doc.id === activeDocumentId) {
          return {
            ...doc,
            blocks: [...doc.blocks, ...blocks],
            updatedAt: new Date()
          };
        }
        return doc;
      }));
    } else {
      const newDoc: DocumentInfo = {
        id: `doc-${Date.now()}`,
        title: 'Práctica Seleccionada del Banco',
        subject: 'Math',
        blocks: blocks,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setDocuments(prev => [newDoc, ...prev]);
      setActiveDocumentId(newDoc.id);
    }
    setCurrentView('editor');
  };

  const activeDocument = documents.find(d => d.id === activeDocumentId) || documents[0];

  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans text-slate-800 bg-white">
      
      {/* Top Navbar matching user's image with exact tabs */}
      <TopNavbar 
        currentView={currentView} 
        onNavigate={(view) => {
          setCurrentView(view);
        }}
        onNewDocument={handleNewBlank}
        activeDocumentTitle={activeDocument?.title}
        onBackToEditor={() => setCurrentView('editor')}
      />

      {/* Main View Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {currentView === 'dashboard' && (
          <Dashboard 
            onUseTemplate={handleUseTemplate} 
            onNewBlank={handleNewBlank}
            onNavigateToBookCreator={() => setCurrentView('book_creator')}
            savedDocuments={documents}
            onOpenDocument={(id) => {
              setActiveDocumentId(id);
              setCurrentView('editor');
            }}
            onDeleteDocument={handleDeleteDocument}
          />
        )}

        {currentView === 'editor' && activeDocument && (
          <Editor 
            document={activeDocument} 
            onUpdate={handleUpdateDocument} 
            onBack={() => {
              setCurrentView('dashboard');
            }}
          />
        )}

        {currentView === 'book_creator' && (
          <BookCreator 
            onBookGenerated={handleBookGenerated}
            savedDocuments={documents}
            onOpenExistingBook={(id) => {
              setActiveDocumentId(id);
              setCurrentView('editor');
            }}
          />
        )}

        {currentView === 'exams' && (
          <ExamGenerator 
            onExamGenerated={handleExamGenerated}
            savedDocuments={documents}
            onOpenExistingExam={(id) => {
              setActiveDocumentId(id);
              setCurrentView('editor');
            }}
            onNavigateToBookCreator={() => setCurrentView('book_creator')}
          />
        )}

        {currentView === 'slides' && (
          <SlidesGenerator 
            initialTopic={slidesInitialTopic}
            onExportToExam={(title, exercises) => {
              handleCreateExamFromExercises(title, exercises);
            }}
          />
        )}

        {currentView === 'notebooklm' && (
          <NotebookLMHub 
            onAddExercisesToDoc={handleAddExercisesToDoc}
            onCreateExamFromExercises={handleCreateExamFromExercises}
            onCreateSlidesFromSources={handleCreateSlidesFromSources}
            activeDocTitle={activeDocument?.title}
          />
        )}

        {currentView === 'practice' && (
          <PracticeBank 
            onAddSelectedToExam={handleAddSelectedPractice}
          />
        )}

        {currentView === 'settings' && (
          <SettingsView />
        )}
      </div>

    </div>
  );
}

