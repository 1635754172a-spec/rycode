import React from 'react';
import { 
  LayoutDashboard, 
  Code2, 
  Brain, 
  BookOpen, 
  Settings, 
  FileText 
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Page } from '@/src/types';

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  const navItems = [
    { id: 'dashboard', label: '控制台', icon: LayoutDashboard },
    { id: 'catalog', label: '教材目录', icon: BookOpen },
    { id: 'editor', label: '编辑器', icon: Code2 },
    { id: 'feedback', label: 'AI反馈', icon: Brain },
  ];

  const footerItems = [
    { id: 'settings', label: '设置', icon: Settings },
  ];

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 z-40 bg-surface-container-low flex flex-col py-8 px-4 font-headline antialiased border-r border-outline-variant/5 shadow-[20px_0_40px_rgba(0,0,0,0.4)]">
      <div className="mb-10 px-2">
        <span className="text-2xl font-bold tracking-tighter text-primary">
          RYcode
        </span>
        <p className="text-[10px] text-outline-variant mt-1 uppercase tracking-[0.2em] font-bold">
          Coding Tutor
        </p>
      </div>

      <nav className="flex-grow space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id as Page)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group active:scale-[0.97]",
              currentPage === item.id 
                ? "text-primary bg-surface-container-high relative after:absolute after:left-0 after:h-full after:w-1 after:bg-primary after:shadow-[0_0_8px_#a3a6ff] font-bold"
                : "text-outline-variant opacity-70 hover:opacity-100 hover:bg-surface-bright hover:text-on-surface"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto space-y-1 pt-4 border-t border-outline-variant/10">
        {footerItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id as Page)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group active:scale-[0.97]",
              currentPage === item.id 
                ? "text-primary bg-surface-container-high font-bold"
                : "text-outline-variant opacity-70 hover:opacity-100 hover:bg-surface-bright hover:text-on-surface"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
};
