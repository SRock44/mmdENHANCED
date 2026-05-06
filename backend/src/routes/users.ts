import { Router } from "express";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseApp.js";
import { firebaseAuthMiddleware, type AuthedRequest } from "../auth.js";
import { userFromDoc } from "../firestoreSerialize.js";

export const usersRouter = Router();
usersRouter.use(firebaseAuthMiddleware);

const patchSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  onboardingCompleted: z.boolean().optional(),
});

usersRouter.patch("/me", async (req: AuthedRequest, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const uid = req.user!.uid;
  const ref = db().collection("users").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    res.status(404).json({ error: "User profile not found; call GET /auth/me first" });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (parsed.data.displayName !== undefined) updates.displayName = parsed.data.displayName;
  if (parsed.data.onboardingCompleted !== undefined) updates.onboardingCompleted = parsed.data.onboardingCompleted;
  await ref.update(updates);

  const next = await ref.get();
  res.json(userFromDoc(uid, next.data()));
});
