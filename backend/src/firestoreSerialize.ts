import type { DocumentData } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";

export function tsToIso(v: unknown): string {
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (v && typeof v === "object" && "toDate" in v && typeof (v as Timestamp).toDate === "function") {
    return (v as Timestamp).toDate().toISOString();
  }
  return new Date().toISOString();
}

export function userFromDoc(uid: string, data: DocumentData | undefined): {
  id: string;
  email: string;
  displayName: string | null;
  onboardingCompleted: boolean;
  createdAt?: string;
} {
  return {
    id: uid,
    email: (data?.email as string) ?? "",
    displayName: (data?.displayName as string | null | undefined) ?? null,
    onboardingCompleted: Boolean(data?.onboardingCompleted),
    createdAt: data?.createdAt ? tsToIso(data.createdAt) : undefined,
  };
}

export function diagramFromDoc(id: string, data: DocumentData | undefined): {
  id: string;
  name: string;
  code: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
} {
  return {
    id,
    name: (data?.name as string) ?? "Untitled",
    code: (data?.code as string) ?? "",
    settings: (data?.settings as Record<string, unknown>) ?? {},
    createdAt: tsToIso(data?.createdAt),
    updatedAt: tsToIso(data?.updatedAt),
  };
}
