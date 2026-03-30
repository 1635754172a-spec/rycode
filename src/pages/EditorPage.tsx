import React, { useState, useCallback, useEffect, useRef, type ComponentProps } from 'react';
import type { editor } from 'monaco-editor';
import { motion, AnimatePresence } from 'motion/react';
import { FileTree } from '@/src/components/editor/FileTree';
import { Play, Send, X, ChevronDown, Terminal, Loader2, FolderOpen } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { FileNode } from '@/src/types';
import MonacoEditor from '@monaco-editor/react';

const LANGUAGE_MAP: Record<string, string> = {
  'py': 'python',
  'js': 'javascript',
  'ts': 'typescript',
  'java': 'java',
  'cpp': 'cpp',
  'c': 'c',
  'go': 'go',
  'rs': 'rust',
  'rb': 'ruby',
  'php': 'php',
  'swift': 'swift',
  'kt': 'kotlin',
  'cs': 'csharp',
  'json': 'json',
  'md': 'markdown',
};

// ── Filesystem API helpers ─────────────────────────────────
async function filesApi<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('rycode_token');
  const res = await fetch(`http://localhost:3001/api/files${path}`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}

interface ApiFileNode { name: string; path: string; type: 'file' | 'folder'; children?: ApiFileNode[]; }

function apiTreeToFileNodes(nodes: ApiFileNode[], depth = 0): FileNode[] {
  return nodes.map(n => ({
    name: n.name,
    path: n.path,
    type: n.type,
    isOpen: false, // folders default collapsed
    children: n.children ? apiTreeToFileNodes(n.children, depth + 1) : undefined,
  }));
}

interface ExecuteResult {
  stdout: string | null;
  stderr: string | null;
  status: string;
  statusId: number;
  time: string | null;
  memory: number | null;
  isAccepted: boolean;
}

interface FeedbackResult {
  score: number;
  grade: string;
  efficiency: number;
  readability: number;
  correctness: number;
  commentary: string;
  suggestedCode: string;
  weakPoints: string[];
}

const API_BASE = 'http://localhost:3001/api';

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = localStorage.getItem('rycode_token');
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}

interface ProblemProp {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  hints: string[];
  starterCode?: string;
  language?: string;
}

export const EditorPage: React.FC<{
  onSubmit: (code: string, language: string, problemId: string, problemTitle: string, execResult?: unknown) => void;
  isSubmitting?: boolean;
  problem?: ProblemProp | null;
}> = ({ onSubmit, isSubmitting: externalSubmitting = false, problem: problemProp }) => {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [activeFile, setActiveFile] = useState('');
  const [activePath, setActivePath] = useState(''); // relative path within workspace
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [codeContent, setCodeContent] = useState('');
  const [language, setLanguage] = useState('python');
  const [problemPanelOpen, setProblemPanelOpen] = useState(true);
  const [stdin, setStdin] = useState('');
  const [showStdin, setShowStdin] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [execResult, setExecResult] = useState<ExecuteResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  // Current problem context
  const [currentProblem, setCurrentProblem] = useState<{
    id: string;
    title: string;
    description: string;
    difficulty: string;
    hints: string[];
    starterCode?: string;
  } | null>(problemProp ?? null);

  // Load workspace file tree
  const loadWorkspace = useCallback(async () => {
    try {
      const data = await filesApi<{ tree: ApiFileNode[] }>('/list');
      setFiles(apiTreeToFileNodes(data.tree));
    } catch {
      setFiles([]);
    }
  }, []);

  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);

  // When problem prop changes, create a real task file
  useEffect(() => {
    if (!problemProp) return;
    setCurrentProblem(problemProp);
    const createFile = async () => {
      try {
        const data = await filesApi<{ path: string; content: string; filename: string }>('/create-task', {
          method: 'POST',
          body: JSON.stringify({
            lessonTitle: problemProp.title,
            starterCode: problemProp.starterCode ?? '',
            language: problemProp.language ?? 'python',
          }),
        });
        setActivePath(data.path);
        setActiveFile(data.filename);
        setCodeContent(data.content);
        setLanguage(getMonacoLanguage(data.filename));
        setOpenFiles(prev => prev.includes(data.filename) ? prev : [...prev, data.filename]);
        await loadWorkspace();
      } catch (err) {
        // fallback: just set starter code
        if (problemProp.starterCode) setCodeContent(problemProp.starterCode);
        if (problemProp.language) setLanguage(problemProp.language);
      }
    };
    createFile();
  }, [problemProp?.id, loadWorkspace]);

  const [showHint, setShowHint] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [newItemDialog, setNewItemDialog] = useState<{ type: 'file' | 'folder' } | null>(null);
  const [newItemName, setNewItemName] = useState('');

  const getMonacoLanguage = (filename: string): string => {
    const ext = filename.split('.').pop() ?? 'txt';
    return LANGUAGE_MAP[ext] ?? 'plaintext';
  };

  const updateFileTree = (nodes: FileNode[], callback: (node: FileNode) => FileNode | null): FileNode[] =>
    nodes.map(node => {
      const updated = callback({ ...node });
      if (!updated) return null;
      if (updated.children) updated.children = updateFileTree(updated.children, callback);
      return updated;
    }).filter(Boolean) as FileNode[];

  const handleFileClick = async (clickedNode: FileNode) => {
    if (clickedNode.type === 'folder') {
      setFiles(prev => updateFileTree(prev, node =>
        (node.path ?? node.name) === (clickedNode.path ?? clickedNode.name) ? { ...node, isOpen: !node.isOpen } : node
      ));
      return;
    }
    const monoLang = getMonacoLanguage(clickedNode.name);
    setLanguage(monoLang);
    setActiveFile(clickedNode.name);
    const rel = clickedNode.path ?? clickedNode.name;
    setActivePath(rel);
    if (!openFiles.includes(clickedNode.name)) setOpenFiles(prev => [...prev, clickedNode.name]);
    setFiles(prev => updateFileTree(prev, node =>
      node.type === 'file' ? { ...node, isActive: (node.path ?? node.name) === rel } : node
    ));
    // Load real file content from API
    setIsLoadingFile(true);
    try {
      const data = await filesApi<{ content: string }>(`/read?path=${encodeURIComponent(rel)}`);
      setCodeContent(data.content);
    } catch {
      setCodeContent(clickedNode.content ?? '');
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleCodeChange = (value: string | undefined) => {
    const v = value ?? '';
    setCodeContent(v);
    if (activePath) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        filesApi('/write', { method: 'POST', body: JSON.stringify({ path: activePath, content: v }) })
          .catch(console.error);
      }, 1000);
    }
  };

  const handleCloseTab = (filename: string) => {
    const newOpen = openFiles.filter(f => f !== filename);
    setOpenFiles(newOpen);
    if (activeFile === filename && newOpen.length > 0) {
      setActiveFile(newOpen[newOpen.length - 1]);
    }
  };

  const handleRunCode = useCallback(async () => {
    if (!codeContent.trim()) return;
    setIsRunning(true);
    setRunError(null);
    setExecResult(null);
    try {
      const result = await apiPost<ExecuteResult>('/execute', {
        code: codeContent,
        language,
        stdin: stdin || undefined,
      });
      setExecResult(result);
    } catch (err: any) {
      setRunError(err.message ?? '执行失败');
    } finally {
      setIsRunning(false);
    }
  }, [codeContent, language, stdin]);

  const handleSubmit = useCallback(async () => {
    if (!codeContent.trim()) return;
    if (!currentProblem) {
      setRunError('请先从教材目录生成一个任务');
      return;
    }
    setRunError(null);
    // First run the code if not already run
    let execRes: ExecuteResult | null = execResult;
    try {
      if (!execRes) {
        setIsRunning(true);
        execRes = await apiPost<ExecuteResult>('/execute', { code: codeContent, language });
        setExecResult(execRes);
        setIsRunning(false);
      }
    } catch (err: any) {
      setIsRunning(false);
      setRunError(err.message ?? '执行失败');
      return;
    }
    // Trigger global submit (non-blocking)
    onSubmit(codeContent, language, currentProblem.id, currentProblem.title, execRes);
  }, [codeContent, language, execResult, currentProblem, onSubmit]);

  const confirmAddFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemDialog) return;
    const newNode: FileNode = { name: newItemName, type: newItemDialog.type, content: newItemDialog.type === 'file' ? '' : undefined, children: newItemDialog.type === 'folder' ? [] : undefined };
    setFiles(prev => {
      const addToSrc = (nodes: FileNode[]): FileNode[] =>
        nodes.map(n => n.name === 'src' && n.type === 'folder'
          ? { ...n, children: [...(n.children ?? []), newNode] }
          : { ...n, children: n.children ? addToSrc(n.children) : undefined }
        );
      return addToSrc(prev);
    });
    if (newItemDialog.type === 'file') {
      setOpenFiles(prev => [...prev, newItemName]);
      setActiveFile(newItemName);
      setCodeContent('');
      setLanguage(getMonacoLanguage(newItemName));
    }
    setNewItemDialog(null);
    setNewItemName('');
  };

  const statusColor = execResult
    ? execResult.isAccepted ? 'text-emerald-400' : 'text-error'
    : 'text-outline-variant';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-background"
    >
      <div className="flex flex-1 overflow-hidden">
        {/* Problem Side Panel */}
        <AnimatePresence initial={false}>
          {currentProblem && problemPanelOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="shrink-0 border-r border-outline-variant/10 flex flex-col overflow-hidden bg-surface-container-low"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/10 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-primary uppercase tracking-widest">题目</span>
                  <span className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full',
                    currentProblem.difficulty === '简单' ? 'bg-emerald-500/10 text-emerald-400' :
                    currentProblem.difficulty === '中等' ? 'bg-primary/10 text-primary' :
                    'bg-secondary/10 text-secondary'
                  )}>
                    {currentProblem.difficulty}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {currentProblem.hints.length > 0 && (
                    <button
                      onClick={() => { setShowHint(!showHint); setHintIndex(0); }}
                      className="text-xs font-bold text-outline-variant hover:text-primary transition-colors px-2 py-1 rounded-lg bg-surface-container-highest"
                    >💡</button>
                  )}
                  <button onClick={() => setProblemPanelOpen(false)} className="p-1 text-outline-variant hover:text-on-surface rounded">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {/* Panel content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-4">
                <h3 className="text-sm font-bold text-on-surface leading-snug">{currentProblem.title}</h3>
                <div className="text-xs text-on-surface-variant leading-relaxed whitespace-pre-wrap">{currentProblem.description}</div>
                <AnimatePresence>
                  {showHint && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-surface-container-highest rounded-lg px-3 py-2.5 text-xs text-on-surface-variant">
                        <span className="text-primary font-bold">提示 {hintIndex + 1}/{currentProblem.hints.length}: </span>
                        {currentProblem.hints[hintIndex]}
                        {hintIndex < currentProblem.hints.length - 1 && (
                          <button onClick={() => setHintIndex(i => i + 1)} className="ml-2 text-primary hover:underline">下一条 →</button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle button when panel is closed */}
        {currentProblem && !problemPanelOpen && (
          <button
            onClick={() => setProblemPanelOpen(true)}
            className="shrink-0 w-6 flex flex-col items-center justify-center bg-surface-container-low border-r border-outline-variant/10 hover:bg-surface-bright transition-colors text-outline-variant hover:text-primary"
            title="展开题目"
          >
            <ChevronDown className="w-3 h-3 -rotate-90" />
          </button>
        )}
        {/* File Tree Sidebar */}
        <div className="w-48 shrink-0 bg-surface-container-low border-r border-outline-variant/10 flex flex-col">
          <div className="px-3 py-2 border-b border-outline-variant/10 flex items-center justify-between">
            <span className="text-[10px] font-mono text-outline-variant uppercase tracking-widest">文件</span>
            <div className="flex gap-1">
              <button
                onClick={() => setNewItemDialog({ type: 'file' })}
                className="p-1 text-outline-variant hover:text-primary transition-colors text-xs"
                title="新建文件"
              >+F</button>
              <button
                onClick={() => setNewItemDialog({ type: 'folder' })}
                className="p-1 text-outline-variant hover:text-primary transition-colors text-xs"
                title="新建文件夹"
              >+D</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {files.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-3 py-8 text-center">
                <FolderOpen className="w-8 h-8 text-outline-variant/30 mb-2" />
                <p className="text-[10px] text-outline-variant/50 leading-relaxed">
                  工作区为空<br />从教材目录生成任务后文件将显示在这里
                </p>
              </div>
            ) : (
              <FileTree
                files={files}
                onFileClick={handleFileClick}
                onAddFile={(type) => setNewItemDialog({ type })}
                onRenameFile={(oldName, newName) => {
                  setFiles(prev => updateFileTree(prev, node =>
                    node.name === oldName ? { ...node, name: newName } : node
                  ));
                  if (activeFile === oldName) setActiveFile(newName);
                  setOpenFiles(prev => prev.map(f => f === oldName ? newName : f));
                }}
                onDeleteFile={async (name) => {
                  // Find path for this node
                  let deletePath = name;
                  const findPath = (nodes: FileNode[]): string | null => {
                    for (const n of nodes) {
                      if (n.name === name) return n.path ?? n.name;
                      if (n.children) { const r = findPath(n.children); if (r) return r; }
                    }
                    return null;
                  };
                  deletePath = findPath(files) ?? name;
                  // Delete from real filesystem
                  try {
                    await filesApi(`/delete?path=${encodeURIComponent(deletePath)}`, { method: 'DELETE' });
                  } catch { /* ignore — still update UI */ }
                  setFiles(prev => updateFileTree(prev, node => node.name === name ? null : node));
                  setOpenFiles(prev => prev.filter(f => f !== name));
                  if (activeFile === name) setActiveFile(openFiles.filter(f => f !== name)[0] ?? '');
                }}
              />
            )}
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center bg-surface-container-low border-b border-outline-variant/10 shrink-0 overflow-x-auto">
            {openFiles.map(filename => (
              <div
                key={filename}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-r border-outline-variant/10 cursor-pointer shrink-0 transition-colors',
                  activeFile === filename
                    ? 'bg-background text-primary border-t border-t-primary'
                    : 'text-outline-variant hover:text-on-surface hover:bg-surface-container-highest'
                )}
                onClick={() => {
                  setActiveFile(filename);
                  setLanguage(getMonacoLanguage(filename));
                }}
              >
                <span className="font-mono">{filename}</span>
                <button
                  onClick={e => { e.stopPropagation(); handleCloseTab(filename); }}
                  className="hover:text-error transition-colors opacity-60 hover:opacity-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden relative">
            {isLoadingFile && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/60">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            )}
            {!activeFile && !isLoadingFile && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
                <FolderOpen className="w-12 h-12 text-outline-variant/20 mb-4" />
                <p className="text-sm text-outline-variant/50">从教材目录点击「生成任务」开始编程</p>
              </div>
            )}
            <MonacoEditor
              height="100%"
              language={language}
              value={codeContent}
              onChange={handleCodeChange}
              theme="vs-dark"
              onMount={(editorInstance) => {
                // Force layout recalculation on mount to fix blank screen
                setTimeout(() => editorInstance.layout(), 50);
                setTimeout(() => editorInstance.layout(), 200);
              }}
              options={{
                fontSize: 14,
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                fontLigatures: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                renderLineHighlight: 'line',
                tabSize: 4,
                wordWrap: 'on',
                automaticLayout: true,
                padding: { top: 16, bottom: 16 },
                cursorBlinking: 'smooth',
                smoothScrolling: true,
                contextmenu: false,
              }}
            />
          </div>

          {/* Bottom panel: stdin + output */}
          <div className="shrink-0 border-t border-outline-variant/10 bg-surface-container-low">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-outline-variant/10">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-outline-variant" />
                <span className="text-[10px] font-mono text-outline-variant uppercase tracking-widest">终端</span>
                {execResult && (
                  <span className={cn('text-[10px] font-bold font-mono', statusColor)}>
                    [{execResult.status}] {execResult.time ? `${execResult.time}s` : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowStdin(!showStdin)}
                  className="flex items-center gap-1 text-[10px] text-outline-variant hover:text-on-surface font-mono transition-colors"
                >
                  stdin <ChevronDown className={cn('w-3 h-3 transition-transform', showStdin && 'rotate-180')} />
                </button>
                <button
                  onClick={handleRunCode}
                  disabled={isRunning}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  {isRunning ? '执行中...' : '运行'}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={externalSubmitting || isRunning}
                  className="flex items-center gap-1.5 px-3 py-1.5 signature-texture text-on-primary rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                >
                  {externalSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {externalSubmitting ? 'AI分析中...' : '提交评审'}
                </button>
              </div>
            </div>

            {/* Stdin input */}
            <AnimatePresence>
              {showStdin && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-outline-variant/10"
                >
                  <textarea
                    value={stdin}
                    onChange={e => setStdin(e.target.value)}
                    placeholder="输入 stdin 数据（可选）..."
                    className="w-full bg-transparent px-4 py-2 text-xs font-mono text-on-surface-variant resize-none outline-none h-16"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Output */}
            <div className="h-28 overflow-y-auto px-4 py-2 font-mono text-xs">
              {runError ? (
                <p className="text-error">{runError}</p>
              ) : execResult ? (
                <div>
                  {execResult.stdout && (
                    <pre className="text-emerald-400 whitespace-pre-wrap">{execResult.stdout}</pre>
                  )}
                  {execResult.stderr && (
                    <pre className="text-error whitespace-pre-wrap">{execResult.stderr}</pre>
                  )}
                  {!execResult.stdout && !execResult.stderr && (
                    <span className="text-outline-variant">（无输出）</span>
                  )}
                </div>
              ) : (
                <span className="text-outline-variant">运行代码后结果将显示在这里...</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New file/folder dialog */}
      <AnimatePresence>
        {newItemDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface-container-high border border-outline-variant/20 rounded-2xl p-8 w-96"
            >
              <h3 className="text-lg font-bold text-on-surface mb-4">
                新建{newItemDialog.type === 'file' ? '文件' : '文件夹'}
              </h3>
              <form onSubmit={confirmAddFile}>
                <input
                  autoFocus
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  placeholder={`请输入${newItemDialog.type === 'file' ? '文件' : '文件夹'}名称...`}
                  className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary rounded-xl px-4 py-2 text-sm text-on-surface transition-all mb-6 outline-none"
                />
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setNewItemDialog(null)} className="px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface">
                    取消
                  </button>
                  <button type="submit" disabled={!newItemName.trim()} className="px-4 py-2 bg-primary text-on-primary text-sm font-bold rounded-lg disabled:opacity-50">
                    确定
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};