"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type Tag = "div" | "section" | "article" | "li" | "figure" | "p" | "span" | "h2" | "h3" | "ul" | "header";

// One shared observer; each element registers a callback that flips its own React state.
const callbacks = new WeakMap<Element, () => void>();
let shared: IntersectionObserver | null = null;

function observer() {
  if (!shared) {
    shared = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            callbacks.get(entry.target)?.();
            shared?.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0 },
    );
  }
  return shared;
}

/**
 * Reveals its content when scrolled into view.
 * The "is-in" class is React state (not a DOM mutation), so it survives
 * re-renders that change `className` (e.g. toggling "is-open" on a card).
 */
export function Reveal({
  as = "div",
  variant,
  delay = 0,
  className,
  style,
  children,
}: {
  as?: Tag;
  variant?: "mask" | "fade";
  delay?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = observer();
    callbacks.set(el, () => setShown(true));
    io.observe(el);
    return () => {
      io.unobserve(el);
      callbacks.delete(el);
    };
  }, []);

  const Component = as as "div";
  return (
    <Component
      ref={ref as React.RefObject<HTMLDivElement>}
      data-reveal={variant ?? ""}
      className={`${className ?? ""}${shown ? " is-in" : ""}`}
      style={{ ...style, "--d": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Component>
  );
}
