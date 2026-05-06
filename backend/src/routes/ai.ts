import { Router } from "express";
import { z } from "zod";
import { firebaseAuthMiddleware, type AuthedRequest } from "../auth.js";

export const aiRouter = Router();
aiRouter.use(firebaseAuthMiddleware);

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(12_000),
});

const chatSchema = z.object({
  messages: z.array(messageSchema).min(1).max(32),
  diagramCode: z.string().max(120_000).optional(),
});

const SYSTEM = `You are loewiMMD AI. Help the user with Mermaid diagram syntax.
When you output a full diagram, use a single fenced block:
\`\`\`mermaid
...
\`\`\`
Rules: valid Mermaid only; keep explanations short; prefer editing the existing diagram when diagramCode is provided.`;

/** Server-side Groq proxy — API key never leaves the server. */
aiRouter.post("/chat", async (req: AuthedRequest, res) => {
  const key = process.env.GROQ_API_KEY;
  if (!key || key.length < 20) {
    res.status(503).json({ error: "GROQ_API_KEY is not configured" });
    return;
  }

  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const model = process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";
  const baseUrl = (process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, "");
  const maxTokens = Math.min(Number(process.env.GROQ_MAX_TOKENS || 2048), 8192);

  const { messages, diagramCode } = parsed.data;
  const userContent =
    diagramCode && diagramCode.trim().length > 0
      ? `Current Mermaid:\n\`\`\`mermaid\n${diagramCode}\n\`\`\`\n\nUser messages follow as chat.`
      : null;

  const groqMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: SYSTEM },
  ];
  if (userContent) {
    groqMessages.push({ role: "user", content: userContent });
  }
  for (const m of messages) {
    groqMessages.push({ role: m.role, content: m.content });
  }

  try {
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: groqMessages,
        max_tokens: maxTokens,
        temperature: Number(process.env.GROQ_TEMPERATURE ?? 0.35),
      }),
    });

    const text = await r.text();
    const data = text ? JSON.parse(text) : null;
    if (!r.ok) {
      const msg = data?.error?.message ?? data?.error ?? r.statusText;
      res.status(502).json({ error: typeof msg === "string" ? msg : "Groq request failed" });
      return;
    }

    const content = data?.choices?.[0]?.message?.content ?? "";
    res.json({ role: "assistant", content });
  } catch (e) {
    console.error("Groq error:", e);
    res.status(502).json({ error: "Upstream AI error" });
  }
});
