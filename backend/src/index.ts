import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import LZString from "lz-string";
import { z } from "zod";

type StoredChart = {
  id: string;
  hash: string;
  createdAt: string;
  title: string | null;
};

const charts = new Map<string, StoredChart>();

const app = express();
const port = Number(process.env.PORT || 4000);
const rawOrigins = process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()).filter(Boolean);
const corsOrigin: boolean | string[] = rawOrigins && rawOrigins.length > 0 ? rawOrigins : true;

const writeKey = process.env.AGENT_API_KEY?.trim() || "";

app.use(helmet());
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: "2mb" }));

function requireWriteKey(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (!writeKey) {
    res.status(503).json({ error: "AGENT_API_KEY is not configured" });
    return;
  }
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7).trim()
    : null;
  const header = typeof req.headers["x-agent-key"] === "string" ? req.headers["x-agent-key"].trim() : null;
  const key = bearer ?? header;
  if (!key || key !== writeKey) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

const chartPayloadSchema = z.object({
  diagram: z.string().min(1).max(500_000),
  title: z.string().max(500).optional().nullable(),
  settings: z.record(z.unknown()).optional(),
  meta: z.record(z.unknown()).optional(),
});

const decodeSchema = z.object({ hash: z.string().min(8).max(1_000_000) });

function makeHash(payload: z.infer<typeof chartPayloadSchema>): string {
  const json = JSON.stringify({
    v: 1,
    diagram: payload.diagram,
    title: payload.title ?? null,
    settings: payload.settings ?? {},
    meta: payload.meta ?? {},
  });
  const compressed = LZString.compressToEncodedURIComponent(json);
  if (!compressed) {
    throw new Error("Compression failed");
  }
  return `mmd1.${compressed}`;
}

function makeId(hash: string): string {
  return crypto.createHash("sha256").update(hash).digest("hex").slice(0, 24);
}

function decodeHash(hash: string): Record<string, unknown> {
  const compact = hash.startsWith("mmd1.") ? hash.slice(5) : hash;
  const json = LZString.decompressFromEncodedURIComponent(compact);
  if (!json) throw new Error("Invalid compressed hash");
  return JSON.parse(json) as Record<string, unknown>;
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "newtonmmd-hash-api",
    chartsStored: charts.size,
  });
});

/**
 * Creates a single transfer hash that contains the complete diagram payload.
 * Also stores by unique ID for easy retrieval.
 */
app.post("/charts/hash", requireWriteKey, (req, res) => {
  const parsed = chartPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const hash = makeHash(parsed.data);
    const id = makeId(hash);
    const entry: StoredChart = {
      id,
      hash,
      createdAt: new Date().toISOString(),
      title: parsed.data.title ?? null,
    };
    charts.set(id, entry);

    res.status(201).json({
      id,
      hash,
      createdAt: entry.createdAt,
      title: entry.title,
      bytes: Buffer.byteLength(hash, "utf8"),
    });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Unable to hash chart" });
  }
});

/** Fetch stored hash by unique ID. */
app.get("/charts/:id", (req, res) => {
  const found = charts.get(req.params.id);
  if (!found) {
    res.status(404).json({ error: "Chart id not found" });
    return;
  }
  res.json(found);
});

/** Decodes a transfer hash back into the full diagram payload. */
app.post("/charts/decode", (req, res) => {
  const parsed = decodeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const payload = decodeHash(parsed.data.hash);
    res.json(payload);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Invalid hash" });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`NewtonMMD hash API listening on :${port}`);
});
