const base = import.meta.env.VITE_API_BASE ?? "/api";

let tokenProvider: (() => Promise<string | null>) | null = null;

export function setApiTokenProvider(fn: () => Promise<string | null>): void {
  tokenProvider = fn;
}

export type UserMe = {
  id: string;
  email: string;
  displayName: string | null;
  onboardingCompleted: boolean;
  createdAt?: string;
};

export type DiagramDto = {
  id: string;
  name: string;
  code: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PublicGraphDto = {
  id: string;
  title: string | null;
  code: string;
  settings: Record<string, unknown>;
  meta: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

const DIAGRAMS_KEY = "newtonmmd_diagrams";

function nowIso(): string {
  return new Date().toISOString();
}

function randomId(): string {
  return cryptoRandom().slice(0, 24);
}

function cryptoRandom(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function loadDiagrams(): DiagramDto[] {
  try {
    const raw = localStorage.getItem(DIAGRAMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DiagramDto[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDiagrams(diagrams: DiagramDto[]): void {
  localStorage.setItem(DIAGRAMS_KEY, JSON.stringify(diagrams));
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (tokenProvider) {
    const token = await tokenProvider();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(`${base}${path}`, { ...init, headers });
}

async function decodeResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = data?.error ?? res.statusText;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data as T;
}

export async function fetchPublicGraph(id: string): Promise<PublicGraphDto> {
  const infoRes = await fetch(`${base}/charts/${encodeURIComponent(id)}`);
  const info = await decodeResponse<{ id: string; hash: string; title: string | null; createdAt: string }>(infoRes);

  const decodeRes = await fetch(`${base}/charts/decode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hash: info.hash }),
  });
  const payload = await decodeResponse<Record<string, unknown>>(decodeRes);

  return {
    id: info.id,
    title: (payload.title as string | null | undefined) ?? info.title ?? null,
    code: (payload.diagram as string) ?? "",
    settings: (payload.settings as Record<string, unknown>) ?? {},
    meta: (payload.meta as Record<string, unknown>) ?? {},
    createdAt: info.createdAt,
    updatedAt: info.createdAt,
  };
}

export type AiChatMessage = { role: "user" | "assistant" | "system"; content: string };

export const api = {
  me: async () => {
    throw new Error("User profile API removed from backend");
  },
  patchMe: async (_body: { displayName?: string; onboardingCompleted?: boolean }) => {
    throw new Error("User profile API removed from backend");
  },
  listDiagrams: async (): Promise<DiagramDto[]> => {
    const list = loadDiagrams();
    return [...list].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  },
  createDiagram: async (body: Partial<Pick<DiagramDto, "name" | "code" | "settings">>): Promise<DiagramDto> => {
    const list = loadDiagrams();
    const now = nowIso();
    const created: DiagramDto = {
      id: randomId(),
      name: body.name ?? "Untitled Diagram",
      code: body.code ?? "",
      settings: body.settings ?? {},
      createdAt: now,
      updatedAt: now,
    };
    list.unshift(created);
    saveDiagrams(list);
    return created;
  },
  updateDiagram: async (id: string, body: Partial<Pick<DiagramDto, "name" | "code" | "settings">>): Promise<DiagramDto> => {
    const list = loadDiagrams();
    const idx = list.findIndex((d) => d.id === id);
    if (idx < 0) throw new Error("Diagram not found");
    const updated: DiagramDto = {
      ...list[idx],
      ...body,
      updatedAt: nowIso(),
    };
    list[idx] = updated;
    saveDiagrams(list);
    return updated;
  },
  deleteDiagram: async (id: string): Promise<void> => {
    const list = loadDiagrams().filter((d) => d.id !== id);
    saveDiagrams(list);
  },
  aiChat: async (_body: { messages: AiChatMessage[]; diagramCode?: string }) => {
    throw new Error("AI endpoint removed from backend");
  },
  createChartHash: async (body: {
    diagram: string;
    title?: string | null;
    settings?: Record<string, unknown>;
    meta?: Record<string, unknown>;
  }) => {
    const res = await authedFetch("/charts/hash", { method: "POST", body: JSON.stringify(body) });
    return decodeResponse<{ id: string; hash: string; createdAt: string; title: string | null; bytes: number }>(res);
  },
};
