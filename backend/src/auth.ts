import type { Request, Response, NextFunction } from "express";
import { authAdmin } from "./firebaseApp.js";

export interface AuthedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    emailVerified: boolean;
    name?: string;
  };
}

/**
 * Requires a valid Firebase ID token (Bearer). Enforces Google provider + verified email when strict.
 */
export async function firebaseAuthMiddleware(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) {
    res.status(401).json({ error: "Missing Authorization Bearer token" });
    return;
  }

  try {
    const decoded = await authAdmin().verifyIdToken(token, true);

    const email = decoded.email;
    if (!email) {
      res.status(403).json({ error: "Token must include an email" });
      return;
    }

    if (process.env.AUTH_REQUIRE_EMAIL_VERIFIED !== "false" && !decoded.email_verified) {
      res.status(403).json({ error: "Email must be verified" });
      return;
    }

    if (process.env.AUTH_GOOGLE_ONLY !== "false") {
      const provider = decoded.firebase?.sign_in_provider;
      if (provider !== "google.com") {
        res.status(403).json({ error: "Only Google sign-in is allowed" });
        return;
      }
    }

    req.user = {
      uid: decoded.uid,
      email: email.toLowerCase(),
      emailVerified: Boolean(decoded.email_verified),
      name: decoded.name,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
