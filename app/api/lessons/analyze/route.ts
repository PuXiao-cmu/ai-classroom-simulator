import { NextResponse } from "next/server";
import { analyzeLessonWithOpenAI } from "@/lib/openai";
import { extractLesson } from "@/lib/lesson-ingestion";
import type { LessonModel } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const debugId = (request.headers.get("x-upload-debug-id") ?? crypto.randomUUID().slice(0, 8)).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  const startedAt = Date.now();
  const log = (event: string, details: Record<string, unknown> = {}) => console.info(`[lesson-upload:${debugId}] ${event}`, details);
  try {
    log("request_received");
    const form = await request.formData();
    const file = form.get("file");
    const pastedText = String(form.get("text") ?? "").trim();
    log("form_parsed", file instanceof File
      ? { input: "file", name: file.name, size: file.size, type: file.type }
      : { input: "text", characters: pastedText.length });
    if (!(file instanceof File) && pastedText.length < 100) {
      log("request_rejected", { reason: "insufficient_input" });
      return NextResponse.json({ error: "Add a lesson file or at least 100 characters of lesson notes." }, { status: 400 });
    }
    log("extraction_started");
    const source = file instanceof File ? await extractLesson(file) : pastedText;
    log("extraction_completed", { extractedCharacters: source.length, elapsedMs: Date.now() - startedAt });
    if (source.length < 100) {
      log("request_rejected", { reason: "insufficient_extracted_text" });
      return NextResponse.json({ error: "We could not extract enough useful lesson text. Paste lesson notes instead." }, { status: 422 });
    }
    const filename = file instanceof File ? file.name : "pasted lesson notes";
    let lesson: LessonModel | null = null;
    let usedAI = false;
    try {
      log("ai_analysis_started");
      lesson = await analyzeLessonWithOpenAI(source, filename);
      usedAI = Boolean(lesson);
      log("ai_analysis_completed", { producedLesson: usedAI, elapsedMs: Date.now() - startedAt });
    } catch (error) {
      console.warn(`[lesson-upload:${debugId}] ai_analysis_failed`, { message: error instanceof Error ? error.message : "Unknown error", elapsedMs: Date.now() - startedAt });
      // The heuristic result below preserves the upload path when the API is unavailable.
    }
    if (!lesson) {
      log("heuristic_fallback_started");
      lesson = heuristicLesson(source, filename);
    }
    log("request_completed", { usedAI, lessonId: lesson.lessonId, totalElapsedMs: Date.now() - startedAt });
    return NextResponse.json({ lesson, usedAI, extractedCharacters: source.length, debugId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lesson analysis failed.";
    console.error(`[lesson-upload:${debugId}] request_failed`, { message, totalElapsedMs: Date.now() - startedAt });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function heuristicLesson(source: string, filename: string): LessonModel {
  const titleLine = source.split("\n").find((line) => line.trim().length > 6)?.replace(/^\[[^\]]+\]\s*/, "").slice(0, 90);
  const title = titleLine || filename.replace(/\.[^.]+$/, "");
  return {
    lessonId: "uploaded-lesson-fallback",
    title,
    gradeBand: "K–12",
    subject: "STEM",
    sourceSummary: source.replace(/\[[^\]]+\]/g, "").slice(0, 360),
    objectives: [{ id: "obj-core", statement: `Explain and apply the central idea in ${title}.`, successEvidence: ["Uses key vocabulary", "Explains reasoning", "Applies the idea to a new example"] }],
    concepts: [{ id: "c-core", name: title, canonicalExplanation: source.slice(0, 900), prerequisiteIds: [] }],
    prerequisites: [],
    misconceptions: [{ id: "m-surface", conceptId: "c-core", belief: "A surface-level rule is enough without explaining why it works.", diagnosticSignals: ["rule only"], correctionSignals: ["because", "evidence", "example"] }],
    diagnosticOpportunities: [{ id: "d-transfer", conceptIds: ["c-core"], prompt: "How would you apply this idea in a new situation?", expectedEvidence: "Explains a transfer example with causal reasoning." }],
  };
}
