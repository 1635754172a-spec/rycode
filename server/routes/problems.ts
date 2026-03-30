import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { getBestAdapter } from '../services/ai/adapter.js';
import type { ProblemGenerationRequest, GeneratedProblem } from '../services/ai/types.js';

const router = Router();
router.use(requireAuth);

const PROBLEM_SYSTEM = `你是一位专业的编程题目出题专家。根据课时内容和难度要求，生成高质量的编程练习题。你的回复必须是且只能是一个合法的JSON对象，不含任何额外文字、解释或markdown。`;

function buildProblemPrompt(req: ProblemGenerationRequest): string {
  const xp = req.difficulty === '简单' ? 50 : req.difficulty === '中等' ? 120 : 300;
  return `请为以下课时生成一道${req.difficulty}难度的编程题目。

课时标题: ${req.lessonTitle}
编程语言: ${req.language ?? 'python'}
${req.weakPoints?.length ? `用户薄弱点（请针对性出题）: ${req.weakPoints.join('、')}` : ''}
${req.lessonContent ? `课时内容参考:\n${req.lessonContent.slice(0, 2000)}` : ''}

要求：
- 题目应有实际意义，贴合课时主题
- 测试用例 2-4 个
- hints 2-3 条，由浅入深
- starterCode 包含函数签名和注释

直接输出以下JSON（不要有任何其他内容，不要有markdown代码块）:
{"title":"...","description":"...","difficulty":"${req.difficulty}","starterCode":"...","testCases":[{"input":"...","expected":"...","description":"..."}],"hints":["..."],"xp":${xp}}`;
}

// POST /api/problems/generate — generate 3 problems (easy/medium/hard)
router.post('/generate', async (req: AuthRequest, res: Response) => {
  const { lessonId, language, targetDifficulty } = req.body;
  if (!lessonId) { res.status(400).json({ error: 'lessonId 为必填项' }); return; }

  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { unit: { include: { textbook: true } } },
    });
    if (!lesson) { res.status(404).json({ error: '课时不存在' }); return; }

    // Get user's weak points for personalization
    const progress = await prisma.userProgress.findUnique({
      where: { userId_lessonId: { userId: req.userId!, lessonId } },
    });
    const weakPoints: string[] = progress ? JSON.parse(progress.weakPoints) : [];

    const adapter = await getBestAdapter(req.userId!);
    const difficulties: Array<'简单' | '中等' | '困难'> = targetDifficulty
      ? [targetDifficulty]
      : ['简单', '中等', '困难'];

    const problems = await Promise.all(
      difficulties.map(difficulty =>
        adapter.chatJSON<GeneratedProblem>(
          [{ role: 'user', content: buildProblemPrompt({
            lessonTitle: lesson.title,
            lessonContent: lesson.content ?? undefined,
            difficulty,
            language: language ?? 'python',
            weakPoints,
          }) }],
          { systemPrompt: PROBLEM_SYSTEM, temperature: 0.7, jsonMode: true },
        )
      )
    );

    // Persist generated problems
    const saved = await Promise.all(
      problems.map(p =>
        prisma.problem.create({
          data: {
            lessonId,
            title: p.title,
            description: p.description,
            difficulty: p.difficulty,
            starterCode: p.starterCode,
            testCases: JSON.stringify(p.testCases),
            hints: JSON.stringify(p.hints),
            language: language ?? 'python',
            xp: p.xp,
          },
        })
      )
    );

    res.json({ problems: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? '题目生成失败' });
  }
});

// GET /api/problems/:lessonId — get existing problems for a lesson
router.get('/:lessonId', async (req: AuthRequest, res: Response) => {
  const problems = await prisma.problem.findMany({
    where: { lessonId: req.params.lessonId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ problems });
});

export default router;
