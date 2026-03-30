import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { encrypt, decrypt } from '../lib/crypto.js';

const router = Router();
router.use(requireAuth);

// GET /api/settings/apikeys
router.get('/apikeys', async (req: AuthRequest, res: Response) => {
  const keys = await prisma.userApiKey.findMany({
    where: { userId: req.userId! },
    select: { provider: true, defaultModel: true, baseUrl: true, customName: true, isActive: true, updatedAt: true },
  });
  // Never return raw key — just confirm existence
  res.json({ apiKeys: keys.map(k => ({ ...k, hasKey: true })) });
});

// PUT /api/settings/apikeys
router.put('/apikeys', async (req: AuthRequest, res: Response) => {
  const { provider, apiKey, defaultModel, baseUrl, customName } = req.body;
  if (!provider || !apiKey) {
    res.status(400).json({ error: 'provider 和 apiKey 为必填项' });
    return;
  }

  // provider can be: gemini | openai | claude | custom:<slug>
  const builtinProviders = ['gemini', 'openai', 'claude'];
  const isCustom = provider.startsWith('custom');
  if (!builtinProviders.includes(provider) && !isCustom) {
    res.status(400).json({ error: `provider 必须为内置 provider 或以 "custom" 开头` });
    return;
  }
  if (isCustom && !baseUrl) {
    res.status(400).json({ error: '自定义 provider 需要提供 baseUrl' });
    return;
  }
  if (baseUrl) {
    try { new URL(baseUrl); } catch {
      res.status(400).json({ error: 'baseUrl 格式无效，请输入完整 URL（如 https://api.example.com/v1）' });
      return;
    }
  }

  const encryptedKey = encrypt(apiKey);
  await prisma.userApiKey.upsert({
    where: { userId_provider: { userId: req.userId!, provider } },
    create: { userId: req.userId!, provider, encryptedKey, defaultModel, baseUrl, customName, isActive: true },
    update: { encryptedKey, defaultModel, baseUrl, customName, isActive: true, updatedAt: new Date() },
  });
  res.json({ success: true, message: 'API Key 保存成功' });
});

// DELETE /api/settings/apikeys/:provider
router.delete('/apikeys/:provider', async (req: AuthRequest, res: Response) => {
  const { provider } = req.params;
  await prisma.userApiKey.deleteMany({
    where: { userId: req.userId!, provider },
  });
  res.json({ success: true });
});

// GET /api/settings/profile
router.get('/profile', async (req: AuthRequest, res: Response) => {
  const settings = await prisma.userSettings.findUnique({
    where: { userId: req.userId! },
  });
  res.json({ settings });
});

// PUT /api/settings/profile
router.put('/profile', async (req: AuthRequest, res: Response) => {
  const { theme, language } = req.body;
  const settings = await prisma.userSettings.upsert({
    where: { userId: req.userId! },
    create: { userId: req.userId!, theme: theme ?? 'dark', language: language ?? 'zh-CN' },
    update: { theme, language, updatedAt: new Date() },
  });
  res.json({ settings });
});

// GET /api/settings/judge0
router.get('/judge0', async (req: AuthRequest, res: Response) => {
  const settings = await prisma.userSettings.findUnique({ where: { userId: req.userId! } });
  res.json({
    judge0ApiKey: settings?.judge0ApiKey ? '••••••••' : '',
    judge0Host: settings?.judge0Host ?? '',
    hasKey: !!settings?.judge0ApiKey,
  });
});

// PUT /api/settings/judge0
router.put('/judge0', async (req: AuthRequest, res: Response) => {
  const { judge0ApiKey, judge0Host } = req.body;
  const update: Record<string, string> = {};
  if (judge0ApiKey !== undefined) update.judge0ApiKey = judge0ApiKey;
  if (judge0Host !== undefined) update.judge0Host = judge0Host;
  await prisma.userSettings.upsert({
    where: { userId: req.userId! },
    create: { userId: req.userId!, ...update },
    update: { ...update, updatedAt: new Date() },
  });
  res.json({ success: true });
});

// GET /api/settings/default-provider
router.get('/default-provider', async (req: AuthRequest, res: Response) => {
  const settings = await prisma.userSettings.findUnique({ where: { userId: req.userId! } });
  res.json({ defaultProvider: settings?.defaultProvider ?? '' });
});

// PUT /api/settings/default-provider
router.put('/default-provider', async (req: AuthRequest, res: Response) => {
  const { provider } = req.body;
  if (!provider && provider !== '') {
    res.status(400).json({ error: 'provider 为必填项' });
    return;
  }
  // Validate: provider must exist in user's active API keys (or be empty to clear)
  if (provider !== '') {
    const isBuiltin = ['gemini', 'openai', 'claude'].includes(provider);
    const key = await prisma.userApiKey.findFirst({
      where: { userId: req.userId!, provider, isActive: true },
    });
    if (!isBuiltin && !key) {
      res.status(400).json({ error: `provider "${provider}" 未配置或不可用` });
      return;
    }
  }
  await prisma.userSettings.upsert({
    where: { userId: req.userId! },
    create: { userId: req.userId!, defaultProvider: provider },
    update: { defaultProvider: provider, updatedAt: new Date() },
  });
  res.json({ success: true, defaultProvider: provider });
});

// Internal helper — get decrypted key for a user+provider
export async function getDecryptedApiKey(
  userId: string,
  provider: string
): Promise<{ apiKey: string; defaultModel: string | null; baseUrl: string | null; customName: string | null } | null> {
  const record = await prisma.userApiKey.findUnique({
    where: { userId_provider: { userId, provider } },
  });
  if (!record || !record.isActive) return null;
  return {
    apiKey: decrypt(record.encryptedKey),
    defaultModel: record.defaultModel,
    baseUrl: record.baseUrl,
    customName: record.customName,
  };
}

export default router;
