import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { getBestAdapter } from '../services/ai/adapter.js';
import type { CodeReviewRequest, CodeReviewResult } from '../services/ai/types.js';

const router = Router();
router.use(requireAuth);

const REVIEW_SYSTEM = `你是一位资深软件工程师和编程教育专家。
你的任务是对学生提交的代码进行全面、客观的评审。
评审要兼顾正确性、效率和可读性，并给出建设性的改进建议。
严格按照 JSON 格式输出，不要包含任何额外文字。`;

function buildReviewPrompt(req: CodeReviewRequest): string {
  return `请对以下代码提交进行全面评审。

题目: ${req.problemTitle}
题目描述: ${req.problemDescription.slice(0, 500)}
编程语言: ${req.language}

学生提交的代码:
\`\`\`${req.language}
${req.code}
\`\`\`

${req.execResult ? `执行结果:
- 状态: ${req.execResult.status ?? '未知'}
- 输出: ${req.execResult.stdout?.slice(0, 500) ?? '(无输出)'}
- 错误: ${req.execResult.stderr?.slice(0, 300) ?? '(无错误)'}
- 用时: ${req.execResult.time ?? '未知'}` : ''}

请输出如下 JSON 结构：
{
  "score": 数字(0-100),
  "grade": "等级(A+/A/A-/B+/B/B-/C+/C/D/F)",
  "efficiency": 数字(0-100),
  "readability": 数字(0-100),
  "correctness": 数字(0-100),
  "commentary": "详细评语（markdown格式，包含优点、问题和改进建议）",
  "suggestedCode": "优化后的完整代码",
  "weakPoints": ["薄弱点1", "薄弱点2"]
}

评分标准:
- correctness(正确性): 代码逻辑是否正确，能否通过测试
- efficiency(效率): 时间/空间复杂度是否合理
- readability(可读性): 命名、注释、代码结构
- score: 综合分数 = correctness*0.5 + efficiency*0.3 + readability*0.2
- weakPoints: 需要加强的编程概念或技能（用于后续推荐练习）

直接输出JSON对象，不要有任何其他内容：`;
}

// POST /api/review — Submit code for AI review
router.post('/', async (req: AuthRequest, res: Response) => {
  const { code, language, problemId, execResult } = req.body;
  if (!code?.trim() || !problemId) {
    res.status(400).json({ error: 'code 和 problemId 为必填项' });
    return;
  }

  const problem = await prisma.problem.findUnique({ where: { id: problemId } });
  if (!problem) {
    res.status(404).json({ error: '题目不存在' });
    return;
  }

  const reviewReq: CodeReviewRequest = {
    code,
    language: language ?? problem.language,
    problemTitle: problem.title,
    problemDescription: problem.description,
    execResult,
  };

  const adapter = await getBestAdapter(req.userId!);
  const result = await adapter.chatJSON<CodeReviewResult>(
    [{ role: 'user', content: buildReviewPrompt(reviewReq) }],
    { systemPrompt: REVIEW_SYSTEM, temperature: 0.3, jsonMode: true },
  );

  // Save submission record
  const submission = await prisma.submission.create({
    data: {
      userId: req.userId!,
      problemId,
      code,
      language: language ?? problem.language,
      execResult: execResult ? JSON.stringify(execResult) : null,
      aiScore: result.score,
      aiGrade: result.grade,
      aiEfficiency: result.efficiency,
      aiReadability: result.readability,
      aiCorrectness: result.correctness,
      aiCommentary: result.commentary,
      aiSuggestedCode: result.suggestedCode,
    },
  });

  // Update progress
  const lesson = await prisma.lesson.findUnique({ where: { id: problem.lessonId } });
  if (lesson) {
    const unit = await prisma.unit.findUnique({ where: { id: lesson.unitId } });
    if (unit) {
      await prisma.userProgress.upsert({
        where: { userId_lessonId: { userId: req.userId!, lessonId: lesson.id } },
        create: {
          userId: req.userId!,
          lessonId: lesson.id,
          textbookId: unit.textbookId,
          bestScore: result.score,
          completed: result.score >= 60,
          attempts: 1,
          weakPoints: JSON.stringify(result.weakPoints),
        },
        update: {
          bestScore: { set: Math.max(result.score, 0) },
          completed: result.score >= 60 ? true : undefined,
          attempts: { increment: 1 },
          weakPoints: JSON.stringify(result.weakPoints),
        },
      });
    }
  }

  res.json({
    feedback: result,
    submissionId: submission.id,
  });
});

// GET /api/review/history — User's submission history
router.get('/history', async (req: AuthRequest, res: Response) => {
  const submissions = await prisma.submission.findMany({
    where: { userId: req.userId! },
    include: { problem: { select: { title: true, difficulty: true } } },
    orderBy: { submittedAt: 'desc' },
    take: 20,
  });
  res.json({ submissions });
});

// POST /api/review/chat — multi-turn AI dialogue about a submission
router.post('/chat', async (req: AuthRequest, res: Response) => {
  const { submissionId, messages } = req.body as {
    submissionId: string;
    messages: { role: 'user' | 'assistant'; content: string }[];
  };
  if (!submissionId || !messages?.length) {
    res.status(400).json({ error: 'submissionId 和 messages 为必填项' });
    return;
  }
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { problem: true },
    });
    if (!submission) { res.status(404).json({ error: '提交记录不存在' }); return; }

    const systemPrompt = `你是一位耐心的编程老师，正在帮助学生理解他们的代码提交。
题目：${submission.problem.title}
学生代码：\n\`\`\`${submission.language}\n${submission.code}\n\`\`\`
请根据对话历史回答学生的问题，给出清晰、友好、有教育价值的解释。`;

    const adapter = await getBestAdapter(req.userId!);
    const response = await adapter.chat(
      messages.map(m => ({ role: m.role, content: m.content })),
      { systemPrompt, temperature: 0.7 }
    );
    res.json({ reply: response.content });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? '对话失败' });
  }
});

export default router;
