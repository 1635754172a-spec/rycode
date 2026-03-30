import React from 'react';

interface TopBarProps {
  title?: string;
  breadcrumb?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ breadcrumb = '主控台 / 仪表盘' }) => {
  return (
    <header className="fixed top-0 right-0 w-[calc(100%-16rem)] z-30 bg-background/80 backdrop-blur-md flex items-center h-16 px-8 font-headline border-b border-outline-variant/5">
      <span className="text-xs text-outline-variant font-mono uppercase tracking-widest">
        {breadcrumb}
      </span>
    </header>
  );
};
