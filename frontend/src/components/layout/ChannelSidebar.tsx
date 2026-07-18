import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppStore, type Channel } from "../../store/app";
import { useAuthStore } from "../../store/auth";
import { useUiStore } from "../../store/ui";
import { useHasGuildPermission } from "../../hooks/useGuildPermissions";
import { getGuild, listMembers } from "../../api/guilds";
import { openDm } from "../../api/dms";
import Avatar from "../common/Avatar";
import UserPanel from "./UserPanel";
import { GearIcon, UsersIcon, SpeakerIcon, PlusIcon, EditIcon, AnnouncementIcon, RulebookIcon } from "../common/Icon";

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
  const dmUnreadCounts = useAppStore((s) => s.dmUnreadCounts);
  const unreadChannelIds = useAppStore((s) => s.unreadChannelIds);
  const clearUnread = useAppStore((s) => s.clearUnread);
  const clearMentionCount = useAppStore((s) => s.clearMentionCount);
  const currentUserId = useAuthStore((s) => s.user?.id);

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

  const canManageChannels = useHasGuildPermission(guildId, "MANAGE_CHANNELS");

  function editChannel(ch: Channel) {
    openModal("channel-editor", { guildId, channel: ch });
  }

  if (guildId) {
    if (!guildDetail) return <aside className="channel-sidebar" />;
    const uncategorized = guildDetail.channels ?? [];
    const categories = guildDetail.categories ?? [];

    return (
      <aside className="channel-sidebar">
        <div className="channel-sidebar-header" onClick={() => openModal("server-settings", { guildId })}>
          <span>{guildDetail.name}</span>
          <span className="icon-btn" title="Server settings"><GearIcon /></span>
        </div>
        <div className="channel-list">
          {canManageChannels && (
            <div className="channel-sidebar-actions">
              <button
                type="button"
                className="btn btn-secondary add-channel-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  openModal("channel-editor", { guildId });
                }}
              >
                <PlusIcon size={14} /> Add Channel
              </button>
              <button
                type="button"
                className="btn btn-secondary add-channel-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  openModal("create-category", { guildId });
                }}
              >
                <PlusIcon size={14} /> Add Category
              </button>
            </div>
          )}
          {uncategorized.map((ch) => (
            <ChannelRow
              key={ch.id}
              channel={ch}
              active={channelId === ch.id}
              unread={unreadChannelIds.has(ch.id)}
              mentions={mentionCounts[ch.id]}
              canEdit={canManageChannels}
              onClick={() => selectChannel(ch.id)}
              onEdit={() => editChannel(ch)}
            />
          ))}
          {categories.map((cat) => (
            <div key={cat.id}>
              <div className="channel-category">{cat.name}</div>
              {cat.channels.map((ch) => (
                <ChannelRow
                  key={ch.id}
                  channel={ch}
                  active={channelId === ch.id}
                  unread={unreadChannelIds.has(ch.id)}
                  mentions={mentionCounts[ch.id]}
                  canEdit={canManageChannels}
                  onClick={() => selectChannel(ch.id)}
                  onEdit={() => editChannel(ch)}
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
          <span><UsersIcon size={16} /></span>
          <span className="channel-name">Friends</span>
        </div>
        <div className="channel-category">Direct Messages</div>
        {dmChannels.map((c) => {
          // Must exclude the current user, not just grab the first member
          // with a populated .user - otherwise a DM can end up displaying
          // your own name/avatar instead of the other participant's.
          const other = c.members?.find((m) => m.user && m.userId !== currentUserId)?.user;
          const label = c.type === "GROUP_DM" ? c.name || groupLabel(c, currentUserId) : other ? `${other.username}` : "Unknown";
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
              {dmUnreadCounts[c.id] > 0 && <span className="mention-badge">{dmUnreadCounts[c.id]}</span>}
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

function groupLabel(c: { members?: { userId: string; user: { username: string } }[] }, currentUserId?: string): string {
  return (
    (c.members ?? [])
      .filter((m) => m.userId !== currentUserId)
      .map((m) => m.user.username)
      .join(", ") || "Group DM"
  );
}

function channelIcon(channel: Channel) {
  if (channel.type === "VOICE") return <SpeakerIcon size={16} />;
  if (channel.purpose === "ANNOUNCEMENT") return <AnnouncementIcon size={16} />;
  if (channel.purpose === "RULES") return <RulebookIcon size={16} />;
  return "#";
}

function ChannelRow({
  channel,
  active,
  unread,
  mentions,
  canEdit,
  onClick,
  onEdit,
}: {
  channel: Channel;
  active: boolean;
  unread: boolean;
  mentions?: number;
  canEdit: boolean;
  onClick: () => void;
  onEdit: () => void;
}) {
  return (
    <div className={`channel-row ${active ? "active" : ""} ${unread ? "unread" : ""}`} onClick={onClick}>
      {unread && !active && <span className="channel-unread-dot" />}
      <span>{channelIcon(channel)}</span>
      <span className="channel-name">{channel.name}</span>
      <span className="channel-row-trailing">
        {!!mentions && <span className="mention-badge">{mentions}</span>}
        {canEdit && (
          <span
            className="icon-btn channel-edit-btn"
            title="Edit channel"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <EditIcon size={13} />
          </span>
        )}
      </span>
    </div>
  );
}
