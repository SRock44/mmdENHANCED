import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { authMiddleware, type AuthedRequest } from "../auth.js";

export const usersRouter = Router();
usersRouter.use(authMiddleware);

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
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: parsed.data,
    select: {
      id: true,
      email: true,
      displayName: true,
      onboardingCompleted: true,
    },
  });
  res.json(user);
});
