type Tag = "h1" | "h2" | "h3";

/**
 * Page and section heading. Headings no longer animate in on scroll: only the
 * home hero has an entrance, so every other heading is simply there.
 */
export function SplitTitle({ text, as: Tag = "h2", className, id }: { text: string; as?: Tag; className?: string; id?: string; delay?: number }) {
  return (
    <Tag id={id} className={className}>
      {text}
    </Tag>
  );
}
