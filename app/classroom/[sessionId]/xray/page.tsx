"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AppHeader, ArrowIcon, SparkIcon } from "@/components/brand";
import { StageRail } from "@/components/stage-rail";
import { StudentAvatar } from "@/components/student-avatar";
import { formatTime, readCachedSession } from "@/lib/client";
import type { ClassroomEvent, ClassroomXRay, PublicSession } from "@/lib/types";

export default function XRayPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [report, setReport] = useState<ClassroomXRay | null>(null);
  const [session, setSession] = useState<PublicSession | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);
  const [studentFilter, setStudentFilter] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(`xray:${sessionId}`);
    if (raw) setReport(JSON.parse(raw));
    setSession(readCachedSession(sessionId));
  }, [sessionId]);

  const evidenceEvents = useMemo(() => {
    if (!report) return [];
    const ids = new Set(selectedEvidence);
    const positions = report.events.map((event, index) => ids.has(event.eventId) ? index : -1).filter((index) => index >= 0);
    const expanded = new Set<number>();
    positions.forEach((index) => { expanded.add(index); if (index > 0) expanded.add(index - 1); if (index < report.events.length - 1) expanded.add(index + 1); });
    return [...expanded].sort((a, b) => a - b).map((index) => report.events[index]);
  }, [report, selectedEvidence]);

  if (!report || !session) return <main className="center-state"><AppHeader/><div className="loading-card"><h1>Classroom X-Ray unavailable</h1><p>Reports live only in this browser session and disappear on refresh after the rehearsal expires.</p><a className="button button-primary" href="/prepare">Start a new rehearsal</a></div></main>;

  const functional = report.overview.objectiveCoverage[0]?.studentCount ?? 0;
  const changes = report.events.filter((event) => event.type === "state_transition").length;
  const remaining = report.overview.unresolvedMisconceptionCount;
  const filteredStudents = studentFilter ? report.students.filter((student) => student.studentId === studentFilter) : report.students;

  return (
    <main className="xray-page">
      <AppHeader />
      <StageRail active={3} />
      <section className="xray-hero page-shell">
        <div><div className="eyebrow"><SparkIcon/> Rehearsal complete</div><h1>Classroom X-Ray</h1><p>What shifted, what stuck, and where your teaching made the difference.</p></div>
        <div className="xray-actions"><button onClick={() => window.print()}>Export summary</button><a className="button button-primary" href="/prepare">New rehearsal <ArrowIcon/></a></div>
      </section>

      <section className="overview-grid page-shell">
        <article className="overview-main">
          <span className="overline">Class at a glance</span><h2>{report.overview.summary}</h2>
          <div className="coverage-bar"><span style={{ width: `${functional / session.students.length * 100}%` }}/></div>
          <p>{functional} of {session.students.length} students reached partial or strong understanding of today’s objective.</p>
        </article>
        <article className="metric-card green"><strong>{changes}</strong><span>learning shifts</span><p>Bounded, evidence-linked state transitions</p></article>
        <article className="metric-card amber"><strong>{remaining}</strong><span>misconceptions remain</span><p>Worth revisiting in the next lesson</p></article>
      </section>

      <section className="insights-section page-shell">
        <div className="section-heading"><div><span className="overline">Teaching feedback</span><h2>Moments that mattered</h2></div><p>Every claim below links to something that actually happened in the rehearsal.</p></div>
        <div className="feedback-grid">
          {report.feedback.map((item, index) => (
            <article className={`feedback-card ${item.category}`} key={`${item.title}-${index}`}>
              <div className="feedback-top"><span>{item.category === "worked" ? "Worked" : "Try next"}</span><button onClick={() => setSelectedEvidence(item.evidenceEventIds)}>{formatTime(item.timestampMs)} ↗</button></div>
              <h3>{item.title}</h3><p>{item.whatHappened}</p><div className="why"><strong>Why it mattered</strong>{item.whyItMattered}</div>
              {item.suggestion && <div className="suggestion"><SparkIcon/><span>{item.suggestion}</span></div>}
            </article>
          ))}
        </div>
      </section>

      <section className="journeys-section page-shell">
        <div className="section-heading"><div><span className="overline">Learner journeys</span><h2>Five minds, five paths</h2></div><button className={studentFilter ? "filter-active" : ""} onClick={() => setStudentFilter(null)}>Show all students</button></div>
        <div className="journey-filters">
          {session.students.map((student) => <button className={studentFilter === student.studentId ? "active" : ""} onClick={() => setStudentFilter(student.studentId)} key={student.studentId}><StudentAvatar name={student.name} avatarKey={student.avatarKey} size="small"/>{student.name}</button>)}
        </div>
        <div className="journey-list">
          {filteredStudents.map((result) => {
            const student = session.students.find((item) => item.studentId === result.studentId)!;
            return <article className="journey-card" key={result.studentId}>
              <div className="journey-student"><StudentAvatar name={student.name} avatarKey={student.avatarKey} size="medium"/><div><h3>{student.name}</h3><span className={`status-badge ${result.finalStatus}`}>{result.finalStatus}</span></div><p>{result.finalUnderstanding}</p></div>
              <div className="journey-track">
                {result.journey.map((moment, index) => <button key={`${moment.label}-${index}`} onClick={() => setSelectedEvidence(moment.evidenceEventIds)}><span className="track-dot"/><em>{moment.timestampMs === undefined ? "—" : formatTime(moment.timestampMs)}</em><strong>{moment.label}</strong><p>{moment.description}</p></button>)}
              </div>
              <div className="major-change"><span>Change</span><p>{result.majorChange}</p></div>
            </article>;
          })}
        </div>
      </section>

      <section className="privacy-note page-shell"><span>◉</span><div><strong>Your rehearsal stays yours.</strong><p>Audio and video were never recorded. Session text was processed temporarily to generate this report and is scheduled for deletion.</p></div></section>

      {selectedEvidence.length > 0 && <div className="drawer-scrim" onClick={() => setSelectedEvidence([])}><aside className="evidence-drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-head"><div><span className="overline">Evidence trail</span><h2>What happened here</h2></div><button onClick={() => setSelectedEvidence([])}>×</button></div><p className="drawer-intro">Transcript evidence around the selected moment. No audio or video was stored.</p><div className="evidence-list">{evidenceEvents.map((event) => <EvidenceEvent key={event.eventId} event={event} students={session.students}/>)}</div></aside></div>}
    </main>
  );
}

function EvidenceEvent({ event, students }: { event: ClassroomEvent; students: PublicSession["students"] }) {
  const student = students.find((item) => item.studentId === event.actorId);
  const actor = event.actorId === "teacher" ? "You" : student?.name ?? "Classroom";
  return <article className={`evidence-event ${event.type === "state_transition" ? "transition" : ""}`}><div><strong>{actor}</strong><span>{formatTime(event.timestampMs)}</span></div><p>{event.text ?? event.type.replaceAll("_", " ")}</p>{event.type === "state_transition" && <em>Simulated state updated</em>}</article>;
}
