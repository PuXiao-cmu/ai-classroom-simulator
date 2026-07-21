"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader, ArrowIcon, LockIcon, SparkIcon } from "@/components/brand";
import { StageRail } from "@/components/stage-rail";
import { cacheSession } from "@/lib/client";

function uploadLog(event: string, details: Record<string, unknown> = {}) {
  console.info(`[lesson-upload] ${event}`, { at: new Date().toISOString(), ...details });
}

export default function PreparePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState<"demo" | "upload" | null>(null);
  const [error, setError] = useState("");

  function openFilePicker() {
    const input = fileRef.current;
    uploadLog("chooser_requested", { inputReady: Boolean(input), loading });
    if (!input) return;
    window.addEventListener("focus", () => window.setTimeout(() => {
      const selected = input.files?.[0];
      uploadLog("chooser_closed", selected
        ? { selected: true, name: selected.name, size: selected.size, type: selected.type }
        : { selected: false });
    }, 0), { once: true });
    input.click();
  }

  async function launchDemo() {
    setLoading("demo"); setError("");
    try {
      const response = await fetch("/api/demo/newtons-third-law", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      cacheSession(data.session);
      router.push(`/classroom/${data.session.sessionId}/meet`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the demo.");
      setLoading(null);
    }
  }

  async function analyzeLesson() {
    if (!file && notes.trim().length < 100) { setError("Choose a lesson file or paste at least 100 characters of notes."); return; }
    setLoading("upload"); setError("");
    const debugId = crypto.randomUUID().slice(0, 8);
    const startedAt = performance.now();
    uploadLog("analysis_started", { debugId, fileName: file?.name, fileSize: file?.size, notesCharacters: notes.length });
    try {
      const form = new FormData();
      if (file) form.set("file", file);
      if (notes) form.set("text", notes);
      const analyzedResponse = await fetch("/api/lessons/analyze", { method: "POST", body: form, headers: { "X-Upload-Debug-Id": debugId } });
      uploadLog("lesson_analysis_response", { debugId, status: analyzedResponse.status, elapsedMs: Math.round(performance.now() - startedAt) });
      const analyzed = await analyzedResponse.json();
      if (!analyzedResponse.ok) throw new Error(analyzed.error);
      const classroomStartedAt = performance.now();
      const classroomResponse = await fetch("/api/classrooms/generate", {
        method: "POST", headers: { "Content-Type": "application/json", "X-Upload-Debug-Id": debugId }, body: JSON.stringify({ lesson: analyzed.lesson }),
      });
      uploadLog("classroom_generation_response", { debugId, status: classroomResponse.status, elapsedMs: Math.round(performance.now() - classroomStartedAt) });
      const classroom = await classroomResponse.json();
      if (!classroomResponse.ok) throw new Error(classroom.error);
      cacheSession(classroom.session);
      uploadLog("navigation_started", { debugId, sessionId: classroom.session.sessionId, totalElapsedMs: Math.round(performance.now() - startedAt) });
      router.push(`/classroom/${classroom.session.sessionId}/meet`);
    } catch (err) {
      uploadLog("analysis_failed", { debugId, elapsedMs: Math.round(performance.now() - startedAt), message: err instanceof Error ? err.message : "Unknown error" });
      setError(err instanceof Error ? err.message : "Lesson analysis failed.");
      setLoading(null);
    }
  }

  return (
    <main className="prepare-page">
      <AppHeader />
      <StageRail active={0} />
      <section className="prepare-hero page-shell">
        <div className="hero-copy">
          <div className="eyebrow"><SparkIcon /> Teacher rehearsal studio</div>
          <h1>Practice the lesson.<br/><span>See the learning.</span></h1>
          <p>Teach a room of simulated students, watch their understanding evolve, then uncover the moments that moved the class.</p>
          <div className="trust-row">
            <span><LockIcon /> No recordings</span>
            <span>•</span>
            <span>Built for K–12 STEM</span>
          </div>
        </div>
        <button className="demo-feature" onClick={launchDemo} disabled={Boolean(loading)}>
          <span className="demo-orbit one"/><span className="demo-orbit two"/>
          <div className="demo-kicker">Recommended demo</div>
          <div className="demo-illustration" aria-hidden="true">
            <div className="force-card truck">TRUCK <b>→</b></div>
            <div className="force-burst">=</div>
            <div className="force-card bike"><b>←</b> BIKE</div>
          </div>
          <h2>Newton’s Third Law</h2>
          <p>Grades 6–8 · Physical Science · 5 students</p>
          <span className="button button-dark">{loading === "demo" ? <i className="spinner"/> : <>Enter the demo classroom <ArrowIcon /></>}</span>
          <small>Ready in under 10 seconds</small>
        </button>
      </section>

      <section className="lesson-builder page-shell">
        <div className="section-heading">
          <div><span className="overline">Or bring your own lesson</span><h2>What are you teaching?</h2></div>
          <p>We’ll find the concepts, likely misconceptions, and moments worth checking for understanding.</p>
        </div>
        <div className="builder-grid">
          <button className={`drop-zone ${file ? "has-file" : ""}`} onClick={openFilePicker} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const dropped = event.dataTransfer.files[0] ?? null; uploadLog("file_dropped", dropped ? { name: dropped.name, size: dropped.size, type: dropped.type } : { selected: false }); setFile(dropped); }}>
            <input ref={fileRef} hidden type="file" accept=".pdf,.pptx,.docx,.txt" onClick={(event) => { event.stopPropagation(); uploadLog("native_chooser_opening"); }} onChange={(event) => { const selected = event.target.files?.[0] ?? null; uploadLog("file_change", selected ? { name: selected.name, size: selected.size, type: selected.type } : { selected: false }); setFile(selected); }} />
            <span className="upload-icon">↑</span>
            <strong>{file ? file.name : "Drop your lesson here"}</strong>
            <span>{file ? `${(file.size / 1024).toFixed(0)} KB · ready to analyze` : "or click to choose a file"}</span>
            <em>PDF, PPTX, DOCX, or TXT · up to 15 MB</em>
          </button>
          <div className="notes-panel">
            <label htmlFor="lesson-notes">Or paste lesson notes</label>
            <textarea id="lesson-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Learning objectives, key concepts, activities, questions…" />
            <div className="notes-footer"><span>{notes.length} characters</span><button className="button button-primary" disabled={Boolean(loading)} onClick={analyzeLesson}>{loading === "upload" ? <><i className="spinner"/> Analyzing</> : <>Analyze lesson <ArrowIcon /></>}</button></div>
          </div>
        </div>
        {error && <div className="error-banner" role="alert">{error}</div>}
      </section>
      <footer className="prepare-footer"><span>Simulated reactions are rehearsal hypotheses—not predictions about real students.</span><span>Audio and video are never recorded.</span></footer>
    </main>
  );
}
