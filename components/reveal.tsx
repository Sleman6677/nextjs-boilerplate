"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

type Tag = "div" | "section" | "article" | "li" | "figure" | "p" | "span" | "h2" | "h3" | "ul" | "header";

let shared: IntersectionObserver | null = null;

function observer() {
  if (!shared) {
    shared = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            shared?.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0 },
    );
  }
  return shared;
}

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

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = observer();
    io.observe(el);
    return () => io.unobserve(el);
  }, []);

  const Component = as as "div";
  return (
    <Component
      ref={ref as React.RefObject<HTMLDivElement>}
      data-reveal={variant ?? ""}
      className={className}
      style={{ ...style, "--d": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Component>
  );
}
