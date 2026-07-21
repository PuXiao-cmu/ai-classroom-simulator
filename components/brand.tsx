import Link from "next/link";

export function Brand() {
  return (
    <Link className="brand" href="/prepare" aria-label="Classroom Lens home">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32"><path d="M6 7.5h13.5A6.5 6.5 0 0 1 26 14v11H12.5A6.5 6.5 0 0 1 6 18.5v-11Z"/><path d="m12 11 8 5-8 5v-10Z"/></svg>
      </span>
      <span>Classroom <strong>Lens</strong></span>
    </Link>
  );
}

export function AppHeader({ quiet = false }: { quiet?: boolean }) {
  return (
    <header className={quiet ? "app-header quiet" : "app-header"}>
      <Brand />
      <div className="header-meta">
        <span className="privacy-chip"><LockIcon /> Ephemeral session</span>
        <span className="avatar-small">FW</span>
      </div>
    </header>
  );
}

export function LockIcon() {
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>;
}

export function SparkIcon() {
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6L12 2Z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z"/></svg>;
}

export function ArrowIcon() {
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
}

export function MicIcon() {
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/></svg>;
}

export function CameraIcon() {
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="3"/><path d="m16 10 5-3v10l-5-3"/></svg>;
}

export function ScreenIcon() {
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M12 17v4M8 21h8"/></svg>;
}

export function HandIcon() {
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 12V6a2 2 0 0 1 4 0v5-7a2 2 0 0 1 4 0v7-5a2 2 0 0 1 4 0v8c0 5-3 8-8 8-3 0-5-1-7-4l-2-3a2 2 0 0 1 3-3l2 2v-2Z"/></svg>;
}
