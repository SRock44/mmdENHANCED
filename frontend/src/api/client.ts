const base = import.meta.env.VITE_API_BASE ?? "/api";

let tokenProvider: (() => Promise<string | null>) | null = null;

/** Wired from AuthContext: returns Firebase ID token for current user. */
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

async function getBearer(): Promise<string | null> {
  if (!tokenProvider) return null;
  return tokenProvider();
}

async function request<T>(path: string, init?: RequestInit, requireAuth = true): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (requireAuth) {
    const t = await getBearer();
    if (!t) throw new Error("Not signed in");
    headers.set("Authorization", `Bearer ${t}`);
  }
  const res = await fetch(`${base}${path}`, { ...init, headers });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = data?.error ?? res.statusText;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data as T;
}

/** No auth — embeddable public graphs. */
export async function fetchPublicGraph(id: string): Promise<PublicGraphDto> {
  const res = await fetch(`${base}/public/graphs/${encodeURIComponent(id)}`);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = data?.error ?? res.statusText;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data as PublicGraphDto;
}

export type AiChatMessage = { role: "user" | "assistant" | "system"; content: string };

export const api = {
  me: () => request<UserMe>("/auth/me"),
  patchMe: (body: { displayName?: string; onboardingCompleted?: boolean }) =>
    request<UserMe>("/users/me", { method: "PATCH", body: JSON.stringify(body) }),
  listDiagrams: () => request<DiagramDto[]>("/diagrams"),
  createDiagram: (body: Partial<Pick<DiagramDto, "name" | "code" | "settings">>) =>
    request<DiagramDto>("/diagrams", { method: "POST", body: JSON.stringify(body) }),
  updateDiagram: (id: string, body: Partial<Pick<DiagramDto, "name" | "code" | "settings">>) =>
    request<DiagramDto>(`/diagrams/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteDiagram: (id: string) => request<void>(`/diagrams/${id}`, { method: "DELETE" }),
  aiChat: (body: { messages: AiChatMessage[]; diagramCode?: string }) =>
    request<{ role: string; content: string }>("/ai/chat", { method: "POST", body: JSON.stringify(body) }),
};
