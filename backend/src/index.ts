import express from "express";
import cors from "cors";
import helmet from "helmet";
import { initFirebaseAdmin } from "./firebaseApp.js";
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { diagramsRouter } from "./routes/diagrams.js";
import { publicGraphsRouter } from "./routes/publicGraphs.js";
import { agentGraphsRouter } from "./routes/agentGraphs.js";
import { aiRouter } from "./routes/ai.js";

const app = express();
const port = Number(process.env.PORT) || 4000;

const isProd = process.env.NODE_ENV === "production";
const rawOrigins = process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()).filter(Boolean);

if (isProd && (!rawOrigins || rawOrigins.length === 0)) {
  console.error("CORS_ORIGIN must be set in production (comma-separated allowlist)");
  process.exit(1);
}

const corsOrigin: boolean | string[] = rawOrigins && rawOrigins.length > 0 ? rawOrigins : true;

initFirebaseAdmin();

app.use(helmet());
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "loewi-mmd-api" });
});

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/diagrams", diagramsRouter);
app.use("/public", publicGraphsRouter);
app.use("/agent", agentGraphsRouter);
app.use("/ai", aiRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`loewiMMD API listening on :${port}`);
});
