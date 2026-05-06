import { Router } from "express";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseApp.js";
import { agentAuthMiddleware } from "../agentAuth.js";
import { tsToIso } from "../firestoreSerialize.js";

export const agentGraphsRouter = Router();
agentGraphsRouter.use(agentAuthMiddleware);

const idPattern = /^[a-zA-Z0-9._:-]{1,200}$/;

const upsertSchema = z.object({
  id: z.string().min(1).max(200).regex(idPattern),
  code: z.string().max(200_000),
  title: z.string().max(500).optional().nullable(),
  settings: z.record(z.unknown()).optional(),
  meta: z.record(z.unknown()).optional(),
});

const patchSchema = z.object({
  code: z.string().max(200_000).optional(),
  title: z.string().max(500).optional().nullable(),
  settings: z.record(z.unknown()).optional(),
  meta: z.record(z.unknown()).optional(),
});

agentGraphsRouter.put("/graphs", async (req, res) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { id, code, title, settings, meta } = parsed.data;
  const ref = db().collection("publicGraphs").doc(id);
  const snap = await ref.get();
  const existed = snap.exists;

  if (!existed) {
    await ref.set({
      code,
      title: title === undefined ? null : title,
      settings: settings ?? {},
      meta: meta ?? {},
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    const updates: Record<string, unknown> = {
      code,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (title !== undefined) updates.title = title;
    if (settings !== undefined) updates.settings = settings;
    if (meta !== undefined) updates.meta = meta;
    await ref.update(updates);
  }

  const doc = await ref.get();
  const d = doc.data()!;
  res.status(existed ? 200 : 201).json({
    id: doc.id,
    title: (d.title as string | null | undefined) ?? null,
    updatedAt: tsToIso(d.updatedAt),
  });
});

agentGraphsRouter.patch("/graphs/:id", async (req, res) => {
  if (!idPattern.test(req.params.id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const ref = db().collection("publicGraphs").doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (parsed.data.code !== undefined) updates.code = parsed.data.code;
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.settings !== undefined) updates.settings = parsed.data.settings;
  if (parsed.data.meta !== undefined) updates.meta = parsed.data.meta;
  await ref.update(updates);
  const doc = await ref.get();
  const d = doc.data()!;
  res.json({
    id: doc.id,
    title: (d.title as string | null | undefined) ?? null,
    updatedAt: tsToIso(d.updatedAt),
  });
});

agentGraphsRouter.delete("/graphs/:id", async (req, res) => {
  if (!idPattern.test(req.params.id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const ref = db().collection("publicGraphs").doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await ref.delete();
  res.status(204).send();
});
