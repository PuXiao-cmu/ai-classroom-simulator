import type { PublicSession } from "@/lib/types";

export function cacheSession(session: PublicSession) {
  if (typeof window !== "undefined") sessionStorage.setItem(`classroom:${session.sessionId}`, JSON.stringify(session));
}

export function readCachedSession(id: string): PublicSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(`classroom:${id}`);
  if (!raw) return null;
  try { return JSON.parse(raw) as PublicSession; } catch { return null; }
}

export async function fetchSession(id: string): Promise<PublicSession> {
  const response = await fetch(`/api/sessions/${id}`, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Could not load the rehearsal.");
  cacheSession(data.session);
  return data.session;
}

export function formatTime(timestampMs: number): string {
  const seconds = Math.max(0, Math.floor(timestampMs / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
