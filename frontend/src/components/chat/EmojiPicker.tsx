import { useEffect, useState } from "react";
import { listEmojis } from "../../api/guilds";

const CURATED_EMOJI = [
  "😀","😂","😅","😊","😉","😍","😘","😜","🤔","😎","😢","😭","😡","😱","🥳","🤯",
  "👍","👎","👏","🙌","🙏","💪","👀","🔥","💯","✨","🎉","❤️","💔","💀","🤝","👋",
  "😴","🤢","😇","🙃","😏","🤐","😬","🥺","🤗","😤","🤡","👻","💩","🍕","☕","🎮",
];

interface Props {
  guildId?: string | null;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ guildId, onSelect, onClose }: Props) {
  const [customEmoji, setCustomEmoji] = useState<{ id: string; name: string; imageUrl: string }[]>([]);

  useEffect(() => {
    if (guildId) listEmojis(guildId).then(setCustomEmoji).catch(() => undefined);
  }, [guildId]);

  return (
    <div className="emoji-picker" onMouseLeave={onClose}>
      {customEmoji.map((e) => (
        <button key={e.id} title={e.name} onClick={() => onSelect(`:${e.name}:`)}>
          <img src={e.imageUrl} alt={e.name} />
        </button>
      ))}
      {CURATED_EMOJI.map((e) => (
        <button key={e} onClick={() => onSelect(e)}>
          {e}
        </button>
      ))}
    </div>
  );
}
