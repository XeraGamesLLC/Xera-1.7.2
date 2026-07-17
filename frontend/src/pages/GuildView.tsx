import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppStore, getGuildChannels, type Message } from "../store/app";
import { useUiStore } from "../store/ui";
import MessageList from "../components/chat/MessageList";
import MessageInput from "../components/chat/MessageInput";
import { createInvite } from "../api/guilds";
import { MenuIcon, SpeakerIcon, LinkIcon, UsersIcon } from "../components/common/Icon";

export default function GuildView() {
  const { guildId, channelId } = useParams();
  const navigate = useNavigate();
  const guild = useAppStore((s) => (guildId ? s.guildDetail[guildId] : undefined));
  const toggleMemberList = useUiStore((s) => s.toggleMemberList);
  const setMobilePanel = useUiStore((s) => s.setMobilePanel);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  useEffect(() => {
    if (guild && !channelId) {
      const first = getGuildChannels(guild).filter((c) => c.type === "TEXT")[0];
      if (first) navigate(`/app/guilds/${guildId}/channels/${first.id}`, { replace: true });
    }
  }, [guild, channelId]);

  useEffect(() => {
    setReplyingTo(null);
    setEditingMessage(null);
  }, [channelId]);

  if (!guild) return <main className="chat-column" />;
  const channel = channelId ? getGuildChannels(guild).find((c) => c.id === channelId) : undefined;
  if (!channel) return <main className="chat-column empty-state">Pick a channel to get started.</main>;

  async function copyInvite() {
    try {
      const invite = await createInvite(guildId!, channelId!);
      await navigator.clipboard.writeText(`${window.location.origin}/invite/${invite.code}`);
      alert("Invite link copied to clipboard!");
    } catch {
      alert("Could not create invite");
    }
  }

  return (
    <main className="chat-column">
      <div className="chat-header">
        <button className="icon-btn hamburger" onClick={() => setMobilePanel("channels")}><MenuIcon /></button>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {channel.type === "VOICE" ? <SpeakerIcon size={16} /> : "#"} {channel.name}
        </span>
        {channel.topic && <span className="topic">{channel.topic}</span>}
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          <button className="icon-btn" onClick={copyInvite} title="Create invite"><LinkIcon /></button>
          <button className="icon-btn" onClick={toggleMemberList} title="Members"><UsersIcon /></button>
        </div>
      </div>
      <MessageList
        channelId={channel.id}
        guildId={guildId}
        onEdit={(m) => setEditingMessage(m)}
        onReply={(m) => setReplyingTo(m)}
      />
      <MessageInput
        channelId={channel.id}
        guildId={guildId}
        channelName={channel.name}
        replyingTo={replyingTo}
        editingMessage={editingMessage}
        onCancelReply={() => setReplyingTo(null)}
        onCancelEdit={() => setEditingMessage(null)}
      />
    </main>
  );
}
