import React from 'react';
import { BookOpen, Library, Settings, PlusCircle, Globe } from 'lucide-react';
import { cn } from '../utils/cn';
import { useLanguage } from '../context/LanguageContext';

interface SidebarProps {
  currentView: 'dashboard' | 'editor';
  onNavigate: (view: 'dashboard' | 'editor') => void;
  onNewDocument: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, onNewDocument }) => {
  const { t, language, setLanguage } = useLanguage();

  return (
    <div className="w-64 h-screen bg-white/40 backdrop-blur-lg border-r border-white/40 flex flex-col p-4 gap-6 z-10 no-print">
      <div>
        <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-emerald-600 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-indigo-600" />
          EduCreate
        </h1>
        <p className="text-xs text-slate-500 mt-1">Scientific Authoring</p>
      </div>

      <nav className="flex-1 space-y-1">
        <button
          onClick={() => onNavigate('dashboard')}
          className={cn(
            "w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-sm font-semibold",
            currentView === 'dashboard' ? "bg-indigo-50 text-indigo-700" : "hover:bg-white/50 text-slate-600"
          )}
        >
          <Library className="w-4 h-4" />
          {t('dashboard')}
        </button>
        
        <button
          onClick={onNewDocument}
          className="w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-sm font-medium hover:bg-white/50 text-slate-600"
        >
          <PlusCircle className="w-4 h-4" />
          {t('newBlank')}
        </button>
      </nav>

      <div className="mt-auto space-y-2">
        <div className="flex items-center gap-2 p-2 bg-white/50 rounded-lg border border-white/60">
          <Globe className="w-4 h-4 text-slate-500" />
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value as any)}
            className="bg-transparent text-sm font-medium text-slate-600 focus:outline-none cursor-pointer w-full"
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="p-4 bg-indigo-600/10 rounded-2xl border border-indigo-200/50">
          <button className="w-full flex items-center gap-3 text-sm font-medium hover:text-indigo-700 text-slate-600 transition-colors">
            <Settings className="w-4 h-4" />
            {t('settings')}
          </button>
        </div>
      </div>
    </div>
  );
};
