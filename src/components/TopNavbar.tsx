import React from 'react';
import { 
  Home, 
  FileText, 
  Presentation, 
  Sparkles, 
  GraduationCap, 
  Settings, 
  Plus, 
  BookOpen, 
  FileEdit,
  ArrowLeft
} from 'lucide-react';
import { AppView } from '../types';

interface TopNavbarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onNewDocument: () => void;
  activeDocumentTitle?: string;
  onBackToEditor?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentView,
  onNavigate,
  onNewDocument,
  activeDocumentTitle,
  onBackToEditor
}) => {
  const navItems = [
    {
      id: 'dashboard' as AppView,
      label: 'INICIO',
      icon: Home,
      description: 'Panel y documentos'
    },
    {
      id: 'book_creator' as AppView,
      label: 'CREAR LIBRO',
      icon: BookOpen,
      badge: 'SÍLABO IA',
      description: 'Elaborar libros completos desde sílabo con índice y carátula'
    },
    {
      id: 'exams' as AppView,
      label: 'EXÁMENES',
      icon: FileText,
      badge: 'OFICIAL',
      description: 'Generador de exámenes y fichas a 2 columnas'
    },
    {
      id: 'slides' as AppView,
      label: 'DIAPOSITIVAS',
      icon: Presentation,
      badge: 'CLASE',
      description: 'Presentaciones didácticas interactivas'
    },
    {
      id: 'notebooklm' as AppView,
      label: 'FUENTES IA',
      icon: Sparkles,
      badge: 'NotebookLM',
      description: 'PDFs, enlaces y ejercicios similares'
    },
    {
      id: 'practice' as AppView,
      label: 'PRÁCTICA',
      icon: GraduationCap,
      description: 'Banco de ejercicios y balotarios'
    },
    {
      id: 'settings' as AppView,
      label: 'AJUSTES',
      icon: Settings,
      description: 'Configuración de academia y logo'
    }
  ];

  return (
    <header className="bg-white text-slate-800 border-b border-slate-200 select-none shadow-sm z-30 sticky top-0 no-print">
      <div className="w-full px-2 sm:px-4 flex items-center justify-between h-[68px]">
        
        {/* Left: Brand Identity & Active Doc Return */}
        <div className="flex items-center gap-3 shrink-0 mr-2 sm:mr-6">
          <div 
            onClick={() => onNavigate('dashboard')} 
            className="flex items-center gap-2 cursor-pointer group"
            title="Ir a Inicio"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="hidden lg:block">
              <div className="text-xs font-black tracking-widest text-sky-600 uppercase leading-none">JOHN NASH</div>
              <div className="text-[10px] text-slate-500 font-medium tracking-wide">Academia Preuniversitaria</div>
            </div>
          </div>

          {/* Quick Return to Editor if document is active and user is in another view */}
          {activeDocumentTitle && currentView !== 'editor' && onBackToEditor && (
            <button
              onClick={onBackToEditor}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-sky-700 text-xs font-semibold transition-colors"
              title={`Volver a editar: ${activeDocumentTitle}`}
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span className="truncate max-w-[130px]">{activeDocumentTitle}</span>
            </button>
          )}

          {currentView === 'editor' && (
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-semibold px-2 py-1 rounded hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Biblioteca</span>
            </button>
          )}
        </div>

        {/* Center: Iconic Navigation Bar (Exactly like user reference image) */}
        <nav className="flex items-center justify-center flex-1 overflow-x-auto no-scrollbar max-w-4xl">
          <div className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => onNavigate(item.id)}
                  title={item.description}
                  className={`relative flex flex-col items-center justify-center px-3 sm:px-5 py-1.5 h-[62px] min-w-[70px] sm:min-w-[90px] rounded-lg transition-all group ${
                    isActive
                      ? 'bg-slate-50 text-sky-700 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {/* Active Top Glow Line */}
                  {isActive && (
                    <span className="absolute top-0 left-2 right-2 h-[2.5px] bg-gradient-to-r from-sky-400 to-indigo-400 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
                  )}

                  {/* Icon */}
                  <div className="relative mb-1">
                    <Icon 
                      className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-sky-600' : 'text-slate-400 group-hover:text-slate-600'
                      }`} 
                    />
                    {item.badge && (
                      <span className={`absolute -top-1.5 -right-3.5 px-1 py-0.2 text-[8px] font-black uppercase rounded-full leading-none tracking-tighter ${
                        item.id === 'notebooklm'
                          ? 'bg-amber-400 text-slate-900 font-bold'
                          : 'bg-sky-500 text-white'
                      }`}>
                        {item.badge === 'NotebookLM' ? 'NLM' : item.badge}
                      </span>
                    )}
                  </div>

                  {/* Label */}
                  <span className={`text-[10.5px] tracking-wider uppercase whitespace-nowrap transition-colors ${
                    isActive ? 'font-bold text-sky-700' : 'font-semibold text-slate-500 group-hover:text-slate-700'
                  }`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Right: Quick Action (Crear en blanco) */}
        <div className="flex items-center gap-2 shrink-0 ml-2 sm:ml-4">
          <button
            id="btn-nav-new-blank"
            onClick={onNewDocument}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all hover:scale-105 active:scale-95"
            title="Crear nuevo libro / documento en blanco"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Nuevo Doc</span>
          </button>
        </div>

      </div>
    </header>
  );
};
