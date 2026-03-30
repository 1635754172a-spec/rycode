import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();
router.use(requireAuth);

// Judge0 language IDs
const LANGUAGE_IDS: Record<string, number> = {
  python: 71,
  python3: 71,
  javascript: 63,
  js: 63,
  typescript: 74,
  ts: 74,
  java: 62,
  cpp: 54,
  'c++': 54,
  c: 50,
  go: 60,
  rust: 73,
  ruby: 72,
  php: 68,
  swift: 83,
  kotlin: 78,
  csharp: 51,
  'c#': 51,
};

const JUDGE0_HOST_ENV = process.env.JUDGE0_HOST ?? 'judge0-ce.p.rapidapi.com';
const JUDGE0_KEY_ENV = process.env.JUDGE0_API_KEY ?? '';

interface Judge0Submission {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  status: { id: number; description: string };
  time: string | null;
  memory: number | null;
}

async function submitToJudge0(
  code: string,
  languageId: number,
  stdin?: string,
  judge0Key?: string,
  judge0Host?: string,
): Promise<Judge0Submission> {
  const key = judge0Key || JUDGE0_KEY_ENV;
  const host = judge0Host || JUDGE0_HOST_ENV;

  if (!key) {
    // Dev mode: mock response when no key configured
    return {
      stdout: '[Judge0 未配置] 代码已接收，请在设置页面配置 Judge0 API Key',
      stderr: null,
      compile_output: null,
      message: null,
      status: { id: 3, description: 'Accepted' },
      time: '0.1',
      memory: 1024,
    };
  }

  const submitRes = await fetch(`https://${host}/submissions?base64_encoded=false&wait=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': key,
      'X-RapidAPI-Host': host,
    },
    body: JSON.stringify({
      source_code: code,
      language_id: languageId,
      stdin: stdin ?? '',
    }),
  });

  if (!submitRes.ok) {
    const err = await submitRes.text();
    throw new Error(`Judge0 error ${submitRes.status}: ${err}`);
  }

  return submitRes.json() as Promise<Judge0Submission>;
}

// POST /api/execute
router.post('/', async (req: AuthRequest, res: Response) => {
  const { code, language = 'python', stdin } = req.body;
  if (!code) { res.status(400).json({ error: 'code 为必填项' }); return; }

  const langKey = language.toLowerCase();
  const languageId = LANGUAGE_IDS[langKey];
  if (!languageId) {
    res.status(400).json({ error: `不支持的语言: ${language}`, supportedLanguages: Object.keys(LANGUAGE_IDS) });
    return;
  }

  // Load user's judge0 config (falls back to env vars if not set)
  const userSettings = await prisma.userSettings.findUnique({ where: { userId: req.userId! } });
  const result = await submitToJudge0(code, languageId, stdin, userSettings?.judge0ApiKey || undefined, userSettings?.judge0Host || undefined);

  res.json({
    stdout: result.stdout,
    stderr: result.stderr ?? result.compile_output,
    status: result.status.description,
    statusId: result.status.id,
    time: result.time,
    memory: result.memory,
    isAccepted: result.status.id === 3,
  });
});

export default router;
