import { NextResponse } from "next/server";
import { appendEvent, getSession, publicSession } from "@/lib/session-store";

type Context = { params: Promise<{ sessionId: string }> };

export async function POST(request: Request, { params }: Context) {
  const { sessionId } = await params;
  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  if (Number(body.eventSequence ?? 0) !== session.events.length) return NextResponse.json({ error: "Session changed in another request." }, { status: 409 });
  if (session.status === "ready") {
    session.status = "live";
    session.startedAt = Date.now();
    appendEvent(session, { type: "session_started", actorId: "teacher", timestampMs: 0 });
  }
  return NextResponse.json({ session: publicSession(session) });
}
