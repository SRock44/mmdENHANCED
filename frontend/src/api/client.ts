const base = import.meta.env.VITE_API_BASE ?? "/api";

function getToken(): string | null {
  return localStorage.getItem("loewi_token");
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem("loewi_token", token);
  else localStorage.removeItem("loewi_token");
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const t = getToken();
  if (t) headers.set("Authorization", `Bearer ${t}`);
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

export const api = {
  register: (body: { email: string; password: string; displayName?: string }) =>
    request<{ token: string; user: UserMe }>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: UserMe }>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request<UserMe>("/auth/me"),
  patchMe: (body: { displayName?: string; onboardingCompleted?: boolean }) =>
    request<UserMe>("/users/me", { method: "PATCH", body: JSON.stringify(body) }),
  listDiagrams: () => request<DiagramDto[]>("/diagrams"),
  createDiagram: (body: Partial<Pick<DiagramDto, "name" | "code" | "settings">>) =>
    request<DiagramDto>("/diagrams", { method: "POST", body: JSON.stringify(body) }),
  updateDiagram: (id: string, body: Partial<Pick<DiagramDto, "name" | "code" | "settings">>) =>
    request<DiagramDto>(`/diagrams/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteDiagram: (id: string) => request<void>(`/diagrams/${id}`, { method: "DELETE" }),
};
