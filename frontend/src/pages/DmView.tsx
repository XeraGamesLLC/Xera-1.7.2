import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAppStore, type Message } from "../store/app";
import { useAuthStore } from "../store/auth";
import { useUiStore } from "../store/ui";
import MessageList from "../components/chat/MessageList";
import MessageInput from "../components/chat/MessageInput";
import Avatar from "../components/common/Avatar";
import { listDmChannels } from "../api/dms";
import { MenuIcon } from "../components/common/Icon";

export default function DmView() {
  const { channelId } = useParams();
  const dmChannels = useAppStore((s) => s.dmChannels);
  const setDmChannels = useAppStore((s) => s.setDmChannels);
  const presence = useAppStore((s) => s.presence);
  const currentUser = useAuthStore((s) => s.user)!;
  const setMobilePanel = useUiStore((s) => s.setMobilePanel);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  const channel = dmChannels.find((c) => c.id === channelId);

  useEffect(() => {
    if (!channel) listDmChannels().then(setDmChannels);
  }, [channelId]);

  useEffect(() => {
    setReplyingTo(null);
    setEditingMessage(null);
  }, [channelId]);

  if (!channelId) return <main className="chat-column empty-state">Select a conversation.</main>;
  if (!channel) return <main className="chat-column" />;

  const others = (channel.members ?? []).filter((m) => m.userId !== currentUser.id).map((m) => m.user);
  const title = channel.type === "GROUP_DM" ? channel.name || others.map((o) => o.username).join(", ") : others[0]?.username ?? "Unknown";

  return (
    <main className="chat-column">
      <div className="chat-header">
        <button className="icon-btn hamburger" onClick={() => setMobilePanel("channels")}><MenuIcon /></button>
        {others[0] && <Avatar url={others[0].avatarUrl} name={title} size={24} status={presence[others[0].id] ?? others[0].status} />}
        <span>{title}</span>
      </div>
      <MessageList channelId={channel.id} guildId={null} onEdit={(m) => setEditingMessage(m)} onReply={(m) => setReplyingTo(m)} />
      <MessageInput
        channelId={channel.id}
        channelName={title}
        replyingTo={replyingTo}
        editingMessage={editingMessage}
        onCancelReply={() => setReplyingTo(null)}
        onCancelEdit={() => setEditingMessage(null)}
      />
    </main>
  );
}
