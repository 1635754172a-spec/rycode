import React, { useState, useRef, useEffect } from 'react';
import { FolderOpen, Folder, FileCode, FileText, FlaskConical, Settings2, Info, ChevronDown, PlusSquare, Edit2, Trash2, FolderPlus, FilePlus } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { FileNode } from '@/src/types';

interface FileTreeProps {
  files: FileNode[];
  onFileClick: (node: FileNode) => void;
  onAddFile: (type: 'file' | 'folder', folderName?: string) => void;
  onRenameFile: (oldName: string, newName: string) => void;
  onDeleteFile: (name: string) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({ files, onFileClick, onAddFile, onRenameFile, onDeleteFile }) => {
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, node: FileNode } | null>(null);
  const [renamingNode, setRenamingNode] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingNode && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingNode]);

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (renamingNode && newName.trim() && newName !== renamingNode) {
      onRenameFile(renamingNode, newName.trim());
    }
    setRenamingNode(null);
  };

  const renderNode = (node: FileNode, depth = 0) => {
    const Icon = node.type === 'folder' 
      ? (node.isOpen ? FolderOpen : Folder) 
      : (node.name.endsWith('.py') ? FileCode : node.name.endsWith('.json') ? Settings2 : node.name.endsWith('.md') ? Info : FileText);

    const isRenaming = renamingNode === node.name;

    return (
      <div key={node.name} className="select-none group/node">
        <div 
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 text-sm rounded cursor-pointer transition-colors relative",
            node.isActive ? "bg-surface-bright text-primary border-l-2 border-primary" : "text-on-surface/60 hover:bg-surface-bright hover:text-on-surface"
          )}
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
          onClick={() => onFileClick(node)}
          onContextMenu={(e) => handleContextMenu(e, node)}
        >
          {node.type === 'folder' && <ChevronDown className={cn("w-3 h-3 transition-transform", !node.isOpen && "-rotate-90")} />}
          <Icon className={cn("w-4 h-4", node.type === 'folder' ? "text-primary/70" : "text-on-surface-variant/40")} />
          
          {isRenaming ? (
            <form onSubmit={handleRenameSubmit} className="flex-1">
              <input
                ref={renameInputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={() => setRenamingNode(null)}
                className="w-full bg-surface-container-high text-on-surface outline-none border border-primary/50 rounded px-1 py-0"
              />
            </form>
          ) : (
            <span className="truncate">{node.name}</span>
          )}
        </div>
        {node.isOpen && node.children?.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <section className="w-64 bg-surface-container-low flex flex-col border-r border-outline-variant/10 relative" onClick={() => setContextMenu(null)}>
      <div className="px-5 py-6 flex items-center justify-between">
        <h3 className="font-headline font-bold text-xs uppercase tracking-widest text-on-surface-variant">文件目录</h3>
        <div className="flex items-center gap-2">
          <FilePlus 
            className="w-4 h-4 text-on-surface-variant/50 cursor-pointer hover:text-primary transition-colors" 
            onClick={(e) => {
              e.stopPropagation();
              onAddFile('file');
            }}
          />
          <FolderPlus 
            className="w-4 h-4 text-on-surface-variant/50 cursor-pointer hover:text-primary transition-colors" 
            onClick={(e) => {
              e.stopPropagation();
              onAddFile('folder');
            }}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
        <div className="space-y-1">
          {files.map(node => renderNode(node))}
        </div>
      </div>

      {contextMenu && (
        <div 
          className="fixed z-50 bg-surface-container-high border border-outline-variant/20 rounded-lg shadow-xl py-1 min-w-[120px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.node.type === 'folder' && (
            <>
              <button 
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-on-surface hover:bg-surface-bright transition-colors"
                onClick={() => {
                  onAddFile('file', contextMenu.node.name);
                  setContextMenu(null);
                }}
              >
                <FilePlus className="w-3 h-3" /> 新建文件
              </button>
              <button 
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-on-surface hover:bg-surface-bright transition-colors"
                onClick={() => {
                  onAddFile('folder', contextMenu.node.name);
                  setContextMenu(null);
                }}
              >
                <FolderPlus className="w-3 h-3" /> 新建文件夹
              </button>
            </>
          )}
          <button 
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-on-surface hover:bg-surface-bright transition-colors"
            onClick={() => {
              setRenamingNode(contextMenu.node.name);
              setNewName(contextMenu.node.name);
              setContextMenu(null);
            }}
          >
            <Edit2 className="w-3 h-3" /> 重命名
          </button>
          <button 
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-error hover:bg-error/10 transition-colors"
            onClick={() => {
              onDeleteFile(contextMenu.node.name);
              setContextMenu(null);
            }}
          >
            <Trash2 className="w-3 h-3" /> 删除
          </button>
        </div>
      )}
    </section>
  );
};
