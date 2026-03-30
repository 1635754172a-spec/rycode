import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/progress — get current user's full progress
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  const progress = await prisma.userProgress.findMany({
    where: { userId },
    include: { lesson: true, textbook: true },
    orderBy: { updatedAt: 'desc' },
  });

  // Stats for dashboard chart — last 7 days submission scores
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentSubmissions = await prisma.submission.findMany({
    where: { userId, submittedAt: { gte: sevenDaysAgo }, aiScore: { not: null } },
    orderBy: { submittedAt: 'asc' },
    select: { submittedAt: true, aiScore: true },
  });

  // Aggregate weak points across all progress records
  const allWeakPoints: string[] = [];
  for (const p of progress) {
    try {
      const wp = JSON.parse(p.weakPoints) as string[];
      allWeakPoints.push(...wp);
    } catch {}
  }
  const weakPointCounts: Record<string, number> = {};
  for (const wp of allWeakPoints) {
    weakPointCounts[wp] = (weakPointCounts[wp] ?? 0) + 1;
  }
  const topWeakPoints = Object.entries(weakPointCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, count]) => ({ topic, count }));

  const completedCount = progress.filter(p => p.completed).length;
  const avgScore =
    progress.length > 0
      ? Math.round(progress.reduce((s, p) => s + p.bestScore, 0) / progress.length)
      : 0;

  res.json({
    progress,
    stats: {
      completedLessons: completedCount,
      totalAttempts: progress.reduce((s, p) => s + p.attempts, 0),
      averageScore: avgScore,
      chartData: recentSubmissions.map(s => ({
        date: s.submittedAt.toISOString().slice(0, 10),
        score: s.aiScore,
      })),
    },
    weakPoints: topWeakPoints,
  });
});

// POST /api/progress — upsert lesson progress after submission
router.post('/', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { lessonId, textbookId, score, completed, weakPoints } = req.body;
  if (!lessonId || !textbookId) {
    res.status(400).json({ error: 'lessonId 和 textbookId 为必填项' });
    return;
  }
  const existing = await prisma.userProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });
  const newBestScore = Math.max(existing?.bestScore ?? 0, score ?? 0);
  const progress = await prisma.userProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: {
      userId,
      lessonId,
      textbookId,
      bestScore: score ?? 0,
      completed: completed ?? false,
      attempts: 1,
      weakPoints: JSON.stringify(weakPoints ?? []),
    },
    update: {
      bestScore: newBestScore,
      completed: completed ?? existing?.completed ?? false,
      attempts: { increment: 1 },
      weakPoints: JSON.stringify(weakPoints ?? []),
    },
  });
  res.json({ progress });
});

export default router;
