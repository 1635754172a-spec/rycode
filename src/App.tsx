import React, { useState, useCallback, useEffect } from 'react';
import { Sidebar } from '@/src/components/layout/Sidebar';
import { TopBar } from '@/src/components/layout/TopBar';
import { Dashboard } from '@/src/pages/Dashboard';
import { EditorPage } from '@/src/pages/EditorPage';
import { FeedbackPage } from '@/src/pages/FeedbackPage';
import { SettingsPage } from '@/src/pages/SettingsPage';
import { CatalogPage } from '@/src/pages/CatalogPage';
import { Page } from '@/src/types';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, X, Loader2, Key } from 'lucide-react';
import type { FeedbackData } from '@/src/pages/FeedbackPage';
import { settingsApi } from '@/src/lib/api';

const API_BASE = 'http://localhost:3001/api';
function getToken() { return localStorage.getItem('rycode_token'); }

export interface AppProblem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  hints: string[];
  starterCode?: string;
  language?: string;
  xp?: number;
}

export interface AppFeedback {
  score: number;
  grade: string;
  efficiency: number;
  readability: number;
  correctness: number;
  commentary: string;
  originalCode: string;
  suggestedCode: string;
  submissionId?: string;
  problemTitle?: string;
  weakPoints?: string[];
}

function AppShell() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [lastFeedback, setLastFeedback] = useState<FeedbackData | null>(null);
  const [currentProblem, setCurrentProblem] = useState<AppProblem | null>(null);

  // API key onboarding banner
  const [showNoKeyBanner, setShowNoKeyBanner] = useState(false);

  useEffect(() => {
    // Check if user has any AI provider configured
    settingsApi.getApiKeys()
      .then(({ apiKeys }) => {
        if (apiKeys.length === 0) setShowNoKeyBanner(true);
      })
      .catch(() => {}); // silently fail if backend not ready
  }, []);

  // Global task generation state (survives page navigation)
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedProblems, setGeneratedProblems] = useState<AppProblem[]>([]);
  const [generateDoneToast, setGenerateDoneToast] = useState(false);
  const abortGenRef = React.useRef<AbortController | null>(null);
  const [currentProblemIndex, setCurrentProblemIndex] = useState<number>(-1);
  const [currentLessonId, setCurrentLessonId] = useState<string>('');

  // Global submission state (survives page navigation)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<AppFeedback | null>(null);
  const [submitDoneToast, setSubmitDoneToast] = useState(false);
  const abortSubmitRef = React.useRef<AbortController | null>(null);

  /** Trigger background code submission — non-blocking, page-independent */
  const triggerSubmit = useCallback(async (
    code: string,
    language: string,
    problemId: string,
    problemTitle: string,
    execResult?: unknown,
  ) => {
    abortSubmitRef.current?.abort();
    const ctrl = new AbortController();
    abortSubmitRef.current = ctrl;
    setIsSubmitting(true);
    try {
      const token = getToken();
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      // Run code if no execResult
      let exec = execResult;
      if (!exec) {
        const execRes = await fetch(`${API_BASE}/execute`, {
          method: 'POST', signal: ctrl.signal, headers,
          body: JSON.stringify({ code, language }),
        });
        if (ctrl.signal.aborted) return;
        exec = await execRes.json();
      }
      // AI review
      const reviewRes = await fetch(`${API_BASE}/review`, {
        method: 'POST', signal: ctrl.signal, headers,
        body: JSON.stringify({ code, language, problemId, execResult: exec }),
      });
      if (ctrl.signal.aborted) return;
      const data = await reviewRes.json();
      if (!reviewRes.ok) throw new Error(data.error ?? `HTTP ${reviewRes.status}`);
      const feedback: AppFeedback = {
        ...data.feedback,
        submissionId: data.submissionId,
        problemTitle,
        originalCode: code,
      };
      setSubmissionResult(feedback);
      setSubmitDoneToast(true);
      setTimeout(() => setSubmitDoneToast(false), 6000);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Submit failed:', err.message);
    } finally {
      if (!ctrl.signal.aborted) setIsSubmitting(false);
    }
  }, []);

  const handlePageChange = (newPage: Page) => {
    if (currentPage === newPage) return;
    setCurrentPage(newPage);
  };

  /** Trigger background problem generation — non-blocking, page-independent */
  const triggerGenerate = useCallback(async (lessonId: string) => {
    // Cancel any in-flight generation
    abortGenRef.current?.abort();
    const ctrl = new AbortController();
    abortGenRef.current = ctrl;
    setIsGenerating(true);
    // Do NOT clear existing problems — keep showing old ones until new ones arrive
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/problems/generate`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ lessonId }),
      });
      if (ctrl.signal.aborted) return;
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const problems: AppProblem[] = (data.problems ?? []).map((p: any) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        difficulty: p.difficulty,
        hints: (() => { try { return JSON.parse(p.hints ?? '[]'); } catch { return []; } })(),
        starterCode: p.starterCode,
        language: p.language ?? 'python',
        xp: p.xp,
      }));
      setGeneratedProblems(problems);
      setGenerateDoneToast(true);
      setTimeout(() => setGenerateDoneToast(false), 5000);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Generate failed:', err.message);
    } finally {
      if (!ctrl.signal.aborted) setIsGenerating(false);
    }
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard
          onStartChallenge={(id, problem?) => {
            if (id === 'catalog') { handlePageChange('catalog'); return; }
            if (problem) {
              setCurrentProblem(problem);
              const idx = generatedProblems.findIndex(p => p.id === problem.id);
              setCurrentProblemIndex(idx);
            }
            handlePageChange('editor');
          }}
          inProgressLessons={{}}
          isGenerating={isGenerating}
          generatedProblems={generatedProblems}
          currentLessonId={currentLessonId}
          onRefreshTasks={() => currentLessonId && triggerGenerate(currentLessonId)}
          onNextLesson={async () => {
            if (!currentLessonId) return;
            try {
              const token = getToken();
              const res = await fetch(`${API_BASE}/courses/lesson/${currentLessonId}/adjacent`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              const data = await res.json();
              if (data.next?.id) {
                setCurrentLessonId(data.next.id);
                triggerGenerate(data.next.id);
              }
            } catch {}
          }}
        />;
      case 'editor':
        return <EditorPage
          onSubmit={(code, language, problemId, problemTitle, execResult) =>
            triggerSubmit(code, language, problemId, problemTitle, execResult)
          }
          isSubmitting={isSubmitting}
          problem={currentProblem}
        />;
      case 'feedback':
        return <FeedbackPage
          data={submissionResult}
          onTryAgain={() => handlePageChange('editor')}
          onNextTask={() => {
            // Pick next problem from generatedProblems
            if (generatedProblems.length > 0) {
              const nextIndex = (currentProblemIndex + 1) % generatedProblems.length;
              const nextProblem = generatedProblems[nextIndex];
              setCurrentProblem(nextProblem);
              setCurrentProblemIndex(nextIndex);
            }
            handlePageChange('editor');
          }}
        />;
      case 'catalog':
        return (
          <CatalogPage
            onGenerateTask={(lessonId) => { setCurrentLessonId(lessonId); triggerGenerate(lessonId); }}
            isGenerating={isGenerating}
          />
        );
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard onStartChallenge={(id, problem?) => { if (id === 'catalog') { handlePageChange('catalog'); return; } if (problem) setCurrentProblem(problem); handlePageChange('editor'); }} inProgressLessons={{}} isGenerating={isGenerating} generatedProblems={generatedProblems} currentLessonId={currentLessonId} onRefreshTasks={() => currentLessonId && triggerGenerate(currentLessonId)} onNextLesson={async () => { if (!currentLessonId) return; try { const token = getToken(); const res = await fetch(`${API_BASE}/courses/lesson/${currentLessonId}/adjacent`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }); const data = await res.json(); if (data.next?.id) { setCurrentLessonId(data.next.id); triggerGenerate(data.next.id); } } catch {} }} />;
    }
  };

  const getBreadcrumb = () => {
    switch (currentPage) {
      case 'dashboard': return '主控台 / 仪表盘';
      case 'editor': return '编辑器 / 任务提交';
      case 'feedback': return 'AI 反馈 / 分析报告';
      case 'catalog': return '主控台 / 教材目录';
      case 'settings': return '系统设置 / API 配置';
      default: return '主控台 / 仪表盘';
    }
  };

  const getTitle = () => {
    switch (currentPage) {
      case 'editor': return 'SYNTHCODE IDE';
      case 'feedback': return 'ANALYSIS_READY';
      case 'catalog': return 'TEXTBOOK_CATALOG';
      default: return 'CODE_LAB';
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-on-surface overflow-hidden">
      <Sidebar currentPage={currentPage} onPageChange={handlePageChange} />

      <main className="flex-1 ml-64 h-screen flex flex-col relative">
        <TopBar title={getTitle()} breadcrumb={getBreadcrumb()} />

        {/* No API Key Banner */}
        <AnimatePresence>
          {showNoKeyBanner && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="fixed top-16 left-64 right-0 z-40 bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between"
            >
              <div className="flex items-center gap-2 text-xs text-amber-400">
                <Key className="w-3.5 h-3.5 shrink-0" />
                <span>尚未配置 AI 提供商 — AI 功能暂不可用。请前往设置页面添加 API Key。</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => { handlePageChange('settings'); setShowNoKeyBanner(false); }}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 underline"
                >
                  去设置
                </button>
                <button onClick={() => setShowNoKeyBanner(false)} className="text-amber-400/60 hover:text-amber-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-hidden relative flex flex-col">
          <div className="h-16 shrink-0" /> {/* Spacer for fixed TopBar */}
          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0"
              >
                {renderPage()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>



        {/* Submission Done Toast */}
        <AnimatePresence>
          {submitDoneToast && submissionResult && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 bg-primary text-on-primary rounded-full shadow-xl font-bold text-sm cursor-pointer"
              onClick={() => { setSubmitDoneToast(false); handlePageChange('feedback'); }}
            >
              <CheckCircle2 className="w-4 h-4" />
              评分完成：{submissionResult.grade} ({submissionResult.score}分) — 点击查看详细反馈
              <X className="w-3.5 h-3.5 opacity-70" onClick={(e) => { e.stopPropagation(); setSubmitDoneToast(false); }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generation Done Toast */}
        <AnimatePresence>
          {generateDoneToast && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 bg-emerald-500 text-white rounded-full shadow-xl font-bold text-sm cursor-pointer"
              onClick={() => { setGenerateDoneToast(false); handlePageChange('dashboard'); }}
            >
              <CheckCircle2 className="w-4 h-4" />
              已生成 {generatedProblems.length} 个任务 — 点击前往首页查看
              <X className="w-3.5 h-3.5 opacity-70" onClick={(e) => { e.stopPropagation(); setGenerateDoneToast(false); }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Visual Decor */}
        <div className="fixed top-[-10%] right-[-10%] w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="fixed bottom-[-10%] left-[-5%] w-[300px] h-[300px] bg-tertiary-dim/5 rounded-full blur-[100px] pointer-events-none -z-10" />

        {/* Footer Technical Info */}
        {(currentPage === 'dashboard' || currentPage === 'editor') && (
          <footer className="h-10 px-8 flex items-center justify-between bg-surface-container-lowest text-[10px] text-outline border-t border-outline-variant/10">
            <div className="flex gap-4">
              <span>VERSION: 2.4.0-STABLE</span>
              <span>LATENCY: 24MS</span>
            </div>
            <div className="font-mono uppercase tracking-widest">
              SYSTEM CORE: ENCRYPTED
            </div>
          </footer>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return <AppShell />;
}
