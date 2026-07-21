import { NextResponse } from "next/server";
import { commitDecision, deterministicDecision, isMeaningfulUtterance } from "@/lib/orchestrator";
import { orchestrateWithOpenAI } from "@/lib/openai";
import { appendEvent, getSession } from "@/lib/session-store";

type Context = { params: Promise<{ sessionId: string }> };

export async function POST(request: Request, { params }: Context) {
  const { sessionId } = await params;
  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });
  if (session.status !== "live") return NextResponse.json({ error: "This rehearsal is not live." }, { status: 409 });
  const body = await request.json();
  const text = String(body.text ?? "").trim().slice(0, 1600);
  if (!text) return NextResponse.json({ error: "The transcript was empty." }, { status: 400 });
  if (Number(body.eventSequence) !== session.events.length) return NextResponse.json({ error: "Stale classroom event sequence.", eventSequence: session.events.length }, { status: 409 });

  const teacherEvent = appendEvent(session, { type: "teacher_utterance", actorId: "teacher", text });
  if (!isMeaningfulUtterance(text, session)) {
    return NextResponse.json({ decision: null, noActionReason: "Skipped by the meaningful-event gate.", eventSequence: session.events.length, recentEvents: session.events.slice(-8), source: "gate" });
  }

  let decision = null;
  let source: "openai" | "deterministic" = "deterministic";
  const useOpenAIDemo = process.env.USE_OPENAI_DEMO === "true" || session.lesson.lessonId !== "newtons-third-law-v1";
  if (process.env.OPENAI_API_KEY && useOpenAIDemo) {
    try {
      decision = await orchestrateWithOpenAI(session, text, teacherEvent.eventId);
      if (decision) source = "openai";
    } catch (error) {
      // Fall through to the bounded deterministic orchestrator.
      console.error("[orchestrator] OpenAI call failed:", error instanceof Error ? error.message : error);
    }
  }
  decision ??= deterministicDecision(session, text, teacherEvent.eventId);
  const committed = commitDecision(session, decision);
  return NextResponse.json({ decision: committed, eventSequence: session.events.length, recentEvents: session.events.slice(-10), source });
}
