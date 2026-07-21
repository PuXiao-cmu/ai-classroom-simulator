import type { LessonModel, StudentModel } from "@/lib/types";

export type TeachingPrompt = { label: string; text: string };

export function buildTeachingPrompts(lesson: LessonModel, students: StudentModel[]): TeachingPrompt[] {
  const diagnostic = lesson.diagnosticOpportunities[0];
  const concept = lesson.concepts.find((item) => diagnostic?.conceptIds.includes(item.id)) ?? lesson.concepts[0];
  const student = students[0];
  const opening = diagnostic?.prompt ?? `What do you already understand about ${concept.name}?`;
  const explanation = `Here is the key idea about ${concept.name}: ${concept.canonicalExplanation}`;
  const followUp = student
    ? `${student.name}, try that question again: ${opening} Explain your reasoning.`
    : `Let's try that question again: ${opening} Explain your reasoning.`;

  return [
    { label: "Surface the misconception", text: opening },
    { label: "Teach the distinction", text: explanation },
    { label: "Check the change", text: followUp },
  ];
}
