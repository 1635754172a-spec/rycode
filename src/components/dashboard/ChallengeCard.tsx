import React from 'react';
import { ArrowRight, Zap, Flame, Sparkles } from 'lucide-react';
import { Challenge } from '@/src/types';
import { cn } from '@/src/lib/utils';

interface ChallengeCardProps {
  challenge: Challenge;
  onStart: (id: string) => void;
}

export const ChallengeCard: React.FC<ChallengeCardProps> = ({ challenge, onStart }) => {
  const difficultyStyles = {
    '简单': {
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      icon: Sparkles
    },
    '中等': {
      badge: 'bg-secondary/10 text-secondary border-secondary/20',
      icon: Zap
    },
    '困难': {
      badge: 'bg-error/10 text-error border-error/20',
      icon: Flame
    },
  };

  const style = difficultyStyles[challenge.difficulty as keyof typeof difficultyStyles] || difficultyStyles['简单'];
  const Icon = style.icon;

  return (
    <div className="bg-surface-container-high rounded-xl p-6 flex flex-col group hover:bg-surface-bright transition-all duration-300 relative overflow-hidden border border-outline-variant/5">
      {challenge.difficulty === '中等' && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
      )}
      {challenge.difficulty === '困难' && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-error/5 rounded-full -mr-16 -mt-16 blur-3xl" />
      )}
      
      <div className="flex justify-between items-start mb-6">
        <span className={cn(
          "px-2 py-1 text-[10px] font-bold rounded border uppercase tracking-tighter",
          style.badge
        )}>
          {challenge.difficulty}
        </span>
        <span className="text-xs font-mono text-on-surface-variant">+{challenge.xp} XP</span>
      </div>

      <h4 className="text-lg font-headline font-bold text-on-surface mb-3 group-hover:text-primary transition-colors">
        {challenge.title}
      </h4>
      <p className="text-sm text-on-surface-variant leading-relaxed mb-8 flex-1">
        {challenge.description}
      </p>

      <button 
        onClick={() => onStart(challenge.id)}
        className={cn(
          "w-full py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-black text-white border border-white/10 hover:scale-[1.02] active:scale-[0.98] shadow-xl"
        )}
      >
        开始学习
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
};
