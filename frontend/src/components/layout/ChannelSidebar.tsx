import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppStore } from "../../store/app";
import { useUiStore } from "../../store/ui";
import { getGuild, listMembers } from "../../api/guilds";
import { openDm } from "../../api/dms";
import Avatar from "../common/Avatar";
import UserPanel from "./UserPanel";

export default function ChannelSidebar() {
  const { guildId, channelId } = useParams();
  const navigate = useNavigate();
  const setMobilePanel = useUiStore((s) => s.setMobilePanel);
  const openModal = useUiStore((s) => s.openModal);

  const guildDetail = useAppStore((s) => (guildId ? s.guildDetail[guildId] : undefined));
  const setGuildDetail = useAppStore((s) => s.setGuildDetail);
  const setMembers = useAppStore((s) => s.setMembers);
  const dmChannels = useAppStore((s) => s.dmChannels);
  const friends = useAppStore((s) => s.friends);
  const presence = useAppStore((s) => s.presence);
  const mentionCounts = useAppStore((s) => s.mentionCounts);
  const unreadChannelIds = useAppStore((s) => s.unreadChannelIds);
  const clearUnread = useAppStore((s) => s.clearUnread);
  const clearMentionCount = useAppStore((s) => s.clearMentionCount);

  useEffect(() => {
    if (!guildId) return;
    getGuild(guildId).then((g) => setGuildDetail(guildId, g));
    listMembers(guildId).then((m) => setMembers(guildId, m));
  }, [guildId]);

  function selectChannel(id: string) {
    if (!guildId) return;
    navigate(`/app/guilds/${guildId}/channels/${id}`);
    clearUnread(id);
    clearMentionCount(id);
    setMobilePanel("chat");
  }

  async function selectDm(userId: string) {
    const channel = await openDm(userId);
    useAppStore.getState().upsertDmChannel(channel);
    navigate(`/app/dms/${channel.id}`);
    clearUnread(channel.id);
    setMobilePanel("chat");
  }

  if (guildId) {
    if (!guildDetail) return <aside className="channel-sidebar" />;
    const uncategorized = guildDetail.channels ?? [];
    const categories = guildDetail.categories ?? [];

    return (
      <aside className="channel-sidebar">
        <div className="channel-sidebar-header" onClick={() => openModal("server-settings", { guildId })}>
          <span>{guildDetail.name}</span>
          <span className="icon-btn" title="Server settings">⚙</span>
        </div>
        <div className="channel-list">
          {uncategorized.map((ch) => (
            <ChannelRow
              key={ch.id}
              name={ch.name}
              type={ch.type}
              active={channelId === ch.id}
              unread={unreadChannelIds.has(ch.id)}
              mentions={mentionCounts[ch.id]}
              onClick={() => selectChannel(ch.id)}
            />
          ))}
          {categories.map((cat) => (
            <div key={cat.id}>
              <div className="channel-category">{cat.name}</div>
              {cat.channels.map((ch) => (
                <ChannelRow
                  key={ch.id}
                  name={ch.name}
                  type={ch.type}
                  active={channelId === ch.id}
                  unread={unreadChannelIds.has(ch.id)}
                  mentions={mentionCounts[ch.id]}
                  onClick={() => selectChannel(ch.id)}
                />
              ))}
            </div>
          ))}
        </div>
        <UserPanel />
      </aside>
    );
  }

  // DM / friends mode
  return (
    <aside className="channel-sidebar">
      <div className="channel-sidebar-header" onClick={() => navigate("/app/friends")}>
        <span>Find or start a conversation</span>
      </div>
      <div className="channel-list">
        <div
          className="channel-row"
          onClick={() => {
            navigate("/app/friends");
            setMobilePanel("chat");
          }}
        >
          <span>👥</span>
          <span className="channel-name">Friends</span>
        </div>
        <div className="channel-category">Direct Messages</div>
        {dmChannels.map((c) => {
          const other = c.members?.find((m) => m.user)?.user;
          const label = c.type === "GROUP_DM" ? c.name || groupLabel(c) : other ? `${other.username}` : "Unknown";
          return (
            <div
              key={c.id}
              className={`channel-row ${channelId === c.id ? "active" : ""} ${unreadChannelIds.has(c.id) ? "unread" : ""}`}
              onClick={() => {
                navigate(`/app/dms/${c.id}`);
                clearUnread(c.id);
                setMobilePanel("chat");
              }}
            >
              <Avatar url={other?.avatarUrl} name={label} size={24} status={c.type === "DM" ? presence[other?.id ?? ""] ?? other?.status : undefined} />
              <span className="channel-name">{label}</span>
              {mentionCounts[c.id] > 0 && <span className="mention-badge">{mentionCounts[c.id]}</span>}
            </div>
          );
        })}
        <div className="channel-category">Friends</div>
        {friends.map((f) => (
          <div key={f.id} className="channel-row" onClick={() => selectDm(f.id)}>
            <Avatar url={f.avatarUrl} name={f.username} size={24} status={presence[f.id] ?? f.status} />
            <span className="channel-name">{f.username}</span>
          </div>
        ))}
      </div>
      <UserPanel />
    </aside>
  );
}

function groupLabel(c: { members?: { user: { username: string } }[] }): string {
  return (c.members ?? []).map((m) => m.user.username).join(", ") || "Group DM";
}

function ChannelRow({
  name,
  type,
  active,
  unread,
  mentions,
  onClick,
}: {
  name: string;
  type: string;
  active: boolean;
  unread: boolean;
  mentions?: number;
  onClick: () => void;
}) {
  return (
    <div className={`channel-row ${active ? "active" : ""} ${unread ? "unread" : ""}`} onClick={onClick}>
      <span>{type === "VOICE" ? "🔊" : "#"}</span>
      <span className="channel-name">{name}</span>
      {!!mentions && <span className="mention-badge">{mentions}</span>}
    </div>
  );
}
