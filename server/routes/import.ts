import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { getBestAdapter } from '../services/ai/adapter.js';
import { generateOutline } from '../services/outline.js';
import type { GeneratedOutline } from '../services/ai/types.js';
import { extractPdfText } from '../services/importer/pdf.js';
import { extractMarkdownText, extractMarkdownTextFromString } from '../services/importer/markdown.js';
import { extractUrlText, extractLessonUrlMap, fetchLessonContent } from '../services/importer/url.js';
import { extractGitHubRepo } from '../services/importer/github.js';
import { extractVideoContent } from '../services/importer/video.js';

/** Two-pass DB persist: create textbook+units+lessons, then sub-lessons */
async function persistOutline(
  outline: GeneratedOutline,
  sourceType: string,
  sourceUrl?: string,
) {
  const textbookCount = await prisma.textbook.count();
  const colors = ['primary', 'secondary', 'tertiary'];

  // Pass 1: create top-level structure
  const textbook = await prisma.textbook.create({
    data: {
      index: String(textbookCount + 1).padStart(2, '0'),
      title: outline.title,
      color: colors[textbookCount % colors.length],
      sourceType,
      sourceUrl,
      description: outline.description,
      units: {
        create: outline.units.map((unit, ui) => ({
          title: unit.title,
          subtitle: unit.subtitle,
          order: ui,
          lessons: {
            create: unit.lessons.map((lesson, li) => ({
              title: lesson.title,
              difficulty: lesson.difficulty,
              order: li,
            })),
          },
        })),
      },
    },
    include: {
      units: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } },
    },
  });

  // Pass 2: create sub-lessons (children)
  for (const [ui, unit] of outline.units.entries()) {
    const dbUnit = textbook.units[ui];
    if (!dbUnit) continue;
    for (const [li, lesson] of unit.lessons.entries()) {
      if (!lesson.children?.length) continue;
      const dbLesson = dbUnit.lessons[li];
      if (!dbLesson) continue;
      await prisma.lesson.createMany({
        data: lesson.children.map((child, ci) => ({
          unitId: dbUnit.id,
          parentId: dbLesson.id,
          title: child.title,
          difficulty: child.difficulty,
          order: ci,
        })),
      });
    }
  }

  // Fetch final with children
  return prisma.textbook.findUniqueOrThrow({
    where: { id: textbook.id },
    include: {
      units: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            where: { parentId: null },
            orderBy: { order: 'asc' },
            include: { children: { orderBy: { order: 'asc' } } },
          },
        },
      },
    },
  });
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.md', '.txt', '.markdown'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

const router = Router();
router.use(requireAuth);

/**
 * POST /api/import
 * Body (multipart/form-data OR json):
 *   type: 'pdf' | 'markdown' | 'text' | 'url' | 'github' | 'video'
 *   file: (for pdf/markdown)
 *   url: (for url/github/video)
 *   text: (for text)
 *   title: optional override
 *   difficulty: 'beginner' | 'intermediate' | 'advanced'
 *   targetAudience: optional string
 *   provider: optional 'gemini'|'openai'|'claude'
 */
router.post('/', upload.single('file'), async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { type, url, text, title, difficulty, targetAudience } = req.body;

  let extractedText = '';
  let sourceTitle = title ?? '';
  let sourceUrl: string | undefined;
  let sourceType = type ?? 'text';

  try {
    switch (type) {
      case 'pdf': {
        if (!req.file) { res.status(400).json({ error: '请上传 PDF 文件' }); return; }
        extractedText = await extractPdfText(req.file.path);
        sourceTitle = sourceTitle || req.file.originalname.replace(/\.pdf$/i, '');
        // Cleanup temp file
        fs.unlink(req.file.path, () => {});
        break;
      }
      case 'markdown': {
        if (!req.file) { res.status(400).json({ error: '请上传 Markdown 文件' }); return; }
        extractedText = await extractMarkdownText(req.file.path);
        sourceTitle = sourceTitle || req.file.originalname.replace(/\.(md|markdown)$/i, '');
        fs.unlink(req.file.path, () => {});
        break;
      }
      case 'text': {
        if (!text) { res.status(400).json({ error: '请提供文本内容' }); return; }
        extractedText = extractMarkdownTextFromString(text);
        sourceTitle = sourceTitle || '自定义内容';
        break;
      }
      case 'url': {
        if (!url) { res.status(400).json({ error: '请提供 URL' }); return; }
        const result = await extractUrlText(url);
        extractedText = result.text;
        sourceTitle = sourceTitle || result.title;
        sourceUrl = url;
        break;
      }
      // (lessonUrlMap fetched below after outline, only for URL imports)
      case 'github': {
        if (!url) { res.status(400).json({ error: '请提供 GitHub 仓库链接' }); return; }
        const result = await extractGitHubRepo(url);
        extractedText = result.text;
        sourceTitle = sourceTitle || result.title;
        sourceUrl = url;
        break;
      }
      case 'video': {
        if (!url) { res.status(400).json({ error: '请提供视频链接' }); return; }
        const result = await extractVideoContent(url);
        extractedText = result.text;
        sourceTitle = sourceTitle || result.title;
        sourceUrl = url;
        break;
      }
      default:
        res.status(400).json({ error: `不支持的导入类型: ${type}` });
        return;
    }

    if (!extractedText.trim()) {
      res.status(422).json({ error: '无法从提供的内容中提取文本' });
      return;
    }

    // Generate outline with AI
    const adapter = await getBestAdapter(userId);
    const outline = await generateOutline(adapter, {
      content: extractedText,
      sourceTitle,
      difficulty: difficulty ?? 'intermediate',
      targetAudience,
    });

    // Persist to DB (two-pass: create structure, then sub-lessons)
    const textbookCount = await prisma.textbook.count();
    const colors = ['primary', 'secondary', 'tertiary'];
    const color = colors[textbookCount % colors.length];

    // Pass 1: create textbook + units + top-level lessons
    const textbook = await prisma.textbook.create({
      data: {
        index: String(textbookCount + 1).padStart(2, '0'),
        title: outline.title,
        color,
        sourceType,
        sourceUrl,
        description: outline.description,
        units: {
          create: outline.units.map((unit, ui) => ({
            title: unit.title,
            subtitle: unit.subtitle,
            order: ui,
            lessons: {
              create: unit.lessons.map((lesson, li) => ({
                title: lesson.title,
                difficulty: lesson.difficulty,
                order: li,
              })),
            },
          })),
        },
      },
      include: {
        units: {
          orderBy: { order: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' } } },
        },
      },
    });

    // Pass 2: create sub-lessons (children) for lessons that have them
    for (const [ui, unit] of outline.units.entries()) {
      const dbUnit = textbook.units[ui];
      if (!dbUnit) continue;
      for (const [li, lesson] of unit.lessons.entries()) {
        if (!lesson.children?.length) continue;
        const dbLesson = dbUnit.lessons[li];
        if (!dbLesson) continue;
        await prisma.lesson.createMany({
          data: lesson.children.map((child, ci) => ({
            unitId: dbUnit.id,
            parentId: dbLesson.id,
            title: child.title,
            difficulty: child.difficulty,
            order: ci,
          })),
        });
      }
    }

    // Pass 3 (URL imports only): fetch actual lesson content from each lesson page
    // Do this async in background after responding, so import doesn't time out
    if (sourceUrl && (sourceType === 'url')) {
      // Fire background content fetch — don't await, respond immediately
      setImmediate(async () => {
        try {
          const lessonUrlMap = await extractLessonUrlMap(sourceUrl!);
          if (Object.keys(lessonUrlMap).length === 0) return;

          // Get all lessons for this textbook
          const allLessons = await prisma.lesson.findMany({
            where: { unit: { textbookId: textbook.id } },
            select: { id: true, title: true },
          });

          // Rate-limited concurrent fetch: max 3 at a time with 500ms delay
          const CONCURRENCY = 3;
          const DELAY = 500;
          const queue = allLessons.filter(l => {
            // Find URL for this lesson by title match (exact or partial)
            const url = lessonUrlMap[l.title] ||
              Object.entries(lessonUrlMap).find(([t]) => t.includes(l.title) || l.title.includes(t))?.[1];
            return !!url;
          });

          for (let i = 0; i < queue.length; i += CONCURRENCY) {
            const batch = queue.slice(i, i + CONCURRENCY);
            await Promise.all(batch.map(async (lesson) => {
              const lessonUrl = lessonUrlMap[lesson.title] ||
                Object.entries(lessonUrlMap).find(([t]) => t.includes(lesson.title) || lesson.title.includes(t))?.[1];
              if (!lessonUrl) return;
              const content = await fetchLessonContent(lessonUrl);
              if (content) {
                await prisma.lesson.update({
                  where: { id: lesson.id },
                  data: { content },
                });
              }
            }));
            if (i + CONCURRENCY < queue.length) {
              await new Promise(r => setTimeout(r, DELAY));
            }
          }
        } catch (err) {
          console.error('[import] Background content fetch failed:', err);
        }
      });
    }

    // Fetch final result with children
    const finalTextbook = await prisma.textbook.findUnique({
      where: { id: textbook.id },
      include: {
        units: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              where: { parentId: null },
              orderBy: { order: 'asc' },
              include: { children: { orderBy: { order: 'asc' } } },
            },
          },
        },
      },
    });

    res.status(201).json({ textbook: finalTextbook ?? textbook, outline });
  } catch (err: any) {
    // Cleanup uploaded file on error
    if (req.file) fs.unlink(req.file.path, () => {});
    throw err;
  }
});

// POST /api/import/url — convenience alias for POST / with type auto-detected
router.post('/url', async (req: AuthRequest, res: Response) => {
  const { url, difficulty, targetAudience } = req.body;
  if (!url) { res.status(400).json({ error: 'url 为必填项' }); return; }
  let type = 'url';
  if (url.includes('github.com')) type = 'github';
  else if (url.includes('youtube.com') || url.includes('youtu.be')) type = 'video';
  req.body = { ...req.body, type, difficulty, targetAudience };
  // Forward to unified handler by re-calling the route logic inline
  req.body.url = url;
  // Delegate to the main POST / handler logic by calling next handler
  // Simplest: just inline the same logic
  let text = '';
  let sourceTitle = url;
  let sourceType = type;
  try {
    if (type === 'github') {
      const r = await extractGitHubRepo(url);
      sourceTitle = r.title; text = r.text;
    } else if (type === 'video') {
      const r = await extractVideoContent(url);
      sourceTitle = r.title; text = r.text;
    } else {
      const r = await extractUrlText(url);
      sourceTitle = r.title; text = r.text;
    }
    if (!text.trim()) { res.status(422).json({ error: '无法从该链接提取内容' }); return; }
    const adapter = await getBestAdapter(req.userId!);
    const outline = await generateOutline(adapter, { content: text, sourceTitle, difficulty: difficulty ?? 'intermediate', targetAudience });
    const textbook = await persistOutline(outline, sourceType, url);
    res.status(201).json({ textbook, outline });
  } catch (err: any) {
    res.status(err.message?.includes('API') ? 400 : 500).json({ error: err.message ?? '导入失败' });
  }
});

// POST /api/import/text — paste raw text
router.post('/text', async (req: AuthRequest, res: Response) => {
  const { text, title, difficulty, targetAudience } = req.body;
  if (!text?.trim()) { res.status(400).json({ error: 'text 为必填项' }); return; }
  try {
    const cleanText = extractMarkdownTextFromString(text);
    const adapter = await getBestAdapter(req.userId!);
    const outline = await generateOutline(adapter, { content: cleanText, sourceTitle: title ?? '自定义课程', difficulty: difficulty ?? 'intermediate', targetAudience });
    const textbook = await persistOutline(outline, 'manual');
    res.status(201).json({ textbook, outline });
  } catch (err: any) {
    res.status(err.message?.includes('API') ? 400 : 500).json({ error: err.message ?? '导入失败' });
  }
});

export default router;
