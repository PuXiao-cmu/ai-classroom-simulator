import type { LessonModel, StatePatch, StudentCognitiveState } from "@/lib/types";

export type PatchResult = { ok: true; state: StudentCognitiveState } | { ok: false; error: string };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function applyStatePatch(state: StudentCognitiveState, patch: StatePatch, lesson: LessonModel): PatchResult {
  if (patch.basedOnVersion !== state.version) return { ok: false, error: "stale_version" };
  if (!patch.reasonEventId || !patch.evidenceQuote.trim()) return { ok: false, error: "missing_evidence" };

  const next = structuredClone(state);
  for (const operation of patch.operations) {
    if (operation.op === "adjust_mastery") {
      if (!lesson.concepts.some((concept) => concept.id === operation.conceptId) || !next.concepts[operation.conceptId]) {
        return { ok: false, error: "unknown_concept" };
      }
      const target = next.concepts[operation.conceptId];
      target.mastery = clamp(target.mastery + operation.delta, 0, 4);
      target.confidence = clamp(target.confidence + operation.delta * 0.1, 0, 1);
      target.lastEvidenceEventId = patch.reasonEventId;
    } else if (operation.op === "adjust_misconception") {
      if (!lesson.misconceptions.some((item) => item.id === operation.misconceptionId) || !next.activeMisconceptions[operation.misconceptionId]) {
        return { ok: false, error: "unknown_misconception" };
      }
      const target = next.activeMisconceptions[operation.misconceptionId];
      target.strength = clamp(target.strength + operation.delta, 0, 3);
      target.lastEvidenceEventId = patch.reasonEventId;
    } else if (operation.op === "set_confusion") {
      next.confusion = clamp(operation.value, 0, 1);
    } else {
      next.engagement = clamp(next.engagement + operation.delta, 0, 1);
    }
  }
  next.version += 1;
  return { ok: true, state: next };
}
