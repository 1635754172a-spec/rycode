import { prisma } from './prisma.js';

/**
 * Ensure a default anonymous user exists for single-user (no-login) mode.
 */
export async function ensureDefaultUser(): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { id: 'default-user' } });
  if (existing) return;

  await prisma.user.create({
    data: {
      id: 'default-user',
      email: 'default@rycode.local',
      passwordHash: 'no-auth',
      username: '开发者',
      settings: { create: {} },
    },
  });
  console.log('[RYcode] Default user created.');
}
