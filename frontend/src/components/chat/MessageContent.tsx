import { useMemo, type MouseEvent } from "react";
import { renderMarkdown, type MentionContext } from "../../utils/markdown";

export default function MessageContent({ content, mentionContext }: { content: string; mentionContext: MentionContext }) {
  const html = useMemo(() => renderMarkdown(content, mentionContext), [content, mentionContext]);

  function onClick(e: MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.classList.contains("md-spoiler")) {
      target.classList.toggle("revealed");
    }
  }

  return <div className="message-content" onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />;
}
