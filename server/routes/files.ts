import { Router, Response, Request } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = path.resolve(__dirname, '../../workspace');

// Ensure workspace exists
if (!fsSync.existsSync(WORKSPACE_DIR)) {
  fsSync.mkdirSync(WORKSPACE_DIR, { recursive: true });
}

/** Validate path is within workspace to prevent traversal attacks */
function safePath(rel: string): string {
  const abs = path.resolve(WORKSPACE_DIR, rel);
  if (!abs.startsWith(WORKSPACE_DIR)) {
    throw new Error('Path traversal attempt blocked');
  }
  return abs;
}

/** Sanitize lesson title for use as directory name.
 * Keeps Chinese/Unicode chars but removes filesystem-unsafe chars.
 * Falls back to timestamp slug if result is empty.
 */
function sanitizeDir(title: string): string {
  // Remove chars unsafe on Windows/Mac/Linux filesystems
  const cleaned = title
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim()
    .slice(0, 60);
  if (!cleaned) return `task-${Date.now()}`;
  // Prefix with 'lesson-' to ensure it never starts with a dot or special char
  return cleaned.match(/^[a-zA-Z0-9]/) ? cleaned : `lesson-${cleaned}`;
}

/** Build a file tree node recursively */
async function buildTree(dirPath: string, relBase: string): Promise<FileTreeNode[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const nodes: FileTreeNode[] = [];
  for (const entry of entries.sort((a, b) => {
    // Folders first, then files
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  })) {
    const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      const children = await buildTree(path.join(dirPath, entry.name), rel);
      nodes.push({ name: entry.name, path: rel, type: 'folder', children });
    } else {
      nodes.push({ name: entry.name, path: rel, type: 'file' });
    }
  }
  return nodes;
}

interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
}

const router = Router();
router.use(requireAuth);

// GET /api/files/list — list workspace file tree
router.get('/list', async (_req: AuthRequest, res: Response) => {
  try {
    const tree = await buildTree(WORKSPACE_DIR, '');
    res.json({ tree, workspaceDir: WORKSPACE_DIR });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/files/read?path=relative/path.py
router.get('/read', async (req: AuthRequest, res: Response) => {
  try {
    const rel = req.query.path as string;
    if (!rel) { res.status(400).json({ error: 'path required' }); return; }
    const abs = safePath(rel);
    const content = await fs.readFile(abs, 'utf-8');
    res.json({ content, path: rel });
  } catch (err: any) {
    res.status(err.message.includes('blocked') ? 403 : 404).json({ error: err.message });
  }
});

// POST /api/files/write — write file content
router.post('/write', async (req: AuthRequest, res: Response) => {
  try {
    const { path: rel, content } = req.body as { path: string; content: string };
    if (!rel) { res.status(400).json({ error: 'path required' }); return; }
    const abs = safePath(rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, 'utf-8');
    res.json({ success: true, path: rel });
  } catch (err: any) {
    res.status(err.message.includes('blocked') ? 403 : 500).json({ error: err.message });
  }
});

// DELETE /api/files/delete — delete a file or directory
router.delete('/delete', async (req: AuthRequest, res: Response) => {
  try {
    const rel = (req.query.path ?? req.body?.path) as string;
    if (!rel) { res.status(400).json({ error: 'path required' }); return; }
    const abs = safePath(rel);
    const stat = await fs.stat(abs);
    if (stat.isDirectory()) {
      await fs.rm(abs, { recursive: true, force: true });
    } else {
      await fs.unlink(abs);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.message.includes('blocked') ? 403 : 500).json({ error: err.message });
  }
});

// POST /api/files/create-task — create a task file for a lesson
// Body: { lessonTitle, starterCode, language }
// Returns: { path, content } of the created file
router.post('/create-task', async (req: AuthRequest, res: Response) => {
  try {
    const { lessonTitle, starterCode = '', language = 'python' } = req.body as {
      lessonTitle: string;
      starterCode?: string;
      language?: string;
    };
    if (!lessonTitle) { res.status(400).json({ error: 'lessonTitle required' }); return; }

    const ext = language === 'python' ? 'py'
      : language === 'javascript' || language === 'js' ? 'js'
      : language === 'typescript' || language === 'ts' ? 'ts'
      : language === 'java' ? 'java'
      : language === 'cpp' ? 'cpp'
      : language === 'go' ? 'go'
      : 'py';

    const dirName = sanitizeDir(lessonTitle);
    const taskDir = path.join(WORKSPACE_DIR, dirName);
    await fs.mkdir(taskDir, { recursive: true });

    // Find next available solution file
    let filename = `solution.${ext}`;
    let counter = 1;
    while (fsSync.existsSync(path.join(taskDir, filename))) {
      filename = `solution-${counter}.${ext}`;
      counter++;
    }

    const filePath = path.join(taskDir, filename);
    const relPath = `${dirName}/${filename}`;
    const defaultContent = starterCode || `# ${lessonTitle}\n# 在这里编写你的解答\n\n`;
    await fs.writeFile(filePath, defaultContent, 'utf-8');

    res.json({ path: relPath, content: defaultContent, dir: dirName, filename });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
