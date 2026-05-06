import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  console.warn("JWT_SECRET is not set");
}

export const registerSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(80).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export type JwtPayload = { sub: string; email: string };

export function signToken(payload: JwtPayload): string {
  const secret = JWT_SECRET ?? "dev-only-change-me";
  return jwt.sign(payload, secret, { expiresIn: "14d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const secret = JWT_SECRET ?? "dev-only-change-me";
    return jwt.verify(token, secret) as JwtPayload;
  } catch {
    return null;
  }
}

export interface AuthedRequest extends Request {
  user?: { id: string; email: string };
}

export function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const payload = verifyToken(token);
  if (!payload?.sub) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  req.user = { id: payload.sub, email: payload.email };
  next();
}
