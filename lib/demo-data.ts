import type { LessonModel, StudentCognitiveState, StudentModel } from "@/lib/types";

export const demoLesson: LessonModel = {
  lessonId: "newtons-third-law-v1",
  title: "Newton’s Third Law: Forces Come in Pairs",
  gradeBand: "Grades 6–8",
  subject: "Physical Science",
  sourceSummary: "A middle-school investigation of action–reaction force pairs using collisions, balloons, and everyday motion.",
  objectives: [{
    id: "obj-force-pairs",
    statement: "Students identify that forces arise in equal-magnitude, opposite-direction pairs acting on different objects.",
    successEvidence: ["Names both objects", "Describes equal force magnitude", "Distinguishes force from acceleration"],
  }],
  concepts: [
    { id: "c-force-pairs", name: "Force pairs", canonicalExplanation: "When object A pushes or pulls object B, B simultaneously pushes or pulls A with equal magnitude in the opposite direction.", prerequisiteIds: ["p-force-vector"] },
    { id: "c-motion-effect", name: "Force versus motion", canonicalExplanation: "Equal forces can cause different accelerations because acceleration also depends on mass.", prerequisiteIds: ["p-force-vector", "p-mass-motion"] },
  ],
  prerequisites: [
    { id: "p-force-vector", statement: "A force has magnitude and direction." },
    { id: "p-mass-motion", statement: "Mass affects how much an object accelerates for a given force." },
  ],
  misconceptions: [
    { id: "m-bigger-object", conceptId: "c-force-pairs", belief: "The larger or faster object exerts the larger force in an interaction.", diagnosticSignals: ["truck has more force", "bigger object pushes harder"], correctionSignals: ["equal force", "opposite directions", "different acceleration"] },
    { id: "m-force-cancels", conceptId: "c-force-pairs", belief: "The paired forces cancel because they are equal and opposite.", diagnosticSignals: ["forces cancel"], correctionSignals: ["act on different objects"] },
  ],
  diagnosticOpportunities: [{
    id: "d-truck-bike", conceptIds: ["c-force-pairs", "c-motion-effect"],
    prompt: "When a truck and bicycle collide, which one experiences the greater force?",
    expectedEvidence: "They exert equal and opposite forces on each other; their accelerations differ because their masses differ.",
  }],
};

function state(mastery: number, confidence: number, misconception: number, confusion: number, engagement: number): StudentCognitiveState {
  return {
    version: 0,
    concepts: {
      "c-force-pairs": { mastery, confidence },
      "c-motion-effect": { mastery: Math.max(0, mastery - 1), confidence: Math.max(0.2, confidence - 0.12) },
    },
    activeMisconceptions: {
      "m-bigger-object": { strength: misconception },
      "m-force-cancels": { strength: misconception === 0 ? 0 : 1 },
    },
    missingPrerequisiteIds: mastery < 2 ? ["p-mass-motion"] : [],
    confusion,
    engagement,
  };
}

export const demoStudents: StudentModel[] = [
  {
    studentId: "maya", name: "Maya", avatarKey: "girl-1", voice: "coral",
    visibleProfile: { personality: "Bold pattern-spotter", relevantBackground: "Builds elaborate marble runs", participationStyle: "Volunteers quickly and explains her hunches" },
    privateProfile: { academicConfidence: 0.78, expressiveness: 0.9, interruptionRate: 0.3, helpSeekingRate: 0.35 },
    initialState: state(1, 0.75, 3, 0.28, 0.88),
  },
  {
    studentId: "theo", name: "Theo", avatarKey: "boy-1", voice: "fable",
    visibleProfile: { personality: "Class joker, easily distracted", relevantBackground: "Plays goalkeeper and notices impacts", participationStyle: "Blurts out jokes and drifts off unless the lesson gets hands-on" },
    privateProfile: { academicConfidence: 0.5, expressiveness: 0.7, interruptionRate: 0.38, helpSeekingRate: 0.4 },
    initialState: state(1, 0.42, 1, 0.44, 0.34),
  },
  {
    studentId: "lena", name: "Lena", avatarKey: "girl-2", voice: "shimmer",
    visibleProfile: { personality: "Quiet observer", relevantBackground: "Sketches diagrams before speaking", participationStyle: "Needs a direct invitation to share" },
    privateProfile: { academicConfidence: 0.32, expressiveness: 0.26, interruptionRate: 0.01, helpSeekingRate: 0.25 },
    initialState: state(1, 0.3, 2, 0.67, 0.61),
  },
  {
    studentId: "owen", name: "Owen", avatarKey: "boy-2", voice: "alloy",
    visibleProfile: { personality: "Confident connector", relevantBackground: "Relates science to skateboarding", participationStyle: "Builds on classmates’ ideas" },
    privateProfile: { academicConfidence: 0.82, expressiveness: 0.75, interruptionRate: 0.1, helpSeekingRate: 0.28 },
    initialState: state(3, 0.8, 0, 0.16, 0.8),
  },
  {
    studentId: "zoe", name: "Zoë", avatarKey: "girl-3", voice: "sage",
    visibleProfile: { personality: "Curious skeptic", relevantBackground: "Likes testing rules with edge cases", participationStyle: "Asks precise follow-up questions" },
    privateProfile: { academicConfidence: 0.64, expressiveness: 0.62, interruptionRate: 0.08, helpSeekingRate: 0.72 },
    initialState: state(2, 0.58, 1, 0.36, 0.84),
  },
];
