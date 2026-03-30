import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'rycode-jwt-secret-change-in-prod';

// Default user ID when no auth token is provided (single-user mode)
export const ANON_USER_ID = 'default-user';

export interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Auth middleware — if token present and valid, uses that userId.
 * Otherwise falls back to ANON_USER_ID (no login required).
 */
export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
      req.userId = payload.userId;
      next();
      return;
    } catch {
      // Fall through to anonymous
    }
  }
  req.userId = ANON_USER_ID;
  next();
}

export function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}
