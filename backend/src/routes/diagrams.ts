import { Router } from "express";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseApp.js";
import { firebaseAuthMiddleware, type AuthedRequest } from "../auth.js";
import { diagramFromDoc } from "../firestoreSerialize.js";

export const diagramsRouter = Router();
diagramsRouter.use(firebaseAuthMiddleware);

const createSchema = z.object({
  name: z.string().min(1).max(200).default("Untitled Diagram"),
  code: z.string().default(""),
  settings: z.record(z.unknown()).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  code: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
});

function diagramsCol(uid: string) {
  return db().collection("users").doc(uid).collection("diagrams");
}

diagramsRouter.get("/", async (req: AuthedRequest, res) => {
  const snap = await diagramsCol(req.user!.uid).get();
  const list = snap.docs.map((d) => diagramFromDoc(d.id, d.data()));
  list.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  res.json(list);
});

diagramsRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { name, code, settings } = parsed.data;
  const ref = await diagramsCol(req.user!.uid).add({
    name,
    code,
    settings: settings ?? {},
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const doc = await ref.get();
  res.status(201).json(diagramFromDoc(ref.id, doc.data()));
});

diagramsRouter.get("/:id", async (req: AuthedRequest, res) => {
  const doc = await diagramsCol(req.user!.uid).doc(req.params.id).get();
  if (!doc.exists) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(diagramFromDoc(doc.id, doc.data()));
});

diagramsRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const ref = diagramsCol(req.user!.uid).doc(req.params.id);
  const existing = await ref.get();
  if (!existing.exists) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.code !== undefined) updates.code = parsed.data.code;
  if (parsed.data.settings !== undefined) updates.settings = parsed.data.settings;
  await ref.update(updates);
  const doc = await ref.get();
  res.json(diagramFromDoc(doc.id, doc.data()));
});

diagramsRouter.delete("/:id", async (req: AuthedRequest, res) => {
  const ref = diagramsCol(req.user!.uid).doc(req.params.id);
  const existing = await ref.get();
  if (!existing.exists) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await ref.delete();
  res.status(204).send();
});
