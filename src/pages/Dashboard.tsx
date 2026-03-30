import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Zap, Target, TrendingUp, BookOpen, AlertCircle, Loader2, RefreshCw, ArrowRight } from 'lucide-react';
import { ChallengeCard } from '@/src/components/dashboard/ChallengeCard';
import { StatsChart } from '@/src/components/dashboard/StatsChart';
import { Challenge } from '@/src/types';
import { progressApi, ProgressResponse } from '@/src/lib/api';

const API_BASE = 'http://localhost:3001/api';

function getToken(): string | null { return localStorage.getItem('rycode_token'); }

const FALLBACK_CHALLENGES: Challenge[] = [
  {
    id: '1',
    title: '数组迭代优化',
    difficulty: '简单',
    xp: 50,
    description: '使用 ES6+ 语法重构传统的 for 循环，提升代码可读性与执行效率。',
    level: 'Level 1',
    category: 'Basic'
  },
  {
    id: '2',
    title: '异步并发控制器',
    difficulty: '中等',
    xp: 120,
    description: '实现一个限制并发请求数量的 Promise 调度器，确保在高负载下的稳定性。',
    level: 'Level 3',
    category: 'Async'
  },
  {
    id: '3',
    title: '双向链表反转',
    difficulty: '困难',
    xp: 300,
    description: '不使用额外空间，在 O(n) 时间复杂度内完成复杂数据结构的拓扑变换。',
    level: 'Level 5',
    category: 'Algorithm'
  }
];

interface ProblemForEditor {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  hints: string[];
  starterCode?: string;
  language?: string;
  xp?: number;
}

interface DashboardProps {
  onStartChallenge: (id: string, problem?: ProblemForEditor) => void;
  inProgressLessons: Record<string, string>;
  isGenerating?: boolean;
  generatedProblems?: ProblemForEditor[];
  currentLessonId?: string;
  onRefreshTasks?: () => void;
  onNextLesson?: () => void;
}

interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  xp: number;
  hints: string[];
}

export const Dashboard: React.FC<DashboardProps> = ({ onStartChallenge, isGenerating = false, generatedProblems = [], currentLessonId, onRefreshTasks, onNextLesson }) => {
  const [progressData, setProgressData] = useState<ProgressResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    progressApi.get()
      .then(data => setProgressData(data))
      .catch(() => setProgressData(null))
      .finally(() => setIsLoading(false));
  }, []);

  const stats = progressData?.stats;
  const weakPoints = progressData?.weakPoints ?? [];
  const xp = (stats?.completedLessons ?? 0) * 100 + (stats?.averageScore ?? 0) * 5;

  // Convert generatedProblems to Challenge format
  const challenges: Challenge[] = generatedProblems.map(p => ({
    id: p.id,
    title: p.title,
    description: p.description,
    difficulty: p.difficulty === '简单' ? '简单' : p.difficulty === '困难' ? '困难' : '中等',
    xp: p.xp ?? 100,
    level: `Level ${Math.ceil((p.xp ?? 100) / 100)}`,
    category: 'Lesson',
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full p-10 custom-scrollbar overflow-y-auto"
    >
      {/* Welcome header */}
      <section className="mb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-4xl font-headline font-bold text-on-surface tracking-tight mb-2">
              欢迎回来，<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dim">开发者</span>
            </h2>
            <p className="text-on-surface-variant max-w-2xl leading-relaxed">
              准备好开始今天的练习了吗？通过完成每日挑战，持续精进你的编程技艺，并在数据面板中见证你的点滴进步。
            </p>
          </div>
          <button
            onClick={() => onStartChallenge('editor')}
            className="px-8 py-4 signature-texture text-on-primary rounded-2xl font-bold text-sm hover:scale-105 transition-all shadow-[0_10px_30px_rgba(163,166,255,0.2)] flex items-center gap-2"
          >
            开始学习
            <Zap className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Stats cards */}
      <section className="mb-12 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/5 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">当前 XP</h4>
            <div className="text-3xl font-headline font-bold text-primary">
              {isLoading ? '...' : xp.toLocaleString()}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Zap className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/5 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">完成课时</h4>
            <div className="text-3xl font-headline font-bold text-secondary">
              {isLoading ? '...' : stats?.completedLessons ?? 0}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/5 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">总提交次数</h4>
            <div className="text-3xl font-headline font-bold text-tertiary">
              {isLoading ? '...' : stats?.totalAttempts ?? 0}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary">
            <Target className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/5 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">平均分</h4>
            <div className="text-3xl font-headline font-bold text-emerald-400">
              {isLoading ? '...' : stats?.averageScore ?? 0}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-400/10 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </section>

      {/* Challenges */}
      <section className="mb-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h3 className="text-xl font-headline font-semibold text-on-surface">任务挑战</h3>
            <p className="text-xs text-on-surface-variant mt-1">
              {isGenerating ? '正在生成任务...' : challenges.length > 0 ? `${challenges.length} 个任务待完成` : '从教材目录生成任务后显示在这里'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {currentLessonId && onRefreshTasks && (
              <button
                onClick={onRefreshTasks}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-surface-container-highest text-on-surface-variant hover:text-on-surface hover:bg-surface-bright disabled:opacity-40 transition-all"
                title="重新生成当前课时的任务"
              >
                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                刷新任务
              </button>
            )}
            {currentLessonId && onNextLesson && (
              <button
                onClick={onNextLesson}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/20 disabled:opacity-40 transition-all"
                title="生成下一课时的任务"
              >
                下一章节
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() => onStartChallenge('catalog')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all"
            >
              去教材目录
            </button>
          </div>
        </div>

        {isGenerating && challenges.length === 0 ? (
          <div className="bg-surface-container-low rounded-xl p-10 border border-outline-variant/5 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-10 h-10 text-primary/60 animate-spin mb-4" />
            <h4 className="text-base font-bold text-on-surface mb-2">正在生成练习题...</h4>
            <p className="text-sm text-on-surface-variant">AI 正在为当前课时生成个性化题目</p>
          </div>
        ) : challenges.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {challenges.map((c, i) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                onStart={() => onStartChallenge('editor', generatedProblems[i])}
              />
            ))}
          </div>
        ) : (
          <div className="bg-surface-container-low rounded-xl p-10 border border-outline-variant/5 flex flex-col items-center justify-center text-center">
            <BookOpen className="w-10 h-10 text-primary/30 mb-4" />
            <h4 className="text-base font-bold text-on-surface mb-2">暂无任务</h4>
            <p className="text-sm text-on-surface-variant">前往教材目录，点击课时的「生成任务」按钮</p>
            <button
              onClick={() => onStartChallenge('catalog')}
              className="mt-4 px-4 py-2 text-xs font-bold bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all"
            >去教材目录</button>
          </div>
        )}
      </section>

      {/* Chart + weak points */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-surface-container-low rounded-xl p-8 border border-outline-variant/5">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-headline font-bold">练习概览</h3>
              <p className="text-xs text-on-surface-variant">过去 7 天的评分趋势</p>
            </div>
          </div>
          <StatsChart data={stats?.chartData} />
        </div>

        <div className="lg:col-span-4 space-y-4">
          {/* Weak points */}
          {weakPoints.length > 0 ? (
            <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/5">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 text-secondary" />
                <h4 className="text-sm font-bold text-on-surface">需要加强</h4>
              </div>
              <div className="space-y-2">
                {weakPoints.slice(0, 4).map(wp => (
                  <div key={wp.topic} className="flex items-center justify-between">
                    <span className="text-xs text-on-surface-variant">{wp.topic}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 bg-surface-container-highest rounded-full overflow-hidden">
                        <div
                          className="h-full bg-secondary rounded-full"
                          style={{ width: `${Math.min(wp.count * 20, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-secondary">{wp.count}次</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-[#141f38] to-[#091328] rounded-xl p-6 border border-primary/10">
              <h4 className="text-sm font-bold text-primary mb-2">开始你的学习之旅</h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                完成课时练习后，AI 将分析你的薄弱点并给出个性化建议。
              </p>
            </div>
          )}

          <div className="bg-gradient-to-br from-[#141f38] to-[#091328] rounded-xl p-6 border border-primary/10 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
              <Zap className="w-32 h-32" />
            </div>
            <h4 className="text-sm font-bold text-primary mb-2">掌握度提升</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {weakPoints.length > 0
                ? `你在「${weakPoints[0].topic}」方面需要加强练习，继续保持！`
                : '导入课程并开始练习，持续追踪你的进步。'
              }
            </p>
          </div>
        </div>
      </section>
    </motion.div>
  );
};
