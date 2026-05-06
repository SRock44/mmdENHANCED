import { Router } from "express";
import { db } from "../firebaseApp.js";
import { tsToIso } from "../firestoreSerialize.js";

export const publicGraphsRouter = Router();

/** Public read by stable id — no auth (rate-limit at your edge in production). */
publicGraphsRouter.get("/graphs/:id", async (req, res) => {
  const id = req.params.id;
  if (!id || id.length > 200 || !/^[a-zA-Z0-9._:-]+$/.test(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const snap = await db().collection("publicGraphs").doc(id).get();
  if (!snap.exists) {
    res.status(404).json({ error: "Graph not found" });
    return;
  }

  const d = snap.data()!;
  res.json({
    id: snap.id,
    title: (d.title as string | null | undefined) ?? null,
    code: d.code as string,
    settings: (d.settings as Record<string, unknown>) ?? {},
    meta: (d.meta as Record<string, unknown>) ?? {},
    createdAt: d.createdAt ? tsToIso(d.createdAt) : new Date().toISOString(),
    updatedAt: d.updatedAt ? tsToIso(d.updatedAt) : new Date().toISOString(),
  });
});
