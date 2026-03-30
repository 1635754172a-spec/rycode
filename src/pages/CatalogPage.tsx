import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  FolderOpen, 
  Folder, 
  Database, 
  Upload,
  Link,
  FileText,
  Trash2,
  Loader2,
  RefreshCw,
  CheckCircle2,
  X
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { coursesApi } from '@/src/lib/api';

interface SubLesson {
  id: string;
  title: string;
  difficulty: 'EASY' | 'MID' | 'HARD' | 'ELITE';
}

interface Lesson {
  id: string;
  title: string;
  difficulty: 'EASY' | 'MID' | 'HARD' | 'ELITE';
  children?: SubLesson[];
}

interface Unit {
  id: string;
  title: string;
  subtitle: string;
  lessons: Lesson[];
}

interface Textbook {
  id: string;
  index: string;
  title: string;
  color: string;
  units: Unit[];
}

export interface GeneratedProblem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  hints: string;
  starterCode: string;
  language: string;
}

interface CatalogPageProps {
  onGenerateTask: (lessonId: string) => void;
  isGenerating?: boolean;
}

// Import functions that POST to /api/import/* endpoints
const API_BASE = 'http://localhost:3001/api';

function getToken(): string | null {
  return localStorage.getItem('rycode_token');
}

async function uploadImport(file: File, difficulty?: string, targetAudience?: string): Promise<{ success: boolean; textbook?: Textbook }> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);
  if (difficulty) formData.append('difficulty', difficulty);
  if (targetAudience) formData.append('targetAudience', targetAudience);

  const res = await fetch(`${API_BASE}/import/file`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

async function urlImport(url: string, difficulty?: string, targetAudience?: string): Promise<{ success: boolean; textbook?: Textbook }> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/import/url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ url, difficulty, targetAudience }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

async function textImport(text: string, title?: string, difficulty?: string, targetAudience?: string): Promise<{ success: boolean; textbook?: Textbook }> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/import/text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ text, title, difficulty, targetAudience }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

type ImportTab = 'file' | 'url' | 'text';

const difficultyColors: Record<string, string> = {
  EASY: 'text-emerald-500 bg-emerald-500/10',
  MID: 'text-primary bg-primary/10',
  HARD: 'text-secondary bg-secondary/10',
  ELITE: 'text-error bg-error/10',
};

export const CatalogPage: React.FC<CatalogPageProps> = ({
  onGenerateTask
}) => {
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTextbooks, setExpandedTextbooks] = useState<string[]>([]);
  const [expandedUnits, setExpandedUnits] = useState<string[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ImportTab>('file');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [generatingLessonId, setGeneratingLessonId] = useState<string | null>(null);
  const [generateToast, setGenerateToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [expandedLessons, setExpandedLessons] = useState<string[]>([]);
  
  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // URL import state
  const [importUrl, setImportUrl] = useState('');
  
  // Text import state
  const [importText, setImportText] = useState('');
  const [importTitle, setImportTitle] = useState('');

  // Load textbooks on mount
  const loadTextbooks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await coursesApi.list();
      setTextbooks(response.textbooks || []);
      // Auto-expand loaded textbooks
      if (response.textbooks?.length) {
        // Only expand all textbooks by default, but only first unit of first textbook
        setExpandedTextbooks(response.textbooks.map((t: Textbook) => t.id));
        const firstTextbook = response.textbooks[0];
        const firstUnitId = firstTextbook?.units?.[0]?.id;
        setExpandedUnits(firstUnitId ? [firstUnitId] : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
      setTextbooks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTextbooks();
  }, []);
  
  const toggleTextbook = (id: string) => {
    setExpandedTextbooks(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const toggleUnit = (id: string) => {
    setExpandedUnits(prev => 
      prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]
    );
  };

  const toggleLesson = (lessonId: string) => {
    setExpandedLessons(prev =>
      prev.includes(lessonId) ? prev.filter(id => id !== lessonId) : [...prev, lessonId]
    );
  };

  const handleGenerateProblems = (lessonId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Trigger background generation via parent — non-blocking
    onGenerateTask(lessonId);
    setGenerateToast({ msg: '正在后台生成任务，可自由切换页面...', type: 'success' });
    setTimeout(() => setGenerateToast(null), 3000);
  };

  const handleDeleteTextbook = async (textbookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这门课程吗？此操作不可撤销。')) return;
    
    try {
      await coursesApi.delete(textbookId);
      setTextbooks(prev => prev.filter(t => t.id !== textbookId));
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportError(null);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setImportError(null);
    
    try {
      if (activeTab === 'file') {
        if (!selectedFile) {
          throw new Error('请选择要上传的文件');
        }
        await uploadImport(selectedFile);
      } else if (activeTab === 'url') {
        if (!importUrl.trim()) {
          throw new Error('请输入导入链接');
        }
        await urlImport(importUrl.trim());
      } else if (activeTab === 'text') {
        if (!importText.trim()) {
          throw new Error('请输入课程内容');
        }
        await textImport(importText.trim(), importTitle.trim() || undefined);
      }
      
      // Success: close modal and refresh
      setShowImportModal(false);
      resetImportForm();
      await loadTextbooks();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : '导入失败');
    } finally {
      setImporting(false);
    }
  };

  const resetImportForm = () => {
    setSelectedFile(null);
    setImportUrl('');
    setImportText('');
    setImportTitle('');
    setImportError(null);
    setActiveTab('file');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const closeImportModal = () => {
    if (!importing) {
      setShowImportModal(false);
      resetImportForm();
    }
  };

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="max-w-6xl mx-auto space-y-12 pb-32">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="flex items-center gap-4 mb-6 border-b border-outline-variant/10 pb-4">
            <div className="h-6 w-12 bg-surface-container-highest rounded" />
            <div className="h-8 w-64 bg-surface-container-highest rounded" />
          </div>
          <div className="space-y-4">
            {[1, 2].map((j) => (
              <div key={j} className="bg-surface-container-low p-6 rounded-lg">
                <div className="h-6 w-48 bg-surface-container-highest rounded mb-4" />
                <div className="space-y-2">
                  {[1, 2, 3].map((k) => (
                    <div key={k} className="h-10 bg-surface-container rounded" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // Empty state
  const EmptyState = () => (
    <div className="max-w-6xl mx-auto flex flex-col items-center justify-center py-32">
      <div className="w-24 h-24 rounded-3xl bg-surface-container-high flex items-center justify-center mb-8">
        <Database className="w-12 h-12 text-primary/40" />
      </div>
      <h2 className="text-2xl font-headline font-bold text-on-surface mb-4">还没有课程</h2>
      <p className="text-on-surface-variant mb-8 text-center max-w-md">
        导入您的第一门课程，开始您的学习之旅
      </p>
      <button 
        onClick={() => setShowImportModal(true)}
        className="px-8 py-4 bg-primary text-on-primary rounded-xl text-sm font-bold hover:scale-105 transition-all shadow-[0_0_20px_rgba(163,166,255,0.3)]"
      >
        导入第一门课程
      </button>
    </div>
  );

  return (
    <div className="h-full bg-surface custom-scrollbar overflow-y-auto relative scroll-smooth">
      <AnimatePresence>
        {generateToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              'fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg flex items-center gap-3 font-bold text-sm',
              generateToast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            )}
          >
            {generateToast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {generateToast.msg}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="p-12 pb-48">
        <header className="mb-16 max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Database className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono text-primary uppercase tracking-[0.3em]">Curriculum Catalog</span>
            </div>
            <h1 className="text-6xl font-headline font-bold text-on-surface tracking-tight leading-tight">
              教材 <span className="text-primary italic">目录</span>
            </h1>
            <div className="h-1 w-24 bg-gradient-to-r from-primary to-primary-dim mt-6" />
          </div>
          
          <div className="flex flex-col gap-4 w-full max-w-md">
            <button 
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-sm font-bold hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              导入课程
            </button>
          </div>
        </header>

        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="max-w-6xl mx-auto text-center py-16">
            <p className="text-error mb-4">{error}</p>
            <button 
              onClick={loadTextbooks}
              className="px-6 py-3 bg-surface-container-high text-on-surface rounded-xl text-sm font-bold hover:bg-surface-bright transition-all"
            >
              重新加载
            </button>
          </div>
        ) : textbooks.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="max-w-6xl mx-auto space-y-12 pb-32">
            {textbooks.map((textbook) => {
              return (
                <section key={textbook.id} className="group">
                  {/* Level 1 Heading: Textbook */}
                  <div className="flex items-center gap-4 mb-6 border-b border-outline-variant/10 pb-4">
                    <span className={cn(
                      "text-[10px] font-mono px-2 py-1 rounded",
                      textbook.color === 'primary' ? "text-primary bg-primary/10" :
                      textbook.color === 'secondary' ? "text-secondary bg-secondary/10" :
                      textbook.color === 'tertiary' ? "text-tertiary bg-tertiary/10" :
                      "text-on-surface-variant bg-surface-container-highest"
                    )}>
                      {textbook.index}
                    </span>
                    <h2 className="text-2xl font-headline font-semibold text-on-surface">
                      {textbook.title}
                    </h2>
                    
                    <button 
                      onClick={(e) => handleDeleteTextbook(textbook.id, e)}
                      className="p-1.5 text-on-surface-variant/50 hover:text-error transition-colors rounded-lg hover:bg-error/10 ml-auto"
                      title="删除课程"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <button 
                      onClick={() => toggleTextbook(textbook.id)}
                      className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                    >
                      {expandedTextbooks.includes(textbook.id) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                  </div>

                  <AnimatePresence>
                    {expandedTextbooks.includes(textbook.id) && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-4 overflow-hidden"
                      >
                        {textbook.units?.map((unit) => (
                          <div key={unit.id} className={cn(
                            "bg-surface-container-low p-1 rounded-lg border-l-4 transition-all duration-300 overflow-hidden border border-outline-variant/10",
                            "border-transparent hover:border-outline-variant/30"
                          )}>
                            {/* Level 2 Heading: Unit */}
                            <button 
                              onClick={() => toggleUnit(unit.id)}
                              className="w-full flex items-center justify-between px-6 py-4 bg-surface-container-high rounded-md group/unit text-left hover:bg-surface-bright transition-all"
                            >
                              <div className="flex items-center gap-4">
                                {expandedUnits.includes(unit.id) ? 
                                  <FolderOpen className={cn("w-5 h-5 transition-transform group-hover/unit:scale-110", textbook.color === 'primary' ? "text-primary" : textbook.color === 'secondary' ? "text-secondary" : textbook.color === 'tertiary' ? "text-tertiary" : "text-on-surface-variant")} /> : 
                                  <Folder className="w-5 h-5 text-on-surface-variant group-hover/unit:text-primary transition-colors" />
                                }
                                <div>
                                  <h3 className="font-medium transition-colors text-on-surface">
                                    {unit.title}
                                  </h3>
                                  <p className="text-[10px] text-on-surface-variant mt-0.5">{unit.subtitle}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <ChevronDown className={cn(
                                  "w-4 h-4 transition-transform duration-300",
                                  expandedUnits.includes(unit.id) ? "rotate-180 text-primary" : "text-on-surface-variant/50"
                                )} />
                              </div>
                            </button>

                            <AnimatePresence>
                              {expandedUnits.includes(unit.id) && (
                                <motion.div
                                  initial={{ height: 0 }}
                                  animate={{ height: 'auto' }}
                                  exit={{ height: 0 }}
                                  className="mt-1 space-y-px overflow-hidden"
                                >
                                  {unit.lessons?.map((lesson) => {
                                    const hasChildren = (lesson.children?.length ?? 0) > 0;
                                    const isLessonExpanded = expandedLessons.includes(lesson.id);

                                    return (
                                      /* Level 3: Lesson */
                                      <div key={lesson.id}>
                                        <div 
                                          onClick={() => hasChildren ? toggleLesson(lesson.id) : undefined}
                                          className={cn(
                                            "flex items-center px-12 py-3 bg-surface-container/30 hover:bg-surface-bright transition-colors cursor-pointer group/item",
                                            hasChildren ? 'cursor-pointer' : 'cursor-default'
                                          )}
                                        >
                                          <h4 className="flex-1 text-sm text-on-surface group-hover/item:text-on-surface font-medium">
                                            {lesson.title}
                                          </h4>
                                          <div className="flex items-center gap-6">
                                            <span className={cn(
                                              "text-[10px] font-mono px-2 py-0.5 rounded",
                                              difficultyColors[lesson.difficulty] || "text-on-surface-variant"
                                            )}>
                                              LV. {lesson.difficulty}
                                            </span>
                                            {hasChildren && (
                                              <ChevronDown className={cn(
                                                'w-3.5 h-3.5 ml-1 transition-transform text-outline-variant',
                                                isLessonExpanded && 'rotate-180 text-primary'
                                              )} />
                                            )}
                                            <button
                                              onClick={(e) => handleGenerateProblems(lesson.id, e)}
                                              disabled={!!generatingLessonId}
                                              title="生成任务"
                                              className={cn(
                                                'ml-2 px-3 py-1 rounded-lg text-xs font-bold transition-all',
                                                generatingLessonId === lesson.id
                                                  ? 'bg-primary/20 text-primary cursor-wait'
                                                  : 'bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-30'
                                              )}
                                            >
                                              {generatingLessonId === lesson.id ? (
                                                <span className="flex items-center gap-1">
                                                  <Loader2 className="w-3 h-3 animate-spin" />
                                                  生成中
                                                </span>
                                              ) : (
                                                <span className="flex items-center gap-1">
                                                  <RefreshCw className="w-3 h-3" />
                                                  生成任务
                                                </span>
                                              )}
                                            </button>
                                          </div>
                                        </div>
                                        {/* Level 4: Sub-lessons (children) */}
                                        <AnimatePresence>
                                          {hasChildren && isLessonExpanded && (
                                            <motion.div
                                              initial={{ height: 0, opacity: 0 }}
                                              animate={{ height: 'auto', opacity: 1 }}
                                              exit={{ height: 0, opacity: 0 }}
                                              className="overflow-hidden"
                                            >
                                              {lesson.children!.map((child) => (
                                                <div
                                                  key={child.id}
                                                  className="flex items-center pl-20 pr-12 py-2 bg-surface-container/20 hover:bg-surface-bright/60 transition-colors"
                                                >
                                                  <div className="w-1.5 h-1.5 rounded-full bg-outline-variant/50 mr-3" />
                                                  <span className="flex-1 text-xs text-on-surface/70">
                                                    {child.title}
                                                  </span>
                                                  <div className="flex items-center gap-3">
                                                    <span className={cn(
                                                      'text-[10px] font-mono px-1.5 py-0.5 rounded',
                                                      difficultyColors[child.difficulty] || 'text-on-surface-variant'
                                                    )}>
                                                      LV. {child.difficulty}
                                                    </span>
                                                    <button
                                                      onClick={(e) => handleGenerateProblems(child.id, e)}
                                                      disabled={!!generatingLessonId}
                                                      title="生成任务"
                                                      className={cn(
                                                        'px-2 py-0.5 rounded text-[10px] font-bold transition-all',
                                                        generatingLessonId === child.id
                                                          ? 'bg-primary/20 text-primary cursor-wait'
                                                          : 'bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-30'
                                                      )}
                                                    >
                                                      {generatingLessonId === child.id ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                      ) : (
                                                        '生成'
                                                      )}
                                                    </button>
                                                  </div>
                                                </div>
                                              ))}
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>
                                    );
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
              );
            })}
          </div>
        )}

      <footer className="mt-24 pb-12 text-center">
        <p className="text-[10px] font-mono text-on-surface-variant tracking-widest uppercase opacity-40">
          NEON ARCHITECT // CONTINUOUS DEPLOYMENT EDUCATIONAL SYSTEM
        </p>
      </footer>

      {/* Background Decor */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
      </div>

      {/* Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
            onClick={closeImportModal}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-container-high rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-outline-variant/20"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-headline font-bold text-on-surface">导入课程</h2>
                <button 
                  onClick={closeImportModal}
                  disabled={importing}
                  className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-bright rounded-lg transition-all disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-6">
                {[
                  { id: 'file' as ImportTab, label: '文件上传', icon: Upload },
                  { id: 'url' as ImportTab, label: '链接导入', icon: Link },
                  { id: 'text' as ImportTab, label: '粘贴文本', icon: FileText },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => !importing && setActiveTab(tab.id)}
                    disabled={importing}
                    className={cn(
                      "flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50",
                      activeTab === tab.id 
                        ? "bg-primary/20 text-primary border border-primary/30" 
                        : "bg-surface-container text-on-surface-variant hover:bg-surface-bright border border-outline-variant/20"
                    )}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="min-h-[200px]">
                {activeTab === 'file' && (
                  <div className="space-y-4">
                    <div 
                      onClick={() => !importing && fileInputRef.current?.click()}
                      className={cn(
                        "border-2 border-dashed border-outline-variant/30 rounded-xl p-8 text-center cursor-pointer transition-all",
                        !importing && "hover:border-primary/50 hover:bg-primary/5"
                      )}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.md,.txt"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={importing}
                      />
                      {selectedFile ? (
                        <div className="flex items-center justify-center gap-3">
                          <FileText className="w-8 h-8 text-primary" />
                          <div className="text-left">
                            <p className="text-sm font-medium text-on-surface">{selectedFile.name}</p>
                            <p className="text-xs text-on-surface-variant">
                              {(selectedFile.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-10 h-10 text-on-surface-variant/50 mx-auto mb-3" />
                          <p className="text-sm text-on-surface-variant mb-1">
                            点击或拖拽文件到此处
                          </p>
                          <p className="text-xs text-on-surface-variant/60">
                            支持 PDF、Markdown 文件
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'url' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-on-surface-variant mb-2 block">
                        导入链接
                      </label>
                      <input
                        type="url"
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                        disabled={importing}
                        placeholder="输入 GitHub 仓库链接、YouTube 视频链接或任意网页 URL..."
                        className="w-full px-4 py-3 bg-surface-container rounded-xl border border-outline-variant/20 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
                      />
                    </div>
                    <p className="text-xs text-on-surface-variant/60">
                      支持 GitHub 仓库、YouTube 视频、博客文章等
                    </p>
                  </div>
                )}

                {activeTab === 'text' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-on-surface-variant mb-2 block">
                        课程标题（可选）
                      </label>
                      <input
                        type="text"
                        value={importTitle}
                        onChange={(e) => setImportTitle(e.target.value)}
                        disabled={importing}
                        placeholder="输入课程标题..."
                        className="w-full px-4 py-3 bg-surface-container rounded-xl border border-outline-variant/20 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-on-surface-variant mb-2 block">
                        课程内容
                      </label>
                      <textarea
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        disabled={importing}
                        placeholder="粘贴课程内容、Markdown 格式文本..."
                        rows={6}
                        className="w-full px-4 py-3 bg-surface-container rounded-xl border border-outline-variant/20 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all resize-none disabled:opacity-50"
                      />
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {importError && (
                  <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-xl">
                    <p className="text-sm text-error">{importError}</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 mt-6 pt-6 border-t border-outline-variant/20">
                <button
                  onClick={closeImportModal}
                  disabled={importing}
                  className="flex-1 px-6 py-3 bg-surface-container text-on-surface-variant rounded-xl text-sm font-bold hover:bg-surface-bright transition-all disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="flex-1 px-6 py-3 bg-primary text-on-primary rounded-xl text-sm font-bold hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      导入中...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      开始导入
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
