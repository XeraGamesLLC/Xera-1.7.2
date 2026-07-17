import { useParams } from "react-router-dom";
import { useAppStore } from "../../store/app";
import { useUiStore } from "../../store/ui";
import Avatar from "../common/Avatar";
import { CloseIcon } from "../common/Icon";

export default function MemberList() {
  const { guildId } = useParams();
  const isOpen = useUiStore((s) => s.isMemberListOpen);
  const members = useAppStore((s) => (guildId ? s.members[guildId] ?? [] : []));
  const presence = useAppStore((s) => s.presence);
  const openModal = useUiStore((s) => s.openModal);
  const toggleMemberList = useUiStore((s) => s.toggleMemberList);

  // On mobile this panel is a fixed overlay that sits on top of the chat
  // header, covering the same "Members" button that opened it - without its
  // own close control there was no way to dismiss it once open. Hidden on
  // desktop via CSS, where the header's toggle button already works fine.
  const closeButton = (
    <div className="member-list-header">
      <span>Members</span>
      <button className="icon-btn" onClick={toggleMemberList} title="Close"><CloseIcon size={16} /></button>
    </div>
  );

  if (!guildId) {
    return (
      <aside className="member-list" style={{ display: isOpen ? "block" : undefined }}>
        {closeButton}
      </aside>
    );
  }

  const withStatus = members.map((m) => ({ ...m, liveStatus: presence[m.userId] ?? m.user.status }));
  const online = withStatus.filter((m) => m.liveStatus !== "OFFLINE" && m.liveStatus !== "INVISIBLE");
  const offline = withStatus.filter((m) => m.liveStatus === "OFFLINE" || m.liveStatus === "INVISIBLE");

  const hoistedGroups = new Map<string, typeof online>();
  const plainOnline: typeof online = [];
  for (const m of online) {
    const hoisted = m.roles.filter((r) => r.hoist).sort((a, b) => b.position - a.position)[0];
    if (hoisted) {
      if (!hoistedGroups.has(hoisted.name)) hoistedGroups.set(hoisted.name, []);
      hoistedGroups.get(hoisted.name)!.push(m);
    } else {
      plainOnline.push(m);
    }
  }

  return (
    <aside className="member-list">
      {closeButton}
      {[...hoistedGroups.entries()].map(([roleName, group]) => (
        <MemberGroup key={roleName} label={`${roleName} - ${group.length}`} members={group} onSelect={(id) => openModal("user-profile", { userId: id, guildId })} />
      ))}
      <MemberGroup label={`Online - ${plainOnline.length}`} members={plainOnline} onSelect={(id) => openModal("user-profile", { userId: id, guildId })} />
      <MemberGroup label={`Offline - ${offline.length}`} members={offline} onSelect={(id) => openModal("user-profile", { userId: id, guildId })} />
    </aside>
  );
}

function MemberGroup({
  label,
  members,
  onSelect,
}: {
  label: string;
  members: { userId: string; nickname: string | null; user: { username: string; avatarUrl: string | null }; liveStatus: string }[];
  onSelect: (userId: string) => void;
}) {
  if (members.length === 0) return null;
  return (
    <div>
      <div className="member-group-label">{label}</div>
      {members.map((m) => (
        <div key={m.userId} className="member-row" onClick={() => onSelect(m.userId)}>
          <Avatar url={m.user.avatarUrl} name={m.nickname || m.user.username} size={32} status={m.liveStatus} />
          <span className="name">{m.nickname || m.user.username}</span>
        </div>
      ))}
    </div>
  );
}
