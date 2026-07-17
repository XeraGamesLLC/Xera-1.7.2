import type { Message, PublicUser } from "../../store/app";
import Avatar from "../common/Avatar";
import MessageContent from "./MessageContent";
import { formatMessageTimestamp, formatShortTime } from "../../utils/time";
import type { MentionContext } from "../../utils/markdown";
import { emitWithAck } from "../../api/socket";
import { ReplyIcon, EditIcon, TrashIcon } from "../common/Icon";
import { twemojiUrl } from "../../utils/twemoji";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

interface Props {
  message: Message;
  grouped: boolean;
  mentionContext: MentionContext;
  currentUserId: string;
  canManageMessages: boolean;
  onEdit: (message: Message) => void;
  onReply: (message: Message) => void;
  onOpenProfile: (userId: string) => void;
}

export default function MessageItem({ message, grouped, mentionContext, currentUserId, canManageMessages, onEdit, onReply, onOpenProfile }: Props) {
  const canEdit = message.authorId === currentUserId;
  const canDelete = canEdit || canManageMessages;

  const reactionGroups = groupReactions(message.reactions);

  async function toggleReaction(emoji: string) {
    const mine = message.reactions.some((r) => r.emoji === emoji && r.userId === currentUserId);
    try {
      if (mine) await emitWithAck("reaction:remove", { messageId: message.id, emoji });
      else await emitWithAck("reaction:add", { messageId: message.id, emoji });
    } catch {
      // best-effort UI action — a failed reaction toggle just doesn't apply
    }
  }

  async function deleteMessage() {
    if (!confirm("Delete this message?")) return;
    try {
      await emitWithAck("message:delete", { messageId: message.id });
    } catch {
      // ignore — server already logs/handles the failure
    }
  }

  return (
    <div className={`message-row ${grouped ? "grouped" : ""}`}>
      {message.replyTo && (
        <div className="reply-preview">
          ↪ <span className="reply-author">{message.replyTo.author.username}</span>
          <span>{message.replyTo.content.slice(0, 80)}</span>
        </div>
      )}
      <div className="gutter">
        {!grouped && (
          <Avatar url={message.author.avatarUrl} name={message.author.username} size={40} />
        )}
      </div>
      <div className="message-body">
        {!grouped && (
          <div className="message-header">
            <span className="message-author" onClick={() => onOpenProfile(message.authorId)}>
              {message.author.username}
            </span>
            <span className="message-timestamp">{formatMessageTimestamp(message.createdAt)}</span>
          </div>
        )}
        <MessageContent content={message.content} mentionContext={mentionContext} />
        {message.editedAt && <span className="message-edited"> (edited)</span>}

        {message.attachments.length > 0 && (
          <div className="message-attachments">
            {message.attachments.map((a) =>
              a.contentType.startsWith("image/") ? (
                <img key={a.id} src={a.url} alt={a.filename} loading="lazy" />
              ) : (
                <a key={a.id} className="attachment-file" href={a.url} target="_blank" rel="noopener noreferrer">
                  📎 {a.filename}
                </a>
              )
            )}
          </div>
        )}

        {reactionGroups.length > 0 && (
          <div className="reaction-bar">
            {reactionGroups.map(([emoji, users]) => (
              <button
                key={emoji}
                className={`reaction-pill ${users.includes(currentUserId) ? "mine" : ""}`}
                onClick={() => toggleReaction(emoji)}
              >
                <ReactionGlyph emoji={emoji} /> {users.length}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="timestamp-gutter">{grouped ? formatShortTime(message.createdAt) : ""}</div>

      <div className="message-toolbar">
        {QUICK_REACTIONS.slice(0, 3).map((e) => (
          <button key={e} onClick={() => toggleReaction(e)} title="React">
            <img src={twemojiUrl(e)} alt={e} draggable={false} className="emoji" />
          </button>
        ))}
        <button onClick={() => onReply(message)} title="Reply">
          <ReplyIcon size={16} />
        </button>
        {canEdit && (
          <button onClick={() => onEdit(message)} title="Edit">
            <EditIcon size={16} />
          </button>
        )}
        {canDelete && (
          <button onClick={deleteMessage} title="Delete">
            <TrashIcon size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

// Reactions store either a raw unicode emoji or "custom:<emojiId>" for a
// server's custom emoji (see backend/prisma/schema.prisma). Custom-emoji
// image rendering here is a pre-existing gap (no guild emoji lookup wired
// into this component yet) — falls back to the raw string rather than
// regressing further while wiring in Twemoji for the standard-emoji case.
function ReactionGlyph({ emoji }: { emoji: string }) {
  if (emoji.startsWith("custom:")) return <span>{emoji}</span>;
  return <img src={twemojiUrl(emoji)} alt={emoji} draggable={false} className="emoji" />;
}

function groupReactions(reactions: Message["reactions"]): [string, string[]][] {
  const map = new Map<string, string[]>();
  for (const r of reactions) {
    if (!map.has(r.emoji)) map.set(r.emoji, []);
    map.get(r.emoji)!.push(r.userId);
  }
  return [...map.entries()];
}

export function resolveUserDisplay(users: Record<string, PublicUser>, id: string): string | undefined {
  return users[id]?.username;
}
