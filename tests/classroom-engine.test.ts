import { describe, expect, it } from "vitest";
import { demoLesson, demoStudents } from "@/lib/demo-data";
import { commitDecision, deterministicDecision, isMeaningfulUtterance } from "@/lib/orchestrator";
import { applyStatePatch } from "@/lib/reducer";
import { buildDeterministicReport } from "@/lib/report";
import { appendEvent, createSession } from "@/lib/session-store";
import { buildTeachingPrompts } from "@/lib/teaching-prompts";
import type { LessonModel, StudentModel } from "@/lib/types";

const scienceLesson: LessonModel = {
  lessonId: "photosynthesis-grade-5",
  title: "Where Plant Matter Comes From",
  gradeBand: "Grades 4–5",
  subject: "Life Science",
  sourceSummary: "Students investigate how plants use sunlight, water, and carbon dioxide to produce sugars and build new matter.",
  objectives: [{
    id: "obj-plant-matter",
    statement: "Explain where the matter in a growing plant comes from.",
    successEvidence: ["Identifies carbon dioxide as a source of carbon", "Distinguishes plant matter from soil nutrients", "Uses evidence from plant growth"],
  }],
  concepts: [{
    id: "c-photosynthesis",
    name: "Photosynthesis and plant matter",
    canonicalExplanation: "Plants use sunlight to combine carbon dioxide from the air with water, producing sugars that provide much of the matter used for growth.",
    prerequisiteIds: [],
  }],
  prerequisites: [],
  misconceptions: [{
    id: "m-food-from-soil",
    conceptId: "c-photosynthesis",
    belief: "plants get most of their food and mass directly from the soil.",
    diagnosticSignals: ["food from soil", "soil becomes the plant"],
    correctionSignals: ["carbon dioxide from air", "sugars", "matter is conserved"],
  }],
  diagnosticOpportunities: [{
    id: "d-plant-mass",
    conceptIds: ["c-photosynthesis"],
    prompt: "Where does most of a growing plant's mass come from?",
    expectedEvidence: "Most of the plant's dry mass comes from carbon dioxide in the air, which is used to make sugars during photosynthesis.",
  }],
};

const scienceStudents: StudentModel[] = demoStudents.map((student, index) => ({
  ...structuredClone(student),
  initialState: {
    version: 0,
    concepts: { "c-photosynthesis": { mastery: index === 0 ? 1 : 2, confidence: index === 0 ? 0.45 : 0.62 } },
    activeMisconceptions: { "m-food-from-soil": { strength: index === 0 ? 2 : index < 3 ? 1 : 0 } },
    missingPrerequisiteIds: [],
    confusion: index === 0 ? 0.58 : 0.3,
    engagement: student.initialState.engagement,
  },
}));

describe("bounded cognitive-state reducer", () => {
  it("commits one-step evidence-linked updates", () => {
    const state = structuredClone(demoStudents[0].initialState);
    const result = applyStatePatch(state, {
      studentId: "maya",
      basedOnVersion: 0,
      reasonEventId: "evt_1",
      evidenceQuote: "equal and opposite",
      rationale: "The teacher clearly distinguished the force pair.",
      operations: [
        { op: "adjust_mastery", conceptId: "c-force-pairs", delta: 1 },
        { op: "adjust_misconception", misconceptionId: "m-bigger-object", delta: -1 },
      ],
    }, demoLesson);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.version).toBe(1);
      expect(result.state.concepts["c-force-pairs"].mastery).toBe(2);
      expect(result.state.activeMisconceptions["m-bigger-object"].strength).toBe(2);
      expect(result.state.concepts["c-force-pairs"].lastEvidenceEventId).toBe("evt_1");
    }
  });

  it("rejects stale versions and unknown concept IDs", () => {
    const state = structuredClone(demoStudents[0].initialState);
    const base = { studentId: "maya", reasonEventId: "evt_1", evidenceQuote: "evidence", rationale: "reason" };
    expect(applyStatePatch(state, { ...base, basedOnVersion: 2, operations: [] }, demoLesson)).toEqual({ ok: false, error: "stale_version" });
    expect(applyStatePatch(state, { ...base, basedOnVersion: 0, operations: [{ op: "adjust_mastery", conceptId: "invented", delta: 1 }] }, demoLesson)).toEqual({ ok: false, error: "unknown_concept" });
  });

  it("clamps all state ranges", () => {
    const state = structuredClone(demoStudents[3].initialState);
    state.concepts["c-force-pairs"].mastery = 4;
    state.engagement = 0.95;
    const result = applyStatePatch(state, {
      studentId: "owen", basedOnVersion: 0, reasonEventId: "evt_2", evidenceQuote: "clear evidence", rationale: "reinforcement",
      operations: [{ op: "adjust_mastery", conceptId: "c-force-pairs", delta: 1 }, { op: "adjust_engagement", delta: 0.2 }],
    }, demoLesson);
    expect(result.ok && result.state.concepts["c-force-pairs"].mastery).toBe(4);
    expect(result.ok && result.state.engagement).toBe(1);
  });
});

describe("deterministic classroom evals", () => {
  it("gates management speech while passing diagnostic questions", () => {
    const session = createSession(demoLesson, demoStudents);
    expect(isMeaningfulUtterance("Okay.", session)).toBe(false);
    expect(isMeaningfulUtterance("When a truck and bicycle collide, which experiences the greater force?", session)).toBe(true);
  });

  it("surfaces Maya's initial misconception and changes her later answer", () => {
    const session = createSession(demoLesson, demoStudents);
    const question = deterministicDecision(session, "When a truck and bicycle collide, which force is greater?", "evt_1");
    expect(question.speaker?.studentId).toBe("maya");
    expect(question.speaker?.text.toLowerCase()).toContain("truck");
    expect(question.speaker?.text.toLowerCase()).toContain("harder");

    session.states.maya.activeMisconceptions["m-bigger-object"].strength = 1;
    const later = deterministicDecision(session, "Maya, try again: which force is greater, and why?", "evt_3");
    expect(later.speaker?.text.toLowerCase()).toContain("equal and opposite");
    expect(later.speaker?.text.toLowerCase()).toContain("less mass");
  });

  it("directly selects a quiet named student", () => {
    const session = createSession(demoLesson, demoStudents);
    const decision = deterministicDecision(session, "Lena, why don't the forces cancel?", "evt_1");
    expect(decision.teacherAct.kind).toBe("direct_question");
    expect(decision.speaker?.studentId).toBe("lena");
  });
});

describe("uploaded lesson grounding", () => {
  it("builds the live teaching path from the uploaded Lesson Model", () => {
    const prompts = buildTeachingPrompts(scienceLesson, scienceStudents);
    const copy = prompts.map((prompt) => prompt.text).join(" ").toLowerCase();
    expect(copy).toContain("photosynthesis");
    expect(copy).toContain("plant");
    expect(copy).toContain("carbon dioxide");
    expect(copy).not.toMatch(/force|truck|bicycle/);
  });

  it("answers follow-up questions without repeating a fixed student sentence", () => {
    const session = createSession(scienceLesson, scienceStudents);
    const initial = deterministicDecision(session, scienceLesson.diagnosticOpportunities[0].prompt, "evt_science_1");
    expect(initial.speaker?.studentId).toBe("maya");
    expect(initial.speaker?.text.toLowerCase()).toContain("soil");
    expect(initial.speaker?.text.toLowerCase()).not.toMatch(/force|truck|bicycle/);
    commitDecision(session, initial);

    const whyFollowUp = deterministicDecision(session, "Maya, why do you think a plant's mass comes from the soil?", "evt_science_2");
    expect(whyFollowUp.speaker?.studentId).toBe("maya");
    expect(whyFollowUp.speaker?.text).not.toBe(initial.speaker?.text);
    expect(whyFollowUp.speaker?.text.toLowerCase()).toContain("reason");

    const explanationText = buildTeachingPrompts(scienceLesson, scienceStudents)[1].text;
    const explanation = deterministicDecision(session, explanationText, "evt_science_3");
    expect(explanation.teacherAct.relevantConceptIds).toContain("c-photosynthesis");
    expect(explanation.statePatches[0].operations).toContainEqual({ op: "adjust_misconception", misconceptionId: "m-food-from-soil", delta: -1 });
    commitDecision(session, explanation);

    const followUp = deterministicDecision(session, `Maya, ${scienceLesson.diagnosticOpportunities[0].prompt}`, "evt_science_4");
    expect(followUp.speaker?.text.toLowerCase()).toContain("carbon dioxide");
    expect(followUp.speaker?.text.toLowerCase()).not.toMatch(/force|truck|bicycle/);

    const report = buildDeterministicReport(session);
    expect(JSON.stringify(report).toLowerCase()).toContain("photosynthesis");
    expect(JSON.stringify(report).toLowerCase()).not.toMatch(/force|truck|bicycle/);
  });

  it("rotates volunteers across consecutive whole-class questions", () => {
    const session = createSession(scienceLesson, scienceStudents);
    const first = deterministicDecision(session, scienceLesson.diagnosticOpportunities[0].prompt, "evt_science_1");
    commitDecision(session, first);
    const second = deterministicDecision(session, "Why is air important for a growing plant?", "evt_science_2");
    expect(second.speaker?.studentId).not.toBe(first.speaker?.studentId);
  });
});

describe("evidence-linked X-Ray", () => {
  it("uses only real event IDs and monotonic timestamps", () => {
    const session = createSession(demoLesson, demoStudents);
    session.startedAt = Date.now() - 5_000;
    session.status = "live";
    appendEvent(session, { type: "session_started", actorId: "teacher", timestampMs: 0 });
    const teacher = appendEvent(session, { type: "teacher_utterance", actorId: "teacher", text: "The forces are equal and opposite and act on different objects.", timestampMs: 1_000 });
    session.states.maya.concepts["c-force-pairs"].mastery += 1;
    appendEvent(session, { type: "state_transition", actorId: "maya", text: "Mastery increased.", timestampMs: 1_010, metadata: { reasonEventId: teacher.eventId } });
    const report = buildDeterministicReport(session);
    const realIds = new Set(report.events.map((event) => event.eventId));
    const cited = [...report.feedback.flatMap((item) => item.evidenceEventIds), ...report.students.flatMap((student) => student.journey.flatMap((item) => item.evidenceEventIds))];
    expect(cited.every((id) => realIds.has(id))).toBe(true);
    expect(report.events.map((event) => event.sequence)).toEqual([1, 2, 3]);
    expect(report.events.map((event) => event.timestampMs)).toEqual([0, 1_000, 1_010]);
  });
});
