import { NextResponse } from "next/server";
import { buildDeterministicReport } from "@/lib/report";
import { appendEvent, deleteSession, getSession } from "@/lib/session-store";

type Context = { params: Promise<{ sessionId: string }> };

export async function POST(request: Request, { params }: Context) {
  const { sessionId } = await params;
  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  if (Number(body.eventSequence) !== session.events.length) return NextResponse.json({ error: "Stale classroom event sequence.", eventSequence: session.events.length }, { status: 409 });
  if (session.status !== "ended") {
    appendEvent(session, { type: "session_ended", actorId: "teacher" });
    session.status = "ended";
  }
  const report = buildDeterministicReport(session);
  const timer = setTimeout(() => deleteSession(sessionId), 5 * 60 * 1000);
  timer.unref?.();
  return NextResponse.json({ report });
}
