import type { ClassroomEvent, ClassroomXRay, Session } from "@/lib/types";

function reasonEventId(event: ClassroomEvent): string | undefined {
  const patch = event.metadata?.patch;
  if (!patch || typeof patch !== "object" || !("reasonEventId" in patch)) return undefined;
  return typeof patch.reasonEventId === "string" ? patch.reasonEventId : undefined;
}

function evidenceForStudent(events: ClassroomEvent[], studentId: string): ClassroomEvent[] {
  const teacherEvidenceIds = new Set(events
    .filter((event) => event.type === "state_transition" && event.actorId === studentId)
    .map(reasonEventId)
    .filter((id): id is string => Boolean(id)));
  return events.filter((event) => event.actorId === studentId || teacherEvidenceIds.has(event.eventId));
}

export function buildDeterministicReport(session: Session): ClassroomXRay {
  const conceptId = session.lesson.concepts[0]?.id;
  const concept = session.lesson.concepts[0];
  const studentReports = session.students.map((student) => {
    const initial = student.initialState;
    const final = session.states[student.studentId];
    const mastery = conceptId ? final.concepts[conceptId]?.mastery ?? 0 : 0;
    const initialMastery = conceptId ? initial.concepts[conceptId]?.mastery ?? 0 : 0;
    const relevant = evidenceForStudent(session.events, student.studentId);
    const transition = session.events.find((event) => event.type === "state_transition" && event.actorId === student.studentId);
    const studentSpeech = session.events.filter((event) => event.type === "student_utterance" && event.actorId === student.studentId);
    const journey = [studentSpeech[0], transition, studentSpeech.at(-1)]
      .filter((event, index, all): event is ClassroomEvent => Boolean(event) && all.indexOf(event) === index)
      .map((event) => ({
        label: event.type === "state_transition" ? "Teaching shift" : "Student evidence",
        timestampMs: event.timestampMs,
        evidenceEventIds: [event.eventId],
        description: event.text ?? "This moment changed the simulated learning state.",
      }));
    return {
      studentId: student.studentId,
      finalStatus: (mastery >= 3 ? "strong" : mastery >= 2 ? "partial" : "confused") as "strong" | "partial" | "confused",
      finalUnderstanding: mastery >= 3
        ? `Can explain ${concept?.name ?? "the core concept"} and support the explanation with evidence.`
        : mastery >= 2
          ? `Shows partial understanding of ${concept?.name ?? "the core concept"}, with some reasoning still developing.`
          : `Still needs a clearer model of ${concept?.name ?? "the lesson's core concept"}.`,
      remainingMisconceptionIds: Object.entries(final.activeMisconceptions).filter(([, value]) => value.strength >= 2).map(([id]) => id),
      majorChange: mastery > initialMastery ? `Mastery moved from ${initialMastery} to ${mastery} after evidence-linked instruction.` : "No durable mastery shift was observed in this short rehearsal.",
      journey: journey.length ? journey : relevant.slice(0, 1).map((event) => ({ label: "Observed moment", timestampMs: event.timestampMs, evidenceEventIds: [event.eventId], description: event.text ?? "Classroom participation" })),
    };
  });

  const transitionEvents = session.events.filter((event) => event.type === "state_transition");
  const teacherEvents = session.events.filter((event) => event.type === "teacher_utterance");
  const evidenceEventIds = new Set(transitionEvents.map(reasonEventId).filter((id): id is string => Boolean(id)));
  const strongEvidence = teacherEvents.find((event) => evidenceEventIds.has(event.eventId));
  const diagnostic = [...teacherEvents].reverse().find((event) => /\?|which|why|how/i.test(event.text ?? ""));
  const feedback: ClassroomXRay["feedback"] = [];
  if (strongEvidence) feedback.push({
    category: "worked", title: "Your explanation changed the learner model",
    whatHappened: strongEvidence.text ?? `You clarified ${concept?.name ?? "the lesson's core idea"}.`,
    whyItMattered: `${transitionEvents.length} simulated learner states changed after this explanation.`,
    timestampMs: strongEvidence.timestampMs, evidenceEventIds: [strongEvidence.eventId],
  });
  if (diagnostic) feedback.push({
    category: "worked", title: "You returned to the core idea",
    whatHappened: diagnostic.text ?? "You checked the class again.",
    whyItMattered: "A follow-up question made later understanding observable instead of assumed.",
    timestampMs: diagnostic.timestampMs, evidenceEventIds: [diagnostic.eventId],
  });
  const firstTeacher = teacherEvents[0];
  const quietStudent = [...session.students].sort((a, b) => a.privateProfile.expressiveness - b.privateProfile.expressiveness)[0];
  if (firstTeacher) feedback.push({
    category: "improve", title: "Invite a quiet voice earlier",
    whatHappened: "The first exchange favored quick volunteers.",
    whyItMattered: "Quieter students may hold different prerequisite gaps that whole-class volunteers do not reveal.",
    suggestion: `Ask everyone to commit to an idea, then call on ${quietStudent?.name ?? "a quieter student"} before opening the floor.`,
    timestampMs: firstTeacher.timestampMs, evidenceEventIds: [firstTeacher.eventId],
  });

  const functional = studentReports.filter((student) => student.finalStatus !== "confused").length;
  return {
    overview: {
      objectiveCoverage: session.lesson.objectives.map((objective) => ({ objectiveId: objective.id, studentCount: functional })),
      widelyUnderstoodConceptIds: functional >= 3 && conceptId ? [conceptId] : [],
      widespreadConfusionConceptIds: functional < 3 && conceptId ? [conceptId] : [],
      unresolvedMisconceptionCount: studentReports.reduce((total, student) => total + student.remainingMisconceptionIds.length, 0),
      summary: `${functional} of ${session.students.length} simulated students reached at least partial understanding. ${transitionEvents.length} evidence-linked state changes were recorded.`,
    },
    students: studentReports,
    feedback,
    events: structuredClone(session.events),
  };
}
