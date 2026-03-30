export type Page = 'dashboard' | 'editor' | 'feedback' | 'settings' | 'catalog';

export interface Challenge {
  id: string;
  title: string;
  difficulty: '简单' | '中等' | '困难';
  xp: number;
  description: string;
  level: string;
  category: string;
}

export interface FileNode {
  name: string;
  path?: string;  // relative path within workspace (e.g. "lesson-abc/solution.py")
  type: 'file' | 'folder';
  children?: FileNode[];
  isOpen?: boolean;
  isActive?: boolean;
  content?: string;
}

export interface FeedbackData {
  score: number;
  grade: string;
  efficiency: number;
  readability: number;
  correctness: number;
  commentary: string;
  originalCode: string;
  suggestedCode: string;
}
