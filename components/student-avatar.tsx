const PHOTO_KEY = /^(girl|boy)-\d+$/;

export function StudentAvatar({ name, avatarKey, size = "medium" }: { name: string; avatarKey: string; size?: "small" | "medium" | "large" }) {
  if (PHOTO_KEY.test(avatarKey)) {
    return <div className={`student-avatar photo ${size}`} aria-label={`${name} avatar`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/avatars/${avatarKey}.png`} alt="" />
    </div>;
  }
  const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2);
  return <div className={`student-avatar ${avatarKey} ${size}`} aria-label={`${name} avatar`}><span>{initials}</span></div>;
}
