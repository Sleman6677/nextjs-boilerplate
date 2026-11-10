import type { CSSProperties } from "react";

/**
 * The kohl stroke: a tapered line, the trace a mirwad leaves along the lash
 * line. It draws once (one pass, start to end of the reading direction) when
 * its trigger fires: on load with `data-on="load"`, or when an ancestor with
 * `.kohl-trigger` is hovered or focused. A static line under reduced motion.
 */
export function KohlStroke({ className = "", on = "hover", delay = 0 }: { className?: string; on?: "load" | "hover"; delay?: number }) {
  return (
    <svg
      viewBox="0 0 240 14"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`kohl-stroke ${className}`}
      data-on={on}
      style={{ "--kohl-delay": `${delay}ms` } as CSSProperties}
    >
      <path d="M1 9.2C40 4.6 92 2.4 140 3.1c38 .5 70 2.2 99 4.6-30 .9-61 1.9-99 2.8C92 11.6 42 11 1 9.2Z" fill="currentColor" />
    </svg>
  );
}

/** Leader-line call-outs pinned to a lash drawing: each label names a real attribute. */
export function LashCallouts({ items }: { items: { label: string; value: string; x: number; y: number; side: "start" | "end" }[] }) {
  return (
    <ul className="kohl-callouts" role="list">
      {items.map((c) => (
        <li key={c.label} className="kohl-callout" data-side={c.side} style={{ "--x": `${c.x}%`, "--y": `${c.y}%` } as CSSProperties}>
          <span className="kohl-callout-dot" aria-hidden="true" />
          <span className="kohl-callout-line" aria-hidden="true" />
          <span className="kohl-callout-text">
            <span className="kohl-callout-label">{c.label}</span>
            <span className="kohl-callout-value">{c.value}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
