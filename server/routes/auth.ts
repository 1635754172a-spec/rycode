import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { signToken, requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, username } = req.body;
  if (!email || !password || !username) {
    res.status(400).json({ error: '邮箱、密码和用户名均为必填项' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: '密码至少6位' });
    return;
  }
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: '该邮箱已被注册' });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        username,
        settings: { create: {} },
      },
      select: { id: true, email: true, username: true, createdAt: true },
    });
    const token = signToken(user.id);
    res.status(201).json({ token, user });
  } catch (err) {
    throw err;
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: '邮箱和密码为必填项' });
    return;
  }
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: '邮箱或密码错误' });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: '邮箱或密码错误' });
      return;
    }
    const token = signToken(user.id);
    res.json({
      token,
      user: { id: user.id, email: user.email, username: user.username },
    });
  } catch (err) {
    throw err;
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, username: true, createdAt: true },
    });
    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }
    res.json({ user });
  } catch (err) {
    throw err;
  }
});

export default router;
