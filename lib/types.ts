import { z } from "zod";

const bounded = z.number().min(0).max(1);
const conceptStateSchema = z.object({
  mastery: z.number().int().min(0).max(4),
  confidence: bounded,
  lastEvidenceEventId: z.string().nullable().optional(),
});

export const lessonModelSchema = z.object({
  lessonId: z.string(),
  title: z.string(),
  gradeBand: z.string(),
  subject: z.string(),
  sourceSummary: z.string(),
  objectives: z.array(z.object({
    id: z.string(), statement: z.string(), successEvidence: z.array(z.string()),
  })).min(1),
  concepts: z.array(z.object({
    id: z.string(), name: z.string(), canonicalExplanation: z.string(), prerequisiteIds: z.array(z.string()),
  })).min(1).max(8),
  prerequisites: z.array(z.object({ id: z.string(), statement: z.string() })),
  misconceptions: z.array(z.object({
    id: z.string(), conceptId: z.string(), belief: z.string(),
    diagnosticSignals: z.array(z.string()), correctionSignals: z.array(z.string()),
  })).max(12),
  diagnosticOpportunities: z.array(z.object({
    id: z.string(), conceptIds: z.array(z.string()), prompt: z.string(), expectedEvidence: z.string(),
  })),
});

export const studentCognitiveStateSchema = z.object({
  version: z.number().int().nonnegative(),
  concepts: z.record(z.string(), conceptStateSchema),
  activeMisconceptions: z.record(z.string(), z.object({
    strength: z.number().int().min(0).max(3),
    lastEvidenceEventId: z.string().nullable().optional(),
  })),
  missingPrerequisiteIds: z.array(z.string()),
  confusion: bounded,
  engagement: bounded,
});

export const studentModelSchema = z.object({
  studentId: z.string(), name: z.string(), avatarKey: z.string(), voice: z.string(),
  visibleProfile: z.object({
    personality: z.string(), relevantBackground: z.string(), participationStyle: z.string(),
  }),
  privateProfile: z.object({
    academicConfidence: bounded, expressiveness: bounded, interruptionRate: bounded, helpSeekingRate: bounded,
  }),
  initialState: studentCognitiveStateSchema,
});

const operationSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("adjust_mastery"), conceptId: z.string(), delta: z.union([z.literal(-1), z.literal(0), z.literal(1)]) }),
  z.object({ op: z.literal("adjust_misconception"), misconceptionId: z.string(), delta: z.union([z.literal(-1), z.literal(0), z.literal(1)]) }),
  z.object({ op: z.literal("set_confusion"), value: bounded }),
  z.object({ op: z.literal("adjust_engagement"), delta: z.union([z.literal(-0.2), z.literal(-0.1), z.literal(0), z.literal(0.1), z.literal(0.2)]) }),
]);

export const statePatchSchema = z.object({
  studentId: z.string(), basedOnVersion: z.number().int().nonnegative(), reasonEventId: z.string(),
  operations: z.array(operationSchema), rationale: z.string().min(1), evidenceQuote: z.string().min(1),
});

export const orchestrationDecisionSchema = z.object({
  teacherAct: z.object({
    kind: z.enum(["explanation", "class_question", "direct_question", "feedback", "transition", "other"]),
    targetStudentId: z.string().nullable().optional(), relevantConceptIds: z.array(z.string()),
  }),
  statePatches: z.array(statePatchSchema),
  handRaises: z.array(z.string()),
  speaker: z.object({
    studentId: z.string(), mode: z.enum(["answer", "question", "volunteer", "interruption"]), text: z.string().max(320),
  }).nullable().optional(),
  noActionReason: z.string().nullable().optional(),
});

export type LessonModel = z.infer<typeof lessonModelSchema>;
export type StudentCognitiveState = z.infer<typeof studentCognitiveStateSchema>;
export type StudentModel = z.infer<typeof studentModelSchema>;
export type StatePatch = z.infer<typeof statePatchSchema>;
export type OrchestrationDecision = z.infer<typeof orchestrationDecisionSchema>;

export type ClassroomEvent = {
  eventId: string;
  sequence: number;
  timestampMs: number;
  type: "teacher_utterance" | "student_hand_raised" | "student_called_on" | "student_utterance" | "state_transition" | "session_started" | "session_ended";
  actorId: "teacher" | string;
  text?: string;
  metadata?: Record<string, unknown>;
};

export type Session = {
  sessionId: string;
  lesson: LessonModel;
  students: StudentModel[];
  states: Record<string, StudentCognitiveState>;
  events: ClassroomEvent[];
  status: "ready" | "live" | "ended";
  startedAt?: number;
  createdAt: number;
};

export type ClassroomXRay = {
  overview: {
    objectiveCoverage: Array<{ objectiveId: string; studentCount: number }>;
    widelyUnderstoodConceptIds: string[];
    widespreadConfusionConceptIds: string[];
    unresolvedMisconceptionCount: number;
    summary: string;
  };
  students: Array<{
    studentId: string;
    finalStatus: "strong" | "partial" | "confused";
    finalUnderstanding: string;
    remainingMisconceptionIds: string[];
    majorChange: string;
    journey: Array<{ label: string; timestampMs?: number; evidenceEventIds: string[]; description: string }>;
  }>;
  feedback: Array<{
    category: "worked" | "improve";
    title: string;
    whatHappened: string;
    whyItMattered: string;
    suggestion?: string;
    timestampMs: number;
    evidenceEventIds: string[];
  }>;
  events: ClassroomEvent[];
};

export type PublicSession = Omit<Session, "states"> & { eventSequence: number };
