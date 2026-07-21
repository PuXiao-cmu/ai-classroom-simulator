"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Brand, CameraIcon, HandIcon, MicIcon, ScreenIcon } from "@/components/brand";
import { StudentAvatar } from "@/components/student-avatar";
import { cacheSession, fetchSession } from "@/lib/client";
import { buildTeachingPrompts } from "@/lib/teaching-prompts";
import type { ClassroomEvent, ClassroomXRay, OrchestrationDecision, PublicSession } from "@/lib/types";

type TileState = "idle" | "hand_raised" | "called_on" | "speaking";

export default function LivePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const sequenceRef = useRef(0);
  const dispatchingRef = useRef(false);
  const [session, setSession] = useState<PublicSession | null>(null);
  const [tileStates, setTileStates] = useState<Record<string, TileState>>({});
  const [classroomState, setClassroomState] = useState<"connecting" | "listening" | "evaluating" | "speaking">("connecting");
  const [typedText, setTypedText] = useState("");
  const [partialTranscript, setPartialTranscript] = useState("");
  const [speakerText, setSpeakerText] = useState("");
  const [micState, setMicState] = useState<"off" | "connecting" | "live" | "unavailable">("off");
  const [cameraOn, setCameraOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [eventLog, setEventLog] = useState<ClassroomEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await fetchSession(sessionId);
        if (cancelled) return;
        let active = loaded;
        if (loaded.status === "ready") {
          const response = await fetch(`/api/sessions/${sessionId}/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventSequence: loaded.eventSequence }) });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          active = data.session;
        }
        sequenceRef.current = active.eventSequence;
        setEventLog(active.events);
        setSession(active); cacheSession(active); setClassroomState("listening");
      } catch (err) { setError(err instanceof Error ? err.message : "Could not start the rehearsal."); }
    })();
    return () => { cancelled = true; mediaRef.current?.getTracks().forEach((track) => track.stop()); screenStreamRef.current?.getTracks().forEach((track) => track.stop()); peerRef.current?.close(); };
  }, [sessionId]);

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (screenOn && screenVideoRef.current && screenStreamRef.current) screenVideoRef.current.srcObject = screenStreamRef.current;
  }, [screenOn]);

  const playStudent = useCallback(async (decision: OrchestrationDecision) => {
    if (!decision.speaker || !session) return;
    const speaker = decision.speaker;
    const speakingStartedAt = Date.now();
    setClassroomState("speaking"); setSpeakerText(speaker.text);
    setTileStates((current) => ({ ...current, [speaker.studentId]: "speaking" }));
    let played = false;
    try {
      const response = await fetch(`/api/sessions/${sessionId}/speech`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(speaker),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        played = true;
        await new Promise<void>((resolve) => { audio.onended = () => resolve(); audio.onerror = () => resolve(); void audio.play().catch(resolve); });
        URL.revokeObjectURL(url);
      }
    } catch { /* browser speech fallback below */ }
    if (!played && "speechSynthesis" in window) {
      await new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(speaker.text);
        const index = session.students.findIndex((student) => student.studentId === speaker.studentId);
        utterance.rate = 1.02 + index * 0.015; utterance.pitch = 1.3 + index * 0.08;
        const timeout = window.setTimeout(resolve, Math.min(5_500, 1_200 + speaker.text.length * 28));
        const finish = () => { window.clearTimeout(timeout); resolve(); };
        utterance.onend = finish; utterance.onerror = finish; window.speechSynthesis.speak(utterance);
      });
    } else if (!played) {
      await new Promise((resolve) => window.setTimeout(resolve, 1400));
    }
    const remainingCaptionMs = 3_200 - (Date.now() - speakingStartedAt);
    if (remainingCaptionMs > 0) await new Promise((resolve) => window.setTimeout(resolve, remainingCaptionMs));
    setTileStates({}); setSpeakerText(""); setClassroomState("listening");
  }, [session, sessionId]);

  const submitUtterance = useCallback(async (rawText: string) => {
    const text = rawText.trim();
    if (!text || dispatchingRef.current || classroomState === "speaking") return;
    dispatchingRef.current = true; setClassroomState("evaluating"); setPartialTranscript(""); setError("");
    try {
      const response = await fetch(`/api/sessions/${sessionId}/utterances`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, eventSequence: sequenceRef.current }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      sequenceRef.current = data.eventSequence; setEventLog((events) => [...events, ...(data.recentEvents ?? []).filter((event: ClassroomEvent) => !events.some((old) => old.eventId === event.eventId))]);
      if (!data.decision) { setClassroomState("listening"); return; }
      const decision = data.decision as OrchestrationDecision;
      if (decision.handRaises.length) {
        setTileStates(Object.fromEntries(decision.handRaises.map((id) => [id, "hand_raised"])));
        await new Promise((resolve) => window.setTimeout(resolve, 560));
      }
      if (decision.speaker) {
        setTileStates((current) => ({ ...current, [decision.speaker!.studentId]: "called_on" }));
        await new Promise((resolve) => window.setTimeout(resolve, 220));
        await playStudent(decision);
      } else {
        window.setTimeout(() => setTileStates({}), 1700); setClassroomState("listening");
      }
    } catch (err) { setError(err instanceof Error ? err.message : "The classroom missed that turn."); setClassroomState("listening"); }
    finally { dispatchingRef.current = false; }
  }, [classroomState, playStudent, sessionId]);

  async function enableCamera() {
    if (cameraOn) { mediaRef.current?.getVideoTracks().forEach((track) => track.stop()); setCameraOn(false); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      mediaRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream; setCameraOn(true);
    } catch { setError("Camera permission was not granted. You can still rehearse normally."); }
  }

  async function toggleScreenShare() {
    if (screenOn) {
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null; setScreenOn(false); return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current = stream;
      stream.getVideoTracks()[0].onended = () => { screenStreamRef.current = null; setScreenOn(false); };
      setScreenOn(true);
    } catch { /* user dismissed the picker */ }
  }

  async function enableMic() {
    if (micState === "live") { peerRef.current?.close(); mediaRef.current?.getAudioTracks().forEach((track) => track.stop()); setMicState("off"); return; }
    setMicState("connecting");
    try {
      const tokenResponse = await fetch("/api/realtime-token", { method: "POST" });
      const token = await tokenResponse.json();
      if (!tokenResponse.ok) throw new Error(token.error);
      const ephemeralKey = token.value;
      const pc = new RTCPeerConnection(); peerRef.current = pc;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRef.current = stream; pc.addTrack(stream.getAudioTracks()[0]);
      const dc = pc.createDataChannel("oai-events");
      dc.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "conversation.item.input_audio_transcription.delta") setPartialTranscript((value) => value + (message.delta ?? ""));
        if (message.type === "conversation.item.input_audio_transcription.completed") void submitUtterance(message.transcript ?? "");
      };
      const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
      const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", { method: "POST", body: offer.sdp, headers: { Authorization: `Bearer ${ephemeralKey}`, "Content-Type": "application/sdp" } });
      if (!sdpResponse.ok) throw new Error("Realtime connection failed.");
      await pc.setRemoteDescription({ type: "answer", sdp: await sdpResponse.text() }); setMicState("live");
    } catch (err) { setMicState("unavailable"); setError(err instanceof Error ? `${err.message} Use the rehearsal input below instead.` : "Microphone unavailable."); }
  }

  async function endRehearsal() {
    setClassroomState("evaluating");
    try {
      const response = await fetch(`/api/sessions/${sessionId}/end`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventSequence: sequenceRef.current }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      sessionStorage.setItem(`xray:${sessionId}`, JSON.stringify(data.report satisfies ClassroomXRay));
      router.push(`/classroom/${sessionId}/xray`);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create the X-Ray."); setClassroomState("listening"); }
  }

  if (!session) return <div className="live-loading">{error || "Opening the classroom…"}</div>;
  const statusCopy = classroomState === "listening" ? (micState === "live" ? "Listening to you" : "Ready for your teaching") : classroomState === "evaluating" ? "Students are thinking…" : "A student is speaking";
  const teachingPrompts = buildTeachingPrompts(session.lesson, session.students);

  return (
    <main className="live-page">
      <header className="live-header"><Brand/><div className="live-lesson"><span>{session.lesson.title}</span><em>{session.lesson.gradeBand}</em></div><div className="live-actions"><span className="timer"><i/> {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</span><button className="end-button" onClick={endRehearsal}>End &amp; view X-Ray</button></div></header>
      <section className="classroom-stage">
        <div className="teacher-column">
          <div className={`teacher-video ${cameraOn ? "on" : ""}`}>
            <video ref={videoRef} autoPlay muted playsInline/>
            {!cameraOn && <div className="camera-placeholder"><span>YOU</span><p>Camera is local-only</p></div>}
            <div className="teacher-label"><span>Teacher</span><em>You</em></div>
          </div>
          <div className="teacher-controls">
            <button className={cameraOn ? "active" : ""} onClick={enableCamera}><CameraIcon/><span>{cameraOn ? "Camera on" : "Camera off"}</span></button>
            <button className={micState === "live" ? "active mic" : ""} onClick={enableMic}><MicIcon/><span>{micState === "connecting" ? "Connecting…" : micState === "live" ? "Mic live" : "Enable mic"}</span></button>
            <button className={screenOn ? "active" : ""} onClick={toggleScreenShare}><ScreenIcon/><span>{screenOn ? "Sharing" : "Share screen"}</span></button>
          </div>
          {screenOn && <div className="screen-share">
            <video ref={screenVideoRef} autoPlay muted playsInline/>
            <span>Screen preview is local-only — students respond to what you say</span>
          </div>}
          <div className={`listen-card ${classroomState}`}><span className="listen-rings"><i/><i/><i/></span><div><strong>{statusCopy}</strong><p>{partialTranscript || "Teach naturally—or use the lesson prompts below."}</p></div></div>
          <div className="demo-console">
            <div className="console-title"><span>Lesson teaching path</span><em>Typed fallback</em></div>
            {teachingPrompts.map((prompt, index) => <button key={prompt.text} disabled={classroomState !== "listening"} onClick={() => void submitUtterance(prompt.text)}><b>{index + 1}</b><span>{prompt.label}</span><small>{prompt.text}</small></button>)}
            <form onSubmit={(event) => { event.preventDefault(); void submitUtterance(typedText); setTypedText(""); }}><input value={typedText} onChange={(event) => setTypedText(event.target.value)} placeholder="Type what you would say…"/><button aria-label="Send utterance">→</button></form>
          </div>
        </div>
        <div className="student-grid">
          {session.students.map((student) => {
            const state = tileStates[student.studentId] ?? "idle";
            return <article className={`student-tile ${state}`} key={student.studentId}>
              <div className="tile-status">{state === "hand_raised" ? <><HandIcon/> Hand raised</> : state === "speaking" ? <><span className="sound-bars"><i/><i/><i/></span> Speaking</> : state === "called_on" ? "Getting ready…" : ""}</div>
              <StudentAvatar name={student.name} avatarKey={student.avatarKey} size="large"/>
              <h2>{student.name}</h2><p title={student.visibleProfile.personality}>{student.visibleProfile.personality}</p>
              {state === "speaking" && speakerText && <div className="speaker-caption">“{speakerText}”</div>}
            </article>;
          })}
        </div>
      </section>
      <footer className="live-footer"><span><i className="privacy-dot"/> Audio &amp; video aren’t recorded</span><span>Student voices are AI-generated · Session text is temporary</span><span>{eventLog.filter((event) => event.type === "teacher_utterance").length} teaching moments</span></footer>
      {error && <button className="toast" onClick={() => setError("")}>{error}<span>×</span></button>}
    </main>
  );
}
