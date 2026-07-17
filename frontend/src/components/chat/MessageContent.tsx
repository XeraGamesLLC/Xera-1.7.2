import { useEffect, useMemo, useRef, type MouseEvent } from "react";
import { renderMarkdown, type MentionContext } from "../../utils/markdown";
import { twemojify } from "../../utils/twemoji";

export default function MessageContent({ content, mentionContext }: { content: string; mentionContext: MentionContext }) {
  const html = useMemo(() => renderMarkdown(content, mentionContext), [content, mentionContext]);
  const ref = useRef<HTMLDivElement>(null);

  // Runs after React commits the new innerHTML (dangerouslySetInnerHTML
  // skips the DOM write on re-renders where the html string is unchanged,
  // so this won't fight React by re-running on every unrelated re-render —
  // only when the message content itself actually changes).
  useEffect(() => {
    if (ref.current) twemojify(ref.current);
  }, [html]);

  function onClick(e: MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.classList.contains("md-spoiler")) {
      target.classList.toggle("revealed");
    }
  }

  return <div ref={ref} className="message-content" onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />;
}
