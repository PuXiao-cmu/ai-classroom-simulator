import { NextResponse } from "next/server";
import { demoStudents } from "@/lib/demo-data";
import { generateStudentsWithOpenAI } from "@/lib/openai";
import { createSession, publicSession } from "@/lib/session-store";
import { lessonModelSchema, type LessonModel, type StudentModel } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const debugId = (request.headers.get("x-upload-debug-id") ?? crypto.randomUUID().slice(0, 8)).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  const startedAt = Date.now();
  const log = (event: string, details: Record<string, unknown> = {}) => console.info(`[lesson-upload:${debugId}] ${event}`, details);
  try {
    log("classroom_request_received");
    const body = await request.json();
    const lesson = lessonModelSchema.parse(body.lesson);
    log("lesson_validated", { lessonId: lesson.lessonId, concepts: lesson.concepts.length, misconceptions: lesson.misconceptions.length });
    let students: StudentModel[] | null = null;
    let usedAI = false;
    try {
      log("student_generation_started");
      students = await generateStudentsWithOpenAI(lesson);
      usedAI = Boolean(students);
      log("student_generation_completed", { producedRoster: usedAI, elapsedMs: Date.now() - startedAt });
    } catch (error) {
      console.warn(`[lesson-upload:${debugId}] student_generation_failed`, { message: error instanceof Error ? error.message : "Unknown error", elapsedMs: Date.now() - startedAt });
      // Deterministic adaptation keeps preparation runnable during API failures.
    }
    if (!students) {
      log("roster_fallback_started");
      students = adaptRoster(lesson);
    }
    const session = createSession(lesson, students);
    log("classroom_request_completed", { usedAI, sessionId: session.sessionId, totalElapsedMs: Date.now() - startedAt });
    return NextResponse.json({ session: publicSession(session), usedAI, debugId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not generate the classroom.";
    console.error(`[lesson-upload:${debugId}] classroom_request_failed`, { message, totalElapsedMs: Date.now() - startedAt });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function adaptRoster(lesson: LessonModel): StudentModel[] {
  const concepts = lesson.concepts.map((item) => item.id);
  const misconceptions = lesson.misconceptions.map((item) => item.id);
  return structuredClone(demoStudents).map((student, index) => ({
    ...student,
    initialState: {
      ...student.initialState,
      concepts: Object.fromEntries(concepts.map((id) => [id, { mastery: Math.min(3, 1 + (index % 3)), confidence: 0.35 + index * 0.1 }])),
      activeMisconceptions: Object.fromEntries(misconceptions.map((id, misconceptionIndex) => [id, { strength: index === misconceptionIndex ? 3 : index < 3 ? 1 : 0 }])),
      missingPrerequisiteIds: index === 2 ? lesson.prerequisites.slice(0, 1).map((item) => item.id) : [],
    },
  }));
}
