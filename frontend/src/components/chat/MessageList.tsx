import { useEffect, useRef, useState, useCallback } from "react";
import { useAppStore, type Message, type Member, type PublicUser } from "../../store/app";
import { useAuthStore } from "../../store/auth";
import { useUiStore } from "../../store/ui";
import { fetchMessages, fetchReadStates } from "../../api/channels";
import { markRead } from "../../api/channels";
import { emitWithAck } from "../../api/socket";
import { hasPermission, combineRolePermissions } from "../../utils/permissions";
import MessageItem from "./MessageItem";
import Avatar from "../common/Avatar";
import "../../styles/chat.css";

const GROUP_WINDOW_MS = 5 * 60 * 1000;

interface Props {
  channelId: string;
  guildId?: string | null;
  dmMembers?: { userId: string; user: PublicUser }[];
  /** Set only for a 1:1 DM - enables Telegram-style read receipts against this specific user. */
  readReceiptUser?: PublicUser;
  onEdit: (message: Message) => void;
  onReply: (message: Message) => void;
}

export default function MessageList({ channelId, guildId, dmMembers, readReceiptUser, onEdit, onReply }: Props) {
  const messages = useAppStore((s) => s.messages[channelId] ?? []);
  const setMessages = useAppStore((s) => s.setMessages);
  const prependMessages = useAppStore((s) => s.prependMessages);
  const typing = useAppStore((s) => s.typing[channelId]);
  const members = useAppStore((s) => (guildId ? s.members[guildId] ?? [] : []));
  const roles = useAppStore((s) => (guildId ? s.guildDetail[guildId]?.roles ?? [] : []));
  const currentUser = useAuthStore((s) => s.user)!;
  const openModal = useUiStore((s) => s.openModal);
  const setReadStates = useAppStore((s) => s.setReadStates);
  const otherLastReadId = useAppStore((s) => (readReceiptUser ? s.readStates[channelId]?.[readReceiptUser.id] : undefined));

  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHasMore(true);
    fetchMessages(channelId).then((msgs) => {
      setMessages(channelId, msgs);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView());
    });
    emitWithAck("channel:subscribe", { channelId } as any).catch(() => undefined);
    if (readReceiptUser) fetchReadStates(channelId).then((states) => setReadStates(channelId, states));
  }, [channelId]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) return;
    const el = scrollRef.current;
    const nearBottom = el ? el.scrollHeight - el.scrollTop - el.clientHeight < 200 : true;
    if (nearBottom) requestAnimationFrame(() => bottomRef.current?.scrollIntoView());
    if (last.authorId === currentUser.id || nearBottom) {
      markRead(channelId, last.id).catch(() => undefined);
    }
  }, [messages.length]);

  const onScroll = useCallback(async () => {
    const el = scrollRef.current;
    if (!el || loadingMore || !hasMore) return;
    if (el.scrollTop < 80) {
      setLoadingMore(true);
      const oldest = messages[0];
      const older = await fetchMessages(channelId, oldest?.id);
      if (older.length === 0) setHasMore(false);
      else {
        const prevHeight = el.scrollHeight;
        prependMessages(channelId, older);
        requestAnimationFrame(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevHeight;
        });
      }
      setLoadingMore(false);
    }
  }, [channelId, messages, loadingMore, hasMore]);

  const memberMap = Object.fromEntries(members.map((m) => [m.userId, m]));
  const roleMap = Object.fromEntries(roles.map((r) => [r.id, r]));

  // Guild channels resolve names from the guild member list; DMs have no
  // such list (members[guildId] is always empty when guildId is null), so
  // they resolve from the DM channel's own participants instead - without
  // this, typing names and @mentions in a DM always fell back to "Someone".
  const nameMap: Record<string, string> = guildId
    ? Object.fromEntries(members.map((m) => [m.userId, m.user.username]))
    : Object.fromEntries((dmMembers ?? []).map((m) => [m.userId, m.user.username]));

  const memberPermissions = guildId
    ? combineRolePermissions((memberMap[currentUser.id]?.roles ?? []).map((r) => r.permissions))
    : 0n;
  const canManageMessages = guildId ? hasPermission(memberPermissions, "MANAGE_MESSAGES") : true;

  const mentionContext = {
    resolveUser: (id: string) => nameMap[id],
    resolveRole: (id: string) => roleMap[id]?.name,
    currentUserId: currentUser.id,
  };

  const typingNames = [...(typing ?? [])].map((id) => nameMap[id] ?? "Someone");

  // Telegram-style "seen" watermark: the small avatar sits under the newest
  // message (from either side) that's <= the other participant's read
  // pointer, not per-message - it moves as they read further, same as
  // Telegram/WhatsApp. Message ids are monotonic snowflakes, so BigInt
  // comparison gives correct ordering even across a digit-count boundary
  // (string comparison would not).
  let seenAnchorId: string | null = null;
  if (readReceiptUser && otherLastReadId) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (BigInt(messages[i].id) <= BigInt(otherLastReadId)) {
        seenAnchorId = messages[i].id;
        break;
      }
    }
  }

  return (
    <>
      <div className="message-list" ref={scrollRef} onScroll={onScroll}>
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const grouped = !!prev && prev.authorId === m.authorId && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_WINDOW_MS && !m.replyTo;
          const readReceipt: "sent" | "read" | undefined =
            readReceiptUser && m.authorId === currentUser.id
              ? otherLastReadId && BigInt(m.id) <= BigInt(otherLastReadId)
                ? "read"
                : "sent"
              : undefined;
          return (
            <div key={m.id}>
              <MessageItem
                message={m}
                grouped={grouped}
                mentionContext={mentionContext}
                currentUserId={currentUser.id}
                canManageMessages={canManageMessages}
                onEdit={onEdit}
                onReply={onReply}
                onOpenProfile={(userId) => openModal("user-profile", { userId, guildId })}
                readReceipt={readReceipt}
              />
              {readReceiptUser && m.id === seenAnchorId && (
                <div className="read-receipt-seen" title={`Seen by ${readReceiptUser.username}`}>
                  <Avatar url={readReceiptUser.avatarUrl} name={readReceiptUser.username} size={16} />
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="typing-indicator">
        {typingNames.length > 0 && `${typingNames.join(", ")} ${typingNames.length === 1 ? "is" : "are"} typing…`}
      </div>
    </>
  );
}

export type { Member };
