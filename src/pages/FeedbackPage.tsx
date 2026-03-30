import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart3, Zap, FileText, CheckCircle2, RefreshCw, ArrowRight, MessageCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import ReactMarkdown from 'react-markdown';
import type { AppFeedback } from '@/src/App';

// Keep for backward compatibility
export interface FeedbackData {
  score: number;
  grade: string;
  efficiency: number;
  readability: number;
  correctness: number;
  commentary: string;
  suggestedCode: string;
  weakPoints?: string[];
}

interface FeedbackPageProps {
  data?: AppFeedback | null;
  onTryAgain?: () => void;
  onNextTask?: () => void;
}

const DEFAULT_DATA: AppFeedback = {
  score: 85,
  grade: 'A-',
  efficiency: 78,
  readability: 88,
  correctness: 90,
  commentary: '您的逻辑很严密，但在优化递归调用的内存开销方面仍有改进空间。\n\n**优点**\n- 代码结构清晰\n- 命名规范\n\n**改进建议**\n- 考虑使用迭代替代递归以节省栈空间',
  suggestedCode: '# 优化版本\ndef find_duplicates_fast(data):\n    seen = set()\n    dups = set()\n    for x in data:\n        if x in seen:\n            dups.add(x)\n        seen.add(x)\n    return list(dups)',
  originalCode: '',
  submissionId: undefined,
  problemTitle: undefined,
};

function ScoreRing({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="bg-surface-container-low p-6 rounded-xl hover:bg-surface-bright transition-colors">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-outline uppercase tracking-widest">{label}</span>
        <span className={cn('text-xs font-bold font-mono', color)}>{value}</span>
      </div>
      <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          className={cn('h-full rounded-full', color.replace('text-', 'bg-'))}
        />
      </div>
    </div>
  );
}

export const FeedbackPage: React.FC<FeedbackPageProps> = ({ data, onTryAgain, onNextTask }) => {
  const d = data ?? DEFAULT_DATA;

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const sendMessage = async () => {
    if (!chatInput.trim() || !d.submissionId || isChatLoading) return;
    const userMsg = { role: 'user' as const, content: chatInput };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput('');
    setIsChatLoading(true);
    try {
      const token = localStorage.getItem('rycode_token');
      const res = await fetch('http://localhost:3001/api/review/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ submissionId: d.submissionId, messages: newMessages }),
      });
      const respData = await res.json();
      if (res.ok) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: respData.reply }]);
      }
    } catch {
      // Silently fail
    } finally {
      setIsChatLoading(false);
    }
  };

  const gradeColor =
    d.score >= 90 ? 'text-emerald-400' :
    d.score >= 75 ? 'text-primary' :
    d.score >= 60 ? 'text-secondary' :
    'text-error';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-12 custom-scrollbar overflow-y-auto h-full"
    >
      {/* Header */}
      <div className="grid grid-cols-12 gap-8 mb-12">
        <div className="col-span-12 lg:col-span-7">
          <h1 className="font-headline text-[3.5rem] leading-[1.1] font-bold tracking-tighter text-on-surface mb-4">
            分析<span className="text-primary">完成。</span>
          </h1>
          <div className="text-on-surface-variant font-body text-base max-w-xl prose prose-invert prose-sm">
            <ReactMarkdown>{d.commentary.split('\n')[0]}</ReactMarkdown>
          </div>
          {d.weakPoints && d.weakPoints.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {d.weakPoints.map(wp => (
                <span key={wp} className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                  薄弱点: {wp}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-12 lg:col-span-5 relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-tertiary/20 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000" />
          <div className="relative bg-surface-container-high rounded-xl p-8 flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <BarChart3 className="w-24 h-24" />
            </div>
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className={cn('text-[5rem] font-headline font-extrabold leading-none tracking-tighter mb-2', gradeColor)}
            >
              {d.score}<span className="text-2xl text-outline-variant">/100</span>
            </motion.div>
            <div className="px-4 py-1 rounded-full bg-secondary-container/30 text-secondary-dim text-xs font-bold tracking-widest uppercase">
              性能等级: {d.grade}
            </div>
          </div>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <ScoreRing value={d.efficiency} label="效率" color="text-primary" />
        <ScoreRing value={d.readability} label="可读性" color="text-secondary" />
        <ScoreRing value={d.correctness} label="正确性" color="text-emerald-400" />
      </div>

      {/* AI Commentary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div className="bg-surface-container-low rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-widest">AI 评语</h3>
          </div>
          <div className="text-sm text-on-surface-variant leading-relaxed prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{d.commentary}</ReactMarkdown>
          </div>
        </div>

        {/* Suggested code */}
        <div className="bg-surface-container-low rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-widest">AI 优化方案</h3>
          </div>
          <pre className="text-xs font-mono text-on-surface-variant bg-surface-container-highest rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
            {d.suggestedCode}
          </pre>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={onTryAgain}
          className="flex items-center gap-2 px-6 py-3 bg-surface-container-high text-on-surface rounded-xl text-sm font-bold hover:bg-surface-bright transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          重新挑战
        </button>
        <button
          onClick={onNextTask}
          className="flex items-center gap-2 px-6 py-3 signature-texture text-on-primary rounded-xl text-sm font-bold hover:scale-105 transition-all"
        >
          下一题
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* AI Chat */}
      <div className="border-t border-outline-variant/10 pt-6">
        <button
          onClick={() => setChatOpen(v => !v)}
          className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          {chatOpen ? '收起对话' : '向 AI 提问'}
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', chatOpen && 'rotate-180')} />
        </button>
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 bg-surface-container-low rounded-xl border border-outline-variant/10 flex flex-col" style={{ maxHeight: 400 }}>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[120px]">
                  {chatMessages.length === 0 && (
                    <p className="text-xs text-on-surface-variant text-center py-4">可以问我："为什么这里错了？" "如何优化？" "能解释一下评分吗？"</p>
                  )}
                  {chatMessages.map((m, i) => (
                    <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed', m.role === 'user' ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface')}>
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-surface-container-highest px-3 py-2 rounded-xl text-xs text-on-surface-variant">AI 思考中...</div>
                    </div>
                  )}
                </div>
                {/* Input */}
                <div className="border-t border-outline-variant/10 p-3 flex gap-2">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder={d.submissionId ? '问点什么...' : '需要先提交作业才能对话'}
                    disabled={!d.submissionId || isChatLoading}
                    className="flex-1 bg-surface-container-highest text-on-surface text-xs px-3 py-2 rounded-lg outline-none border border-outline-variant/20 focus:border-primary/50 disabled:opacity-50"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!chatInput.trim() || !d.submissionId || isChatLoading}
                    className="px-3 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-primary/90 transition-colors"
                  >
                    发送
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
