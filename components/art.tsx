import { useId, type CSSProperties } from "react";
import { buildLashes, VIEWBOX, type LashMap, type LashStyle } from "@/lib/lash";

type LashEyeProps = {
  style: LashStyle;
  map?: LashMap;
  seed?: number;
  /** Draw the lashes on with a stroke animation */
  draw?: boolean;
  /** Delay before the drawing starts, in ms */
  baseDelay?: number;
  /** Accessible description; omit for purely decorative use */
  label?: string;
  className?: string;
  showCrease?: boolean;
  lidWidth?: number;
};

export function LashEye({
  style,
  map = "natural",
  seed = 7,
  draw = false,
  baseDelay = 300,
  label,
  className,
  showCrease = true,
  lidWidth = 2.4,
}: LashEyeProps) {
  const art = buildLashes(style, map, seed);
  const decorative = !label;

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      className={`${draw ? "lash-draw" : ""} ${className ?? ""}`}
      style={{ "--base": `${baseDelay}ms` } as CSSProperties}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={label}
    >
      {showCrease && <path d={art.crease} strokeWidth={1} opacity={0.32} pathLength={1} className="lid" />}
      <path d={art.lid} strokeWidth={lidWidth} pathLength={1} className="lid" />
      {art.lashes.map((l, i) => (
        <path
          key={i}
          d={l.d}
          strokeWidth={Number(l.w.toFixed(2))}
          pathLength={1}
          style={{ "--i": i % 90 } as CSSProperties}
        />
      ))}
    </svg>
  );
}

/** Brand mark: a closed lid with seven lashes. */
export function Monogram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="22.5" strokeWidth="1" opacity="0.55" />
      <path d="M10 20Q24 34 38 20" strokeWidth="1.8" />
      <path d="M13.5 23.6l-2.2 3.2M17.4 26.4l-1.4 3.9M21.4 27.8l-.5 4.2M25.6 27.9l.5 4.3M29.8 26.6l1.6 4M33.7 24.2l2.6 3.3M36.6 21.6l3.2 2.2" strokeWidth="1.3" />
    </svg>
  );
}

export function Wordmark({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const color = tone === "light" ? "text-white" : "text-inkwell";
  return (
    <span className={`inline-flex items-center gap-3 ${color} ${className ?? ""}`} dir="ltr">
      <Monogram className="h-8 w-8 text-gold" />
      <span className="flex flex-col leading-none">
        <span className="text-sm font-semibold tracking-[0.35em] uppercase">Serag</span>
        <span className="mt-1.5 text-[0.55rem] tracking-[0.5em] text-gold uppercase">Lashes</span>
      </span>
    </span>
  );
}

/** A thin lash-line divider used between editorial blocks. */
export function LashDivider({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 28" fill="none" stroke="currentColor" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M0 6h110" strokeWidth="1" opacity="0.5" />
      <path d="M210 6h110" strokeWidth="1" opacity="0.5" />
      <path d="M118 6Q160 26 202 6" strokeWidth="1.4" />
      <path d="M128 10.5l-2 4M138 14.5l-1.2 4.4M149 17l-.5 4.6M160 17.6v4.8M171 17l.5 4.6M182 14.5l1.2 4.4M192 10.5l2 4" strokeWidth="1.1" />
    </svg>
  );
}

/** Decorative arch frame outline. */
export function ArchOutline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 300" fill="none" stroke="currentColor" className={className} aria-hidden="true" preserveAspectRatio="none">
      <path d="M1 299V100a99 99 0 01198 0v199" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Circular rotating text badge around the monogram. */
export function RotatingBadge({ className, text = "SERAG LASHES • LUXURY LASH STUDIO • " }: { className?: string; text?: string }) {
  const pathId = `badge-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <div className={className ?? "relative"} aria-hidden="true">
      <svg viewBox="0 0 120 120" direction="ltr" className="spin-slow absolute inset-0 h-full w-full text-gold-soft [direction:ltr]">
        <defs>
          <path id={pathId} d="M60 60m-46 0a46 46 0 1 1 92 0a46 46 0 1 1 -92 0" />
        </defs>
        <text fill="currentColor" fontSize="9.4" letterSpacing="2.3" style={{ fontFamily: "var(--font-onest)" }}>
          <textPath href={`#${pathId}`}>{text}</textPath>
        </text>
      </svg>
      <div className="absolute inset-[30%] grid place-items-center rounded-full bg-gold text-ink">
        <Monogram className="h-[70%] w-[70%]" />
      </div>
    </div>
  );
}
