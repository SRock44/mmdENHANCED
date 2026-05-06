import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseApp.js";
import { firebaseAuthMiddleware, type AuthedRequest } from "../auth.js";
import { userFromDoc } from "../firestoreSerialize.js";

export const authRouter = Router();

/** Current user profile (creates Firestore `users/{uid}` on first call). */
authRouter.get("/me", firebaseAuthMiddleware, async (req: AuthedRequest, res) => {
  const uid = req.user!.uid;
  const ref = db().collection("users").doc(uid);
  const snap = await ref.get();

  if (!snap.exists) {
    await ref.set({
      email: req.user!.email,
      displayName: req.user!.name ?? null,
      onboardingCompleted: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const doc = await ref.get();
  res.json(userFromDoc(uid, doc.data()));
});
