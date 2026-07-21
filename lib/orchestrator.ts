import { applyStatePatch } from "@/lib/reducer";
import { appendEvent } from "@/lib/session-store";
import type { LessonModel, OrchestrationDecision, Session, StatePatch, StudentModel } from "@/lib/types";

const filler = /^(um+|uh+|okay|ok|all right|let'?s begin|listen up)[.! ]*$/i;
const management = /^(take (your )?seats|open your|turn to page|eyes up|quiet please)/i;

export function isMeaningfulUtterance(text: string, session: Session): boolean {
  const clean = text.trim();
  if (!clean || filler.test(clean) || management.test(clean)) return false;
  if (clean.includes("?")) return true;
  const vocabulary = session.lesson.concepts.flatMap((concept) => concept.name.toLowerCase().split(/\W+/));
  return clean.length >= 24 || vocabulary.some((term) => term.length > 3 && clean.toLowerCase().includes(term));
}

function findNamedStudent(text: string, students: StudentModel[]): StudentModel | undefined {
  const lower = text.toLowerCase();
  return students.find((student) => new RegExp(`\\b${student.name.toLowerCase()}\\b`).test(lower));
}

function newtonsPatch(session: Session, studentId: string, eventId: string, quote: string, strongCorrection: boolean): StatePatch {
  const state = session.states[studentId];
  const operations: StatePatch["operations"] = [{
    op: "adjust_mastery",
    conceptId: "c-force-pairs",
    delta: 1,
  }];
  if (state.activeMisconceptions["m-bigger-object"]?.strength > 0) {
    operations.push({ op: "adjust_misconception", misconceptionId: "m-bigger-object", delta: -1 });
  }
  operations.push({ op: "set_confusion", value: Math.max(0.12, state.confusion - (strongCorrection ? 0.24 : 0.12)) });
  return {
    studentId,
    basedOnVersion: state.version,
    reasonEventId: eventId,
    operations,
    rationale: "The explanation explicitly connected equal-and-opposite forces to their effects on different objects.",
    evidenceQuote: quote,
  };
}

function newtonsDecision(session: Session, text: string, eventId: string): OrchestrationDecision {
  const lower = text.toLowerCase();
  const target = findNamedStudent(text, session.students);
  const isQuestion = text.includes("?") || /\b(which|what|why|how|who|can you|does|do)\b/i.test(text);
  const isCorrection = /equal|opposite|different object|less mass|acceleration|balloon|skateboard/.test(lower);
  const isTruckPrompt = /(truck|bicycle|bike).*(force|collision)|force.*(truck|bicycle|bike)/.test(lower);
  const maya = session.states.maya;
  const teacherAct: OrchestrationDecision["teacherAct"] = {
    kind: target && isQuestion ? "direct_question" : isQuestion ? "class_question" : isCorrection ? "explanation" : "other",
    targetStudentId: target?.studentId,
    relevantConceptIds: (isCorrection || isTruckPrompt) ? ["c-force-pairs", "c-motion-effect"] : [],
  };

  if (isCorrection) {
    const studentIds = ["maya", "theo", "lena"].filter((id) => session.states[id]?.concepts["c-force-pairs"]);
    return {
      teacherAct,
      statePatches: studentIds.map((id) => newtonsPatch(session, id, eventId, text, true)),
      handRaises: lower.includes("?") ? ["theo", "zoe"] : [],
      noActionReason: "Students are processing the explanation.",
    };
  }

  if (target && isQuestion) {
    let response = "I think the forces are equal and opposite because each object is pushing on the other one.";
    if (target.studentId === "maya") {
      response = maya.activeMisconceptions["m-bigger-object"].strength >= 3
        ? "The truck exerts more force because it’s much bigger and heavier."
        : "Neither force is greater—they’re equal and opposite. The bicycle changes motion more because it has less mass.";
    } else if (target.studentId === "lena") {
      response = "I think they’re equal, but they act on different objects, so they don’t cancel each other out.";
    }
    return { teacherAct, statePatches: [], handRaises: [], speaker: { studentId: target.studentId, mode: "answer", text: response } };
  }

  if (isTruckPrompt && isQuestion) {
    const response = maya.activeMisconceptions["m-bigger-object"].strength >= 3
      ? "The truck pushes harder. It’s heavier, so I think the bicycle feels a bigger force."
      : "They push on each other with equal forces in opposite directions, but the bicycle accelerates more because it has less mass.";
    return {
      teacherAct,
      statePatches: [],
      handRaises: maya.activeMisconceptions["m-bigger-object"].strength >= 3 ? ["maya", "owen"] : ["maya", "theo", "zoe"],
      speaker: { studentId: "maya", mode: "volunteer", text: response },
    };
  }

  if (isQuestion) {
    return {
      teacherAct,
      statePatches: [],
      handRaises: ["theo", "zoe"],
      speaker: { studentId: "theo", mode: "answer", text: "Are the two forces always equal even if one object barely moves?" },
    };
  }

  return { teacherAct, statePatches: [], handRaises: [], noActionReason: "No student response was needed." };
}

const stopwords = new Set([
  "about", "after", "again", "because", "before", "being", "could", "does", "from", "have", "into",
  "lesson", "should", "their", "there", "these", "they", "this", "through", "what", "when", "where",
  "which", "while", "with", "would", "your",
]);

function keywords(value: string): string[] {
  return [...new Set(value.toLowerCase().match(/[a-z0-9]+/g) ?? [])]
    .filter((word) => word.length > 3 && !stopwords.has(word));
}

function relevantConcepts(lesson: LessonModel, text: string) {
  const lower = text.toLowerCase();
  const matched = lesson.concepts.filter((concept) =>
    keywords(`${concept.name} ${concept.canonicalExplanation}`).some((word) => lower.includes(word)),
  );
  if (matched.length) return matched;

  const diagnostic = lesson.diagnosticOpportunities.find((item) =>
    keywords(item.prompt).some((word) => lower.includes(word)),
  );
  return diagnostic
    ? lesson.concepts.filter((concept) => diagnostic.conceptIds.includes(concept.id))
    : [];
}

function genericPatch(
  session: Session,
  studentId: string,
  conceptId: string,
  misconceptionId: string | undefined,
  eventId: string,
  quote: string,
): StatePatch {
  const state = session.states[studentId];
  const concept = session.lesson.concepts.find((item) => item.id === conceptId)!;
  const misconception = session.lesson.misconceptions.find((item) => item.id === misconceptionId);
  const operations: StatePatch["operations"] = [];
  if (state.concepts[conceptId]?.mastery < 4) operations.push({ op: "adjust_mastery", conceptId, delta: 1 });
  if (misconceptionId && state.activeMisconceptions[misconceptionId]?.strength > 0) {
    operations.push({ op: "adjust_misconception", misconceptionId, delta: -1 });
  }
  operations.push({ op: "set_confusion", value: Math.max(0.08, state.confusion - 0.16) });
  return {
    studentId,
    basedOnVersion: state.version,
    reasonEventId: eventId,
    operations,
    rationale: misconception
      ? `The explanation added evidence for ${concept.name} and addressed the belief that ${misconception.belief}`
      : `The explanation added evidence for ${concept.name}.`,
    evidenceQuote: quote,
  };
}

function activeMisconception(session: Session, studentId: string, conceptIds: string[]) {
  const state = session.states[studentId];
  return session.lesson.misconceptions
    .filter((item) => !conceptIds.length || conceptIds.includes(item.conceptId))
    .filter((item) => state.activeMisconceptions[item.id]?.strength > 0)
    .sort((a, b) => state.activeMisconceptions[b.id].strength - state.activeMisconceptions[a.id].strength)[0];
}

type QuestionKind = "evidence" | "example" | "why" | "how" | "compare" | "definition" | "general";

function questionKind(text: string): QuestionKind {
  if (/\b(evidence|prove|observe|measure|how (?:do|would|could) (?:we|you) know)\b/i.test(text)) return "evidence";
  if (/\b(example|scenario|situation)\b/i.test(text)) return "example";
  if (/\bwhy\b/i.test(text)) return "why";
  if (/\bhow\b/i.test(text)) return "how";
  if (/\b(compare|difference|different|similar)\b/i.test(text)) return "compare";
  if (/\b(what is|what are|define|meaning of)\b/i.test(text)) return "definition";
  return "general";
}

function scoreAnswer(answer: string, question: string): number {
  const questionWords = new Set(keywords(question));
  return keywords(answer).reduce((score, word) => score + (questionWords.has(word) ? 1 : 0), 0);
}

function groundedAnswers(session: Session, conceptIds: string[], question: string): string[] {
  const concepts = session.lesson.concepts.filter((item) => conceptIds.includes(item.id));
  const diagnostics = session.lesson.diagnosticOpportunities.filter((item) =>
    item.conceptIds.some((id) => conceptIds.includes(id)),
  );
  const objectiveEvidence = session.lesson.objectives.flatMap((objective) => objective.successEvidence);
  return [
    ...diagnostics.map((item) => item.expectedEvidence),
    ...concepts.map((item) => item.canonicalExplanation),
    ...objectiveEvidence,
    session.lesson.sourceSummary,
  ]
    .filter((answer, index, all) => Boolean(answer.trim()) && all.indexOf(answer) === index)
    .sort((a, b) => scoreAnswer(b, question) - scoreAnswer(a, question));
}

function studentResponseCandidates(material: string, kind: QuestionKind, uncertain: boolean): string[] {
  const tentative = uncertain ? "I'm not completely sure, but " : "";
  const lowerMaterial = material.charAt(0).toLowerCase() + material.slice(1);
  const byKind: Record<QuestionKind, string[]> = {
    evidence: [
      `${tentative}the evidence I would look for is: ${material}`,
      `${tentative}I would check whether ${lowerMaterial}`,
      `One observation that could help is: ${material}`,
    ],
    example: [
      `${tentative}an example I would use is connected to this idea: ${material}`,
      `I would test the idea in a new situation using this rule: ${material}`,
      `A scenario should show that ${lowerMaterial}`,
    ],
    why: [
      `${tentative}my reason is that ${lowerMaterial}`,
      `I think that because ${lowerMaterial}`,
      `The reason I connected those ideas is that ${lowerMaterial}`,
    ],
    how: [
      `${tentative}the way I understand it is: ${material}`,
      `I would explain the process this way: ${material}`,
      `My steps would follow this idea: ${material}`,
    ],
    compare: [
      `${tentative}the important difference is captured by this idea: ${material}`,
      `I would compare them using this rule: ${material}`,
      `The distinction I notice is that ${lowerMaterial}`,
    ],
    definition: [
      `${tentative}I would define it this way: ${material}`,
      `My definition is: ${material}`,
      `The key meaning is that ${lowerMaterial}`,
    ],
    general: [
      `${tentative}my answer is: ${material}`,
      `I think the key idea is that ${lowerMaterial}`,
      `What matters most here is that ${lowerMaterial}`,
    ],
  };
  return byKind[kind].map(shorten);
}

function responseForStudent(session: Session, studentId: string, conceptIds: string[], question: string): string {
  const state = session.states[studentId];
  const misconception = activeMisconception(session, studentId, conceptIds);
  const kind = questionKind(question);
  // A student with no grasp of the concept and no driving misconception cannot answer at all.
  const mastery = state.concepts[conceptIds[0]]?.mastery ?? 0;
  const hasStrongMisconception = Boolean(misconception && state.activeMisconceptions[misconception.id].strength >= 2);
  if (mastery <= 1 && !hasStrongMisconception) {
    const blanks = ["Um… I don't know.", "I'm not sure. I forgot.", "I don't know that one yet.", "Hmm… I can't remember."];
    const spoken = new Set(session.events
      .filter((event) => event.type === "student_utterance" && event.actorId === studentId)
      .map((event) => event.text));
    return blanks.find((line) => !spoken.has(line)) ?? blanks[0];
  }
  const knowledge = groundedAnswers(session, conceptIds, question);
  const useMisconception = Boolean(misconception && state.activeMisconceptions[misconception.id].strength >= 2)
    && !["evidence", "example"].includes(kind);
  const materials = useMisconception && misconception
    ? [misconception.belief, ...knowledge]
    : knowledge;
  const previous = new Set(session.events
    .filter((event) => event.type === "student_utterance" && event.actorId === studentId)
    .map((event) => event.text?.replace(/\s+/g, " ").trim().toLowerCase())
    .filter((value): value is string => Boolean(value)));
  const uncertain = state.concepts[conceptIds[0]]?.confidence < 0.55 || state.confusion > 0.55;
  const candidates = materials.flatMap((material) => studentResponseCandidates(material, kind, uncertain));
  return candidates.find((candidate) => !previous.has(candidate.toLowerCase()))
    ?? shorten(`I want to revise my earlier answer. ${knowledge[0] ?? session.lesson.concepts[0].canonicalExplanation}`);
}

function shorten(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= 300 ? normalized : `${normalized.slice(0, 297).trimEnd()}…`;
}

function genericDecision(session: Session, text: string, eventId: string): OrchestrationDecision {
  const target = findNamedStudent(text, session.students);
  const isQuestion = text.includes("?") || /\b(which|what|why|how|who|can you|does|do|explain)\b/i.test(text);
  const matchedConcepts = relevantConcepts(session.lesson, text);
  const diagnosticConceptIds = session.lesson.diagnosticOpportunities.find((item) =>
    keywords(item.prompt).some((word) => text.toLowerCase().includes(word)),
  )?.conceptIds ?? [];
  const conceptIds = [...new Set((matchedConcepts.length ? matchedConcepts.map((item) => item.id) : diagnosticConceptIds))];
  const isExplanation = !isQuestion && (conceptIds.length > 0 || text.trim().length >= 40);
  const teacherAct: OrchestrationDecision["teacherAct"] = {
    kind: target && isQuestion ? "direct_question" : isQuestion ? "class_question" : isExplanation ? "explanation" : "other",
    targetStudentId: target?.studentId,
    relevantConceptIds: conceptIds,
  };

  if (isExplanation) {
    const concept = matchedConcepts[0] ?? session.lesson.concepts[0];
    const misconception = session.lesson.misconceptions.find((item) => item.conceptId === concept.id);
    const students = session.students
      .filter((student) => session.states[student.studentId]?.concepts[concept.id])
      .sort((a, b) => {
        const aState = session.states[a.studentId];
        const bState = session.states[b.studentId];
        const aStrength = misconception ? aState.activeMisconceptions[misconception.id]?.strength ?? 0 : 0;
        const bStrength = misconception ? bState.activeMisconceptions[misconception.id]?.strength ?? 0 : 0;
        return bStrength - aStrength || aState.concepts[concept.id].mastery - bState.concepts[concept.id].mastery;
      })
      .slice(0, 3);
    return {
      teacherAct,
      statePatches: students.map((student) => genericPatch(session, student.studentId, concept.id, misconception?.id, eventId, text)),
      handRaises: [],
      noActionReason: "Students are processing the explanation.",
    };
  }

  if (isQuestion) {
    const relevantIds = conceptIds.length ? conceptIds : session.lesson.concepts.slice(0, 1).map((item) => item.id);
    const lastSpeakerId = [...session.events].reverse().find((event) => event.type === "student_utterance")?.actorId;
    const speaker = target ?? [...session.students].sort((a, b) => {
      const score = (student: StudentModel) => {
        const state = session.states[student.studentId];
        const misconception = activeMisconception(session, student.studentId, relevantIds);
        const strength = misconception ? state.activeMisconceptions[misconception.id].strength : 0;
        const mastery = state.concepts[relevantIds[0]]?.mastery ?? 2;
        const recentlySpokePenalty = student.studentId === lastSpeakerId ? 15 : 0;
        return strength * 10 - mastery + student.privateProfile.expressiveness - recentlySpokePenalty;
      };
      return score(b) - score(a);
    })[0];
    if (!speaker) return { teacherAct, statePatches: [], handRaises: [], noActionReason: "No student was available to answer." };

    const handRaises = target
      ? []
      : session.students
        .filter((student) => student.studentId !== speaker.studentId)
        .sort((a, b) => b.privateProfile.expressiveness - a.privateProfile.expressiveness)
        .slice(0, 2)
        .map((student) => student.studentId);
    return {
      teacherAct,
      statePatches: [],
      handRaises,
      speaker: { studentId: speaker.studentId, mode: target ? "answer" : "volunteer", text: responseForStudent(session, speaker.studentId, relevantIds, text) },
    };
  }

  return { teacherAct, statePatches: [], handRaises: [], noActionReason: "No student response was needed." };
}

export function deterministicDecision(session: Session, text: string, eventId: string): OrchestrationDecision {
  return session.lesson.lessonId === "newtons-third-law-v1"
    ? newtonsDecision(session, text, eventId)
    : genericDecision(session, text, eventId);
}

export function commitDecision(session: Session, decision: OrchestrationDecision): OrchestrationDecision {
  const validPatches: StatePatch[] = [];
  for (const statePatch of decision.statePatches) {
    const current = session.states[statePatch.studentId];
    if (!current) continue;
    const result = applyStatePatch(current, statePatch, session.lesson);
    if (!result.ok) continue;
    session.states[statePatch.studentId] = result.state;
    validPatches.push(statePatch);
    appendEvent(session, {
      type: "state_transition",
      actorId: statePatch.studentId,
      text: statePatch.rationale,
      metadata: { patch: statePatch, newVersion: result.state.version },
    });
  }

  const studentIds = new Set(session.students.map((student) => student.studentId));
  const handRaises = [...new Set(decision.handRaises)].filter((id) => studentIds.has(id));
  for (const id of handRaises) appendEvent(session, { type: "student_hand_raised", actorId: id });
  const speaker = decision.speaker && studentIds.has(decision.speaker.studentId) ? decision.speaker : undefined;
  if (speaker) {
    appendEvent(session, { type: "student_called_on", actorId: speaker.studentId });
    appendEvent(session, { type: "student_utterance", actorId: speaker.studentId, text: speaker.text });
  }
  return { ...decision, statePatches: validPatches, handRaises, speaker };
}
