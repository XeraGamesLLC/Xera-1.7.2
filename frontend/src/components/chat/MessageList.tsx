import { useEffect, useRef, useState, useCallback } from "react";
import { useAppStore, type Message, type Member, type PublicUser } from "../../store/app";
import { useAuthStore } from "../../store/auth";
import { useUiStore } from "../../store/ui";
import { fetchMessages } from "../../api/channels";
import { markRead } from "../../api/channels";
import { emitWithAck } from "../../api/socket";
import { hasPermission, combineRolePermissions } from "../../utils/permissions";
import MessageItem from "./MessageItem";
import "../../styles/chat.css";

const GROUP_WINDOW_MS = 5 * 60 * 1000;

interface Props {
  channelId: string;
  guildId?: string | null;
  dmMembers?: { userId: string; user: PublicUser }[];
  onEdit: (message: Message) => void;
  onReply: (message: Message) => void;
}

export default function MessageList({ channelId, guildId, dmMembers, onEdit, onReply }: Props) {
  const messages = useAppStore((s) => s.messages[channelId] ?? []);
  const setMessages = useAppStore((s) => s.setMessages);
  const prependMessages = useAppStore((s) => s.prependMessages);
  const typing = useAppStore((s) => s.typing[channelId]);
  const members = useAppStore((s) => (guildId ? s.members[guildId] ?? [] : []));
  const roles = useAppStore((s) => (guildId ? s.guildDetail[guildId]?.roles ?? [] : []));
  const currentUser = useAuthStore((s) => s.user)!;
  const openModal = useUiStore((s) => s.openModal);

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

  return (
    <>
      <div className="message-list" ref={scrollRef} onScroll={onScroll}>
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const grouped = !!prev && prev.authorId === m.authorId && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_WINDOW_MS && !m.replyTo;
          return (
            <MessageItem
              key={m.id}
              message={m}
              grouped={grouped}
              mentionContext={mentionContext}
              currentUserId={currentUser.id}
              canManageMessages={canManageMessages}
              onEdit={onEdit}
              onReply={onReply}
              onOpenProfile={(userId) => openModal("user-profile", { userId, guildId })}
            />
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
