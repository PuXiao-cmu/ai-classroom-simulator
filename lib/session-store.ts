import { demoStudents } from "@/lib/demo-data";
import type { ClassroomEvent, LessonModel, PublicSession, Session, StudentModel } from "@/lib/types";

const TTL_MS = 30 * 60 * 1000;
const globalStore = globalThis as typeof globalThis & { classroomSessions?: Map<string, Session> };
const sessions = globalStore.classroomSessions ?? new Map<string, Session>();
globalStore.classroomSessions = sessions;

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function createSession(lesson: LessonModel, students: StudentModel[] = demoStudents): Session {
  purgeExpired();
  const sessionId = crypto.randomUUID();
  const roster = clone(students);
  const session: Session = {
    sessionId,
    lesson: clone(lesson),
    students: roster,
    states: Object.fromEntries(roster.map((student) => [student.studentId, clone(student.initialState)])),
    events: [],
    status: "ready",
    createdAt: Date.now(),
  };
  sessions.set(sessionId, session);
  return session;
}

export function getSession(id: string): Session | undefined {
  purgeExpired();
  return sessions.get(id);
}

export function deleteSession(id: string): boolean {
  return sessions.delete(id);
}

export function publicSession(session: Session): PublicSession {
  const { states: _privateStates, ...visible } = clone(session);
  return { ...visible, eventSequence: session.events.length };
}

export function appendEvent(
  session: Session,
  event: Omit<ClassroomEvent, "eventId" | "sequence" | "timestampMs"> & { timestampMs?: number },
): ClassroomEvent {
  const record: ClassroomEvent = {
    ...event,
    eventId: `evt_${session.events.length + 1}_${crypto.randomUUID().slice(0, 6)}`,
    sequence: session.events.length + 1,
    timestampMs: event.timestampMs ?? (session.startedAt ? Math.max(0, Date.now() - session.startedAt) : 0),
  };
  session.events.push(record);
  return record;
}

export function purgeExpired(now = Date.now()): void {
  for (const [id, session] of sessions) {
    if (now - session.createdAt > TTL_MS) sessions.delete(id);
  }
}
