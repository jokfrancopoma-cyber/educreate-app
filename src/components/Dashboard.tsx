import React, { useState } from 'react';
import { Template } from '../types';
import { TEMPLATES } from '../data/templates';
import { FileText, Plus, Folder, Trash2, X, AlertTriangle, BookOpen } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface DashboardProps {
  onUseTemplate: (template: Template) => void;
  onNewBlank: () => void;
  onNavigateToBookCreator?: () => void;
  savedDocuments: any[];
  onOpenDocument: (id: string) => void;
  onDeleteDocument: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  onUseTemplate, 
  onNewBlank, 
  onNavigateToBookCreator,
  savedDocuments, 
  onOpenDocument, 
  onDeleteDocument 
}) => {
  const { t } = useLanguage();
  const [docToDelete, setDocToDelete] = useState<string | null>(null);

  const documentsBySubject = savedDocuments.reduce((acc, doc) => {
    if (!acc[doc.subject]) {
      acc[doc.subject] = [];
    }
    acc[doc.subject].push(doc);
    return acc;
  }, {} as Record<string, any[]>);

  const subjects = ['Math', 'Physics', 'Chemistry', 'Biology', 'General'];

  return (
    <div className="flex-1 overflow-auto bg-slate-200/20 p-8 z-0 relative">
      {docToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Eliminar Documento</h3>
              <p className="text-sm text-slate-500 mb-6">{t('deleteConfirm')}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDocToDelete(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={() => {
                    onDeleteDocument(docToDelete);
                    setDocToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header */}
        <div>
          <h2 className="text-4xl font-serif text-slate-800">{t('welcome')}</h2>
          <p className="text-slate-500 mt-2 font-medium">{t('startWriting')}</p>
        </div>

        {/* Templates Section */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 px-2">
            {t('startTemplate')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div 
              onClick={onNewBlank}
              className="group cursor-pointer bg-white/60 border border-white/80 rounded-xl flex flex-col items-center justify-center p-6 text-slate-500 hover:shadow-sm hover:border-indigo-300 hover:text-indigo-600 transition-all h-48 backdrop-blur-sm"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center mb-3">
                <Plus className="w-6 h-6 text-indigo-600" />
              </div>
              <span className="font-bold text-sm">{t('blankDocument')}</span>
            </div>

            {/* New: Create Book from Syllabus (IA) Card */}
            {onNavigateToBookCreator && (
              <div 
                onClick={onNavigateToBookCreator}
                className="group cursor-pointer bg-gradient-to-br from-sky-50 to-indigo-50 border border-sky-200 hover:border-sky-400 rounded-xl flex flex-col items-center justify-center p-6 text-sky-900 hover:shadow-md transition-all h-48"
              >
                <div className="w-12 h-12 rounded-full bg-sky-600 text-white flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                  <BookOpen className="w-6 h-6" />
                </div>
                <span className="font-bold text-sm text-center">Crear Libro (Sílabo IA)</span>
                <span className="text-[10px] text-sky-700 font-bold mt-1 bg-white/90 px-2 py-0.5 rounded-full border border-sky-100">Carátula • Índice • A4</span>
              </div>
            )}

            {TEMPLATES.map(template => (
              <div 
                key={template.id} 
                onClick={() => onUseTemplate(template)}
                className="cursor-pointer bg-white/60 border border-white/80 backdrop-blur-sm rounded-xl overflow-hidden hover:shadow-md transition-shadow h-48 flex flex-col relative group"
              >
                <div className={`h-2 ${template.previewColor.replace('500', '400')}`} />
                <div className="p-5 flex-1 flex flex-col bg-white/40 group-hover:bg-white/60 transition-colors">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{template.subject}</span>
                  <h4 className="font-bold text-slate-800 mb-2 leading-snug text-sm">{template.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-3 font-medium">{template.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Course Folders */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 px-2">{t('courseFolders')}</h3>
          <div className="space-y-8">
            {subjects.map(subject => {
              const docs = documentsBySubject[subject] || [];
              if (docs.length === 0) return null;
              
              return (
                <div key={subject} className="bg-white/40 p-6 rounded-2xl border border-white/60">
                  <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Folder className="w-5 h-5 text-indigo-500" />
                    {subject}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {docs.map(doc => (
                      <div 
                        key={doc.id}
                        onClick={() => onOpenDocument(doc.id)}
                        className="cursor-pointer bg-white/80 backdrop-blur-sm p-4 border border-white/80 rounded-xl hover:shadow-sm hover:border-indigo-300 transition-all flex items-start justify-between gap-3 group relative"
                      >
                        <div className="flex items-start gap-3 overflow-hidden">
                          <FileText className="w-8 h-8 text-indigo-500 shrink-0 group-hover:scale-110 transition-transform" />
                          <div className="overflow-hidden">
                            <h4 className="font-bold text-slate-800 truncate text-sm">{doc.title}</h4>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mt-1">{new Date(doc.updatedAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDocToDelete(doc.id);
                          }}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 relative z-10"
                          title="Eliminar documento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            
            {savedDocuments.length === 0 && (
              <div className="text-center py-12 bg-white/60 border border-white/80 rounded-xl backdrop-blur-sm">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">{t('noDocs')}</p>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
};

