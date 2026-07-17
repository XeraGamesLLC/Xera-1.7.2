import { useEffect, useMemo, useRef, type MouseEvent } from "react";
import { renderMarkdown, type MentionContext } from "../../utils/markdown";
import { twemojify } from "../../utils/twemoji";

const JUMBO_MAX_EMOJI = 27; // matches old Discord's jumbo-emoji threshold

export default function MessageContent({ content, mentionContext }: { content: string; mentionContext: MentionContext }) {
  const html = useMemo(() => renderMarkdown(content, mentionContext), [content, mentionContext]);
  const ref = useRef<HTMLDivElement>(null);

  // Runs after React commits the new innerHTML (dangerouslySetInnerHTML
  // skips the DOM write on re-renders where the html string is unchanged,
  // so this won't fight React by re-running on every unrelated re-render —
  // only when the message content itself actually changes).
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    twemojify(node);

    // Jumbo sizing: a message that's *only* emoji (no leftover text once
    // every emoji has been swapped for an <img>, up to Discord's 27-emoji
    // cap) gets rendered noticeably larger, same as old Discord.
    const emojiCount = node.querySelectorAll("img.emoji").length;
    const isEmojiOnly = emojiCount > 0 && emojiCount <= JUMBO_MAX_EMOJI && node.textContent?.trim() === "";
    node.classList.toggle("jumbo", isEmojiOnly);
  }, [html]);

  function onClick(e: MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.classList.contains("md-spoiler")) {
      target.classList.toggle("revealed");
    }
  }

  return <div ref={ref} className="message-content" onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />;
}
