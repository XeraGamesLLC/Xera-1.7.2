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
