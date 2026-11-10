"use client";

import { useEffect, useState } from "react";
import SplitText from "@/components/SplitText";

type Tag = "h1" | "h2" | "h3";

/**
 * Heading whose words rise out of a mask (React Bits SplitText).
 * Words, not letters, so Arabic letters stay joined. The heading element keeps
 * its own classes/layout; the animated text sits inside it.
 */
export function SplitTitle({
  text,
  as: Tag = "h2",
  className,
  id,
  delay = 0,
}: {
  text: string;
  as?: Tag;
  className?: string;
  id?: string;
  delay?: number;
}) {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <Tag id={id} className={className} aria-label={text}>
      <SplitText
        tag="span"
        text={text}
        textAlign="inherit"
        className="align-bottom pt-[0.08em] pb-[0.22em] -mt-[0.08em] -mb-[0.22em]"
        splitType="words"
        from={{ opacity: 0, y: 50, filter: "blur(12px)" }} to={{ opacity: 1, y: 0, filter: "blur(0px)" }} ease="power3.out"
        trigger="view"
        duration={reduce ? 0.01 : 0.9}
        delay={reduce ? 0 : delay}
      />
    </Tag>
  );
}
