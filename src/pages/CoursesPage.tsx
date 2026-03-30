import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, ChevronRight, Search, Zap, Code2, Brain } from 'lucide-react';
import { cn } from '@/src/lib/utils';

const courses = [
  {
    id: '1',
    title: 'Neon Architect 核心渲染引擎',
    description: '深入了解 Neon Architect 系统的渲染机制，掌握矩阵变换与光影追踪的核心算法。',
    modules: 12,
    duration: '45h',
    difficulty: '困难',
    progress: 72,
    icon: Zap,
    color: 'text-primary'
  },
  {
    id: '2',
    title: '高级 TypeScript 架构模式',
    description: '探索 TypeScript 的高级类型系统，学习如何构建可扩展、类型安全的复杂应用架构。',
    modules: 8,
    duration: '28h',
    difficulty: '中等',
    progress: 48,
    icon: Code2,
    color: 'text-secondary'
  },
  {
    id: '3',
    title: 'AI 驱动的算法优化',
    description: '利用 AI 技术辅助算法设计与性能调优，探索下一代软件开发的无限可能。',
    modules: 6,
    duration: '15h',
    difficulty: '简单',
    progress: 15,
    icon: Brain,
    color: 'text-tertiary-dim'
  }
];

export const CoursesPage: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-10 h-full overflow-y-auto custom-scrollbar"
    >
      <section className="mb-12 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-headline font-bold text-on-surface tracking-tight mb-2">
            教材<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dim">目录</span>
          </h2>
          <p className="text-on-surface-variant max-w-2xl leading-relaxed">
            系统化的课程体系，助你从基础到进阶，全面掌握 Neon Architect 的核心技术。
          </p>
        </div>
        <div className="relative group">
          <span className="absolute inset-y-0 left-3 flex items-center text-outline-variant">
            <Search className="w-4 h-4" />
          </span>
          <input 
            type="text" 
            placeholder="搜索课程或知识点..." 
            className="bg-surface-container-high border-none rounded-lg py-2 pl-10 pr-4 text-xs w-64 focus:ring-1 focus:ring-primary text-on-surface transition-all"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {courses.map((course) => (
          <motion.div
            key={course.id}
            whileHover={{ y: -5 }}
            className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/10 group cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-colors" />
            
            <div className="flex items-start justify-between mb-8">
              <div className={cn("p-3 rounded-xl bg-surface-container-high", course.color)}>
                <course.icon className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 bg-surface-container-highest text-[10px] font-bold uppercase tracking-widest text-on-surface-variant rounded-full border border-outline-variant/5">
                {course.difficulty}
              </span>
            </div>

            <h3 className="text-xl font-headline font-bold text-on-surface mb-4 group-hover:text-primary transition-colors">
              {course.title}
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed mb-8 line-clamp-2">
              {course.description}
            </p>

            <div className="space-y-6">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">
                <div className="flex items-center gap-4">
                  <span>{course.modules} 章节</span>
                  <span>{course.duration}</span>
                </div>
                <span className="text-primary">{course.progress}%</span>
              </div>
              
              <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${course.progress}%` }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(163,166,255,0.4)]"
                />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-outline-variant/5 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60">继续学习</span>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-all">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <section className="mt-16 p-10 rounded-3xl bg-gradient-to-br from-surface-container-high to-surface-container-low border border-outline-variant/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -mr-64 -mt-64" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="w-6 h-6 text-primary" />
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-primary">学习路径</span>
            </div>
            <h3 className="text-3xl font-headline font-bold text-on-surface mb-4">定制你的技术成长曲线</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              根据你的基础与目标，我们为你规划了最优的学习路径。从零开始，逐步掌握 Neon Architect 的每一个核心模块。
            </p>
          </div>
          <button className="px-8 py-4 bg-primary text-on-primary rounded-xl font-headline font-bold text-sm tracking-tighter shadow-[0_0_30px_rgba(163,166,255,0.3)] hover:scale-105 active:scale-95 transition-all">
            开始测评
          </button>
        </div>
      </section>
    </motion.div>
  );
};
