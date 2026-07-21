import { NextResponse } from "next/server";
import { estimateStudentAge } from "@/lib/openai";
import { getSession } from "@/lib/session-store";

type Context = { params: Promise<{ sessionId: string }> };

export const runtime = "nodejs";

export async function POST(request: Request, { params }: Context) {
  const { sessionId } = await params;
  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "AI audio is unavailable in local demo mode." }, { status: 503 });
  const body = await request.json();
  const student = session.students.find((item) => item.studentId === body.studentId);
  const text = String(body.text ?? "").trim().slice(0, 500);
  if (!student || !text) return NextResponse.json({ error: "Student and speech text are required." }, { status: 400 });

  const age = estimateStudentAge(session.lesson.gradeBand);
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts",
      voice: student.voice,
      input: text,
      instructions: `Voice: a real ${age}-year-old child (${session.lesson.gradeBand}) answering in class—light, youthful, higher-pitched, with natural kid phrasing and small hesitations. Never sound like an adult narrator. Personality: ${student.visibleProfile.personality}. Delivery style: ${student.visibleProfile.participationStyle}. Match the emotion of the line (unsure lines sound tentative, confident lines sound eager); keep it conversational and brief.`,
      response_format: "mp3",
    }),
  });
  if (!response.ok || !response.body) return NextResponse.json({ error: "Student audio could not be generated." }, { status: 502 });
  return new Response(response.body, { headers: { "Content-Type": response.headers.get("content-type") ?? "audio/mpeg", "Cache-Control": "no-store" } });
}
