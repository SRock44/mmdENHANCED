import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { authMiddleware, type AuthedRequest } from "../auth.js";

export const diagramsRouter = Router();
diagramsRouter.use(authMiddleware);

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

diagramsRouter.get("/", async (req: AuthedRequest, res) => {
  const list = await prisma.diagram.findMany({
    where: { userId: req.user!.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      code: true,
      settings: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  res.json(list);
});

diagramsRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { name, code, settings } = parsed.data;
  const diagram = await prisma.diagram.create({
    data: {
      userId: req.user!.id,
      name,
      code,
      settings: settings ?? {},
    },
  });
  res.status(201).json(diagram);
});

diagramsRouter.get("/:id", async (req: AuthedRequest, res) => {
  const diagram = await prisma.diagram.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!diagram) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(diagram);
});

diagramsRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const existing = await prisma.diagram.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const data: Prisma.DiagramUpdateInput = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.code !== undefined) data.code = parsed.data.code;
  if (parsed.data.settings !== undefined) data.settings = parsed.data.settings as Prisma.InputJsonValue;

  const diagram = await prisma.diagram.update({
    where: { id: existing.id },
    data,
  });
  res.json(diagram);
});

diagramsRouter.delete("/:id", async (req: AuthedRequest, res) => {
  const existing = await prisma.diagram.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await prisma.diagram.delete({ where: { id: existing.id } });
  res.status(204).send();
});
