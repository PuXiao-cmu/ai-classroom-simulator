import { NextResponse } from "next/server";
import { demoLesson, demoStudents } from "@/lib/demo-data";
import { createSession, publicSession } from "@/lib/session-store";
import { hasOpenAI } from "@/lib/openai";

export const runtime = "nodejs";

export async function GET() {
  const session = createSession(demoLesson, demoStudents);
  return NextResponse.json({ session: publicSession(session), apiConfigured: hasOpenAI() });
}
