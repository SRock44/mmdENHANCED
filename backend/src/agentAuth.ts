import { timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";

function constantTimeCompare(a: string, b: string): boolean {
  const max = 512;
  if (a.length > max || b.length > max) return false;
  const bufA = Buffer.alloc(max, 0);
  const bufB = Buffer.alloc(max, 0);
  Buffer.from(a, "utf8").copy(bufA);
  Buffer.from(b, "utf8").copy(bufB);
  return a.length === b.length && timingSafeEqual(bufA, bufB);
}

/**
 * Automation / AI agent routes. Use a long random AGENT_API_KEY.
 * Authorization: Bearer <key>  OR  X-Agent-Key: <key>
 */
export function agentAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.AGENT_API_KEY;
  if (!expected || expected.length < 24) {
    res.status(503).json({ error: "Agent API is not configured (set AGENT_API_KEY, min 24 chars)" });
    return;
  }

  const auth = req.headers.authorization;
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  const headerKey = req.headers["x-agent-key"];
  const key = bearer ?? (typeof headerKey === "string" ? headerKey.trim() : null);

  if (!key || !constantTimeCompare(key, expected)) {
    res.status(401).json({ error: "Invalid or missing agent key" });
    return;
  }
  next();
}
