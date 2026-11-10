import type { CSSProperties, ReactNode } from "react";

type Tag = "div" | "section" | "article" | "li" | "figure" | "p" | "span" | "h2" | "h3" | "ul" | "header";

/**
 * Former scroll-reveal wrapper. Content no longer fades in as it scrolls into
 * view (cards and sections are simply there); the wrapper keeps its API so
 * pages stay unchanged.
 */
export function Reveal({
  as = "div",
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
  const Component = as as "div";
  return (
    <Component className={className} style={style}>
      {children}
    </Component>
  );
}
