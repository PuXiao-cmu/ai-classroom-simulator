"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppHeader, ArrowIcon, CameraIcon, LockIcon, MicIcon, SparkIcon } from "@/components/brand";
import { StageRail } from "@/components/stage-rail";
import { StudentAvatar } from "@/components/student-avatar";
import { fetchSession } from "@/lib/client";
import type { PublicSession } from "@/lib/types";

export default function MeetPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<PublicSession | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSession(sessionId).then(setSession).catch((err) => setError(err.message));
  }, [sessionId]);

  if (!session) return <LoadingState error={error} />;

  return (
    <main className="meet-page">
      <AppHeader />
      <StageRail active={1} />
      <section className="meet-intro page-shell">
        <div><div className="eyebrow"><SparkIcon /> Class generated</div><h1>Meet your classroom</h1><p>Five different minds. Five different ways into the lesson.</p></div>
        <div className="lesson-pill"><span>Today’s rehearsal</span><strong>{session.lesson.title}</strong><em>{session.lesson.gradeBand} · {session.lesson.subject}</em></div>
      </section>
      <section className="student-roster page-shell">
        {session.students.map((student, index) => (
          <article className="student-card" key={student.studentId} style={{ "--delay": `${index * 70}ms` } as React.CSSProperties}>
            <div className="student-card-top"><StudentAvatar name={student.name} avatarKey={student.avatarKey} size="large"/><span className="student-number">0{index + 1}</span></div>
            <h2>{student.name}</h2>
            <p className="personality">{student.visibleProfile.personality}</p>
            <dl>
              <div><dt>Brings to class</dt><dd>{student.visibleProfile.relevantBackground}</dd></div>
              <div><dt>Participation</dt><dd>{student.visibleProfile.participationStyle}</dd></div>
            </dl>
          </article>
        ))}
      </section>
      <section className="meet-bottom page-shell">
        <div className="lesson-map">
          <div className="map-icon">◎</div>
          <div><span className="overline">Lesson map</span><h3>{session.lesson.objectives[0]?.statement}</h3><p>{session.lesson.concepts.length} core concepts · {session.lesson.misconceptions.length} likely misconceptions · {session.lesson.diagnosticOpportunities.length} diagnostic moment</p></div>
          <div className="concept-tags">{session.lesson.concepts.map((concept) => <span key={concept.id}>{concept.name}</span>)}</div>
        </div>
        <div className="ready-panel">
          <div className="ready-copy"><span className="pulse-dot"/><div><strong>Your classroom is ready</strong><p>Camera stays on this device. Microphone connects directly to OpenAI when enabled.</p></div></div>
          <div className="device-row"><span><CameraIcon /> Camera optional</span><span><MicIcon /> Mic optional</span><span><LockIcon /> Nothing recorded</span></div>
          <button className="button button-primary button-large" onClick={() => router.push(`/classroom/${sessionId}/live`)}>Start rehearsal <ArrowIcon /></button>
        </div>
      </section>
      <p className="meet-disclaimer">Student profiles and responses are fictional, diverse rehearsal hypotheses—not predictions about real students.</p>
    </main>
  );
}

function LoadingState({ error }: { error: string }) {
  return <main className="center-state"><AppHeader /><div className="loading-card">{error ? <><h1>Rehearsal unavailable</h1><p>{error}</p><a className="button button-primary" href="/prepare">Start over</a></> : <><i className="spinner dark"/><h1>Building your classroom…</h1><p>Giving each learner a distinct starting point.</p></>}</div></main>;
}
