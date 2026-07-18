import type { SVGProps } from "react";

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

// Small hand-drawn line-icon set for interface chrome (buttons, headers, nav)
// — deliberately not Unicode emoji, so the UI has its own consistent visual
// language instead of relying on whatever the OS/browser renders emoji as.
// Emoji themselves stay everywhere they're actual chat content: the emoji
// picker's palette and quick-reaction buttons are untouched.
function Base({ size = 18, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 5l14 14M19 5L5 19" />
    </Base>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 5v14M5 12h14" />
    </Base>
  );
}

export function SmileIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
      <path d="M8.5 14c1 1.3 2.2 2 3.5 2s2.5-.7 3.5-2" />
    </Base>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 12l16-7-6 16-2.5-6.5L4 12z" strokeLinejoin="round" />
    </Base>
  );
}

export function ReplyIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M9 7L4 12l5 5" />
      <path d="M4 12h9a7 7 0 0 1 7 7v1" />
    </Base>
  );
}

export function EditIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 20l1-4.5L15.5 5 19 8.5 8.5 19 4 20z" />
      <path d="M13.5 6.5L17.5 10.5" />
    </Base>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 7h14" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M7 7l1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12" />
      <path d="M10 11v5M14 11v5" />
    </Base>
  );
}

export function GearIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.5 5.5l-2 2M7.5 16.5l-2 2M18.5 18.5l-2-2M7.5 7.5l-2-2" />
    </Base>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 6.5h16M4 12h16M4 17.5h16" />
    </Base>
  );
}

export function LinkIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M9.5 14.5l5-5" />
      <path d="M13 6.5l1.6-1.6a3.5 3.5 0 0 1 5 5L18 11.5" />
      <path d="M11 17.5l-1.6 1.6a3.5 3.5 0 0 1-5-5L6 12.5" />
    </Base>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19c.7-3 2.8-4.7 5.5-4.7s4.8 1.7 5.5 4.7" />
      <path d="M15.5 6a3 3 0 0 1 0 5.8" />
      <path d="M16 14.3c2.2.4 3.6 1.9 4.2 4.4" />
    </Base>
  );
}

export function SpeakerIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 9.5h3l4.5-4v13l-4.5-4H4z" strokeLinejoin="round" />
      <path d="M16 9a4 4 0 0 1 0 6" />
      <path d="M18.5 6.5a8 8 0 0 1 0 11" />
    </Base>
  );
}

// Announcements-channel marker — a megaphone, distinct from the voice-channel
// SpeakerIcon so the two purposes never look interchangeable at a glance.
export function AnnouncementIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M7 10.5h2.3L17 5.5v13l-7.7-5H7z" strokeLinejoin="round" />
      <path d="M4.5 10.5h2.5v6H5.8a1.3 1.3 0 0 1-1.3-1.3z" strokeLinejoin="round" />
      <path d="M17 8.5a3.2 3.2 0 0 1 0 6.5" />
      <path d="M8 16.5l.9 3" />
    </Base>
  );
}

// Rules-channel marker — an open book, kept visually distinct from
// AnnouncementIcon even though both purposes share the same "read only"
// permission behavior.
export function RulebookIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 6c-1.6-1.1-3.8-1.6-6-1.6v13c2.2 0 4.4.5 6 1.6" strokeLinejoin="round" />
      <path d="M12 6c1.6-1.1 3.8-1.6 6-1.6v13c-2.2 0-4.4.5-6 1.6" strokeLinejoin="round" />
      <path d="M12 6v13" />
    </Base>
  );
}

// Developer badge — a shield (platform-issued credential) with the same
// bracket motif as the XRA logo, so it reads as "belongs to this platform"
// rather than a generic achievement icon.
export function DeveloperBadgeIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3l7 3v5.5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
      <path d="M10 9.5L7.5 12l2.5 2.5" />
      <path d="M14 9.5l2.5 2.5-2.5 2.5" />
    </Base>
  );
}

// Member-since marker — a simple calendar, used next to a formatted join date.
export function CalendarIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="4" y="5.5" width="16" height="14" rx="2" />
      <path d="M4 9.5h16" />
      <path d="M8 3.5v4M16 3.5v4" />
    </Base>
  );
}

// Telegram-style "sent" / "read" receipt marks.
export function CheckIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 12.5l4 4 10-10" />
    </Base>
  );
}
export function DoubleCheckIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M2 12.5l4 4 10-10" />
      <path d="M9 13.5l1.5 1.5 9-9" />
    </Base>
  );
}

export function CompassIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" strokeLinejoin="round" />
    </Base>
  );
}

export function FileIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M7 3.5h7l4 4V19a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" strokeLinejoin="round" />
      <path d="M14 3.5V8h4" strokeLinejoin="round" />
    </Base>
  );
}

export function ImageIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M4 17l5.5-5.5a1.5 1.5 0 0 1 2.1 0L15 15l1.5-1.5a1.5 1.5 0 0 1 2.1 0L20.5 15.5" />
    </Base>
  );
}

// Discord-accurate status badges: shape-differentiated, not just color, so
// they're distinguishable for colorblind users (a plain colored dot fails
// red/green colorblindness specifically, which is the most common form —
// online/DND being red-vs-green is exactly the pair that collides).
// `cutout` punches through to the surrounding background color so the badge
// reads clearly against an avatar image sitting behind it, same purpose the
// old border-only dot served.
export function StatusIcon({ status, size = 10, cutout = "var(--bg-dark)" }: { status: string; size?: number; cutout?: string }) {
  const fill = { fill: cutout };
  switch (status) {
    case "ONLINE":
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" aria-label="Online">
          <circle cx="10" cy="10" r="10" style={fill} />
          <circle cx="10" cy="10" r="7" fill="var(--online)" />
        </svg>
      );
    case "IDLE":
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" aria-label="Idle">
          <circle cx="10" cy="10" r="10" style={fill} />
          <circle cx="10" cy="10" r="7" fill="var(--idle)" />
          <circle cx="6.5" cy="6.5" r="6" style={fill} />
        </svg>
      );
    case "DND":
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" aria-label="Do Not Disturb">
          <circle cx="10" cy="10" r="10" style={fill} />
          <circle cx="10" cy="10" r="7" fill="var(--dnd)" />
          <rect x="5.5" y="8.5" width="9" height="3" rx="1.5" style={fill} />
        </svg>
      );
    case "OFFLINE":
    case "INVISIBLE":
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" aria-label="Offline">
          <circle cx="10" cy="10" r="10" style={fill} />
          <circle cx="10" cy="10" r="7" fill="var(--offline)" />
          <circle cx="10" cy="10" r="3.5" style={fill} />
        </svg>
      );
  }
}
