import { GeminiAdapter } from './gemini.js';
import { OpenAIAdapter } from './openai.js';
import { ClaudeAdapter } from './claude.js';
import type { AIAdapter, AIProvider, AIConfig } from './types.js';
import { getDecryptedApiKey } from '../../routes/settings.js';
import { prisma } from '../../lib/prisma.js';
import { decrypt } from '../../lib/crypto.js';

/**
 * Create an AI adapter from explicit config.
 */
export function createAdapter(config: AIConfig): AIAdapter {
  const { provider, apiKey, model, baseUrl } = config;
  switch (provider) {
    case 'gemini': return new GeminiAdapter(apiKey, model);
    case 'openai': return new OpenAIAdapter(apiKey, model);
    case 'claude': return new ClaudeAdapter(apiKey, model);
    case 'custom':
      if (!baseUrl) throw new Error('Custom provider requires a baseUrl');
      return new OpenAIAdapter(apiKey, model, baseUrl);
    default: throw new Error(`Unknown AI provider: ${provider}`);
  }
}

/**
 * Create an AI adapter by loading the user's saved API key from DB.
 * Falls back to GEMINI_API_KEY env var for Gemini.
 */
export async function createAdapterForUser(
  userId: string,
  provider: AIProvider,
): Promise<AIAdapter> {
  const saved = await getDecryptedApiKey(userId, provider);

  if (saved) {
    return createAdapter({
      provider,
      apiKey: saved.apiKey,
      model: saved.defaultModel ?? undefined,
      baseUrl: saved.baseUrl ?? undefined,
    });
  }

  // Fallback: env vars (standard providers only)
  if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
    return new GeminiAdapter(process.env.GEMINI_API_KEY);
  }
  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    return new OpenAIAdapter(process.env.OPENAI_API_KEY);
  }
  if (provider === 'claude' && process.env.ANTHROPIC_API_KEY) {
    return new ClaudeAdapter(process.env.ANTHROPIC_API_KEY);
  }

  throw new Error(
    `No API key configured for provider "${provider}". Please add your key in Settings.`
  );
}

/**
 * Pick the best available provider for a user.
 * Respects user's defaultProvider setting, then falls back to:
 * gemini → openai → claude → any custom providers
 */
export async function getBestAdapter(userId: string): Promise<AIAdapter> {
  // Check user's default provider preference
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  const defaultProvider = settings?.defaultProvider ?? '';

  if (defaultProvider) {
    try {
      const isBuiltin = ['gemini', 'openai', 'claude'].includes(defaultProvider);
      if (isBuiltin) {
        return await createAdapterForUser(userId, defaultProvider as AIProvider);
      } else if (defaultProvider.startsWith('custom')) {
        const key = await prisma.userApiKey.findFirst({
          where: { userId, provider: defaultProvider, isActive: true },
        });
        if (key) {
          return createAdapter({
            provider: 'custom',
            apiKey: decrypt(key.encryptedKey),
            model: key.defaultModel ?? undefined,
            baseUrl: key.baseUrl ?? undefined,
            customName: key.customName ?? undefined,
          });
        }
      }
    } catch {
      // Default provider failed, fall through to ordered fallback
    }
  }

  // Fallback: try standard providers in order
  const standardOrder: AIProvider[] = ['gemini', 'openai', 'claude'];
  for (const provider of standardOrder) {
    try {
      return await createAdapterForUser(userId, provider);
    } catch {
      continue;
    }
  }
  // Try any custom providers
  const allKeys = await prisma.userApiKey.findMany({
    where: { userId, isActive: true, provider: { startsWith: 'custom' } },
  });
  for (const key of allKeys) {
    try {
      return createAdapter({
        provider: 'custom',
        apiKey: decrypt(key.encryptedKey),
        model: key.defaultModel ?? undefined,
        baseUrl: key.baseUrl ?? undefined,
        customName: key.customName ?? undefined,
      });
    } catch {
      continue;
    }
  }
  throw new Error('未配置任何 AI 提供商。请在设置页面添加 API Key。');
}
