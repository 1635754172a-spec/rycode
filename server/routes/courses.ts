import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (_req: AuthRequest, res: Response) => {
  const textbooks = await prisma.textbook.findMany({
    orderBy: { index: 'asc' },
    include: { units: { orderBy: { order: 'asc' }, include: { lessons: { where: { parentId: null }, orderBy: { order: 'asc' }, include: { children: { orderBy: { order: 'asc' } } } } } } },
  });
  res.json({ textbooks });
});

router.get('/lesson/:lessonId/adjacent', async (req: AuthRequest, res: Response) => {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: req.params.lessonId },
      include: {
        unit: {
          include: {
            textbook: {
              include: {
                units: {
                  orderBy: { order: 'asc' },
                  include: { lessons: { where: { parentId: null }, orderBy: { order: 'asc' } } },
                },
              },
            },
          },
        },
      },
    });
    if (!lesson) { res.status(404).json({ error: 'lesson not found' }); return; }
    const allLessons = lesson.unit.textbook.units.flatMap((u: any) => u.lessons);
    const idx = allLessons.findIndex((l: any) => l.id === req.params.lessonId);
    const prev = idx > 0 ? allLessons[idx - 1] : null;
    const next = idx < allLessons.length - 1 ? allLessons[idx + 1] : null;
    res.json({ prev, next, current: { id: lesson.id, title: lesson.title } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const textbook = await prisma.textbook.findUnique({
    where: { id: req.params.id },
    include: { units: { orderBy: { order: 'asc' }, include: { lessons: { where: { parentId: null }, orderBy: { order: 'asc' }, include: { children: { orderBy: { order: 'asc' } } } } } } },
  });
  if (!textbook) { res.status(404).json({ error: 'not found' }); return; }
  res.json({ textbook });
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.textbook.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export default router;
