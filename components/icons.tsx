import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Points toward reading direction "forward" in RTL (i.e. to the left). */
export function ArrowForward({ className, ...props }: P) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...props} className={`arrow-fwd ${className ?? ""}`}>
      <path d="M19 12H5" />
      <path d="M11 6l-6 6 6 6" />
    </svg>
  );
}

export function Sparkle(props: P) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M12 1.5c.4 4.6 1.6 7.6 3.6 9 1.6 1.1 3.9 1.6 6.9 1.5-3 0-5.3.5-6.9 1.5-2 1.4-3.2 4.4-3.6 9-.4-4.6-1.6-7.6-3.6-9C6.8 12.5 4.5 12 1.5 12c3 .1 5.3-.4 6.9-1.5 2-1.4 3.2-4.4 3.6-9z"
      />
    </svg>
  );
}

export function Plus(props: P) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function Check(props: P) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base} strokeWidth={1.8} {...props}>
      <path d="M5 12.5l4.2 4.2L19 7" />
    </svg>
  );
}

export function Clock(props: P) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function Pin(props: P) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...props}>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1113 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  );
}

export function Phone(props: P) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...props}>
      <path d="M6.6 3.5h2.6l1.5 4-2 1.3a11 11 0 006.5 6.5l1.3-2 4 1.5v2.6a2 2 0 01-2.2 2A16.5 16.5 0 014.6 5.7a2 2 0 012-2.2z" />
    </svg>
  );
}

export function Menu(props: P) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" {...base} {...props}>
      <path d="M4 8h16M8 16h12" />
    </svg>
  );
}

export function Close(props: P) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" {...base} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function Instagram(props: P) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...base} {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TikTok(props: P) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...base} {...props}>
      <path d="M14 3.5v11.2a3.8 3.8 0 11-3.8-3.8" />
      <path d="M14 3.5c.4 2.6 2.2 4.4 5 4.7" />
    </svg>
  );
}

export function WhatsApp(props: P) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M12 2.2a9.7 9.7 0 00-8.4 14.6L2.3 21.7l5-1.3A9.7 9.7 0 1012 2.2zm0 17.7a8 8 0 01-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1112 19.9zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.5 6.5 0 01-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 00-.7.3 2.8 2.8 0 00-.9 2.1 4.9 4.9 0 001 2.6 11.2 11.2 0 004.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 001.7-1.2 2.1 2.1 0 00.2-1.2c-.1-.1-.3-.2-.5-.3z"
      />
    </svg>
  );
}

export function Bag(props: P) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...props}>
      <path d="M5.5 8h13l-1 12.5h-11z" />
      <path d="M9 10.5V7a3 3 0 016 0v3.5" />
    </svg>
  );
}

export function Minus(props: P) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...props}>
      <path d="M5 12h14" />
    </svg>
  );
}

export function Copy(props: P) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base} {...props}>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
      <path d="M15.5 8.5V6.5a2 2 0 00-2-2h-7a2 2 0 00-2 2v7a2 2 0 002 2h2" />
    </svg>
  );
}

export function CardIcon(props: P) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...props}>
      <rect x="2.75" y="5.5" width="18.5" height="13" rx="2.5" />
      <path d="M2.75 10h18.5M6.5 15h3" />
    </svg>
  );
}

export function Mobile(props: P) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...props}>
      <rect x="6.5" y="2.75" width="11" height="18.5" rx="2.5" />
      <path d="M10.5 18h3" />
    </svg>
  );
}

export function User(props: P) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...base} {...props}>
      <circle cx="12" cy="8.5" r="3.75" />
      <path d="M4.75 20c.9-3.6 3.8-5.5 7.25-5.5s6.35 1.9 7.25 5.5" />
    </svg>
  );
}

export function Heart({ filled, ...props }: P & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...base} {...props} fill={filled ? "currentColor" : "none"}>
      <path d="M12 20s-7.25-4.35-7.25-10A4.25 4.25 0 0 1 12 7.1 4.25 4.25 0 0 1 19.25 10c0 5.65-7.25 10-7.25 10z" />
    </svg>
  );
}

export function Star({ filled = true, ...props }: P & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base} {...props} fill={filled ? "currentColor" : "none"}>
      <path d="M12 3.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.65l5.9-.85z" />
    </svg>
  );
}

export function Truck(props: P) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...props}>
      <path d="M2.75 6.25h11v9.5h-11zM13.75 9.75h3.75l3 3v3h-6.75" />
      <circle cx="6.5" cy="17.25" r="1.75" />
      <circle cx="17" cy="17.25" r="1.75" />
    </svg>
  );
}

export function Gift(props: P) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...props}>
      <path d="M3.75 8.75h16.5v3.5H3.75zM5.25 12.25v8h13.5v-8M12 8.75v11.5" />
      <path d="M12 8.75S10.9 4 8.4 4.3c-2.2.3-1.6 3.4 1 4.45M12 8.75s1.1-4.75 3.6-4.45c2.2.3 1.6 3.4-1 4.45" />
    </svg>
  );
}

export function Shield(props: P) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...props}>
      <path d="M12 3l7.25 2.75v5.5c0 4.6-3 8.15-7.25 9.75-4.25-1.6-7.25-5.15-7.25-9.75v-5.5z" />
      <path d="M8.75 12.25l2.25 2.25 4.25-4.5" />
    </svg>
  );
}

export function Coin(props: P) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...props}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 7.5v9M9.5 9.75c0-1 1.1-1.75 2.5-1.75s2.5.75 2.5 1.75-1.1 1.6-2.5 1.75-2.5.75-2.5 1.75 1.1 1.75 2.5 1.75 2.5-.75 2.5-1.75" />
    </svg>
  );
}
