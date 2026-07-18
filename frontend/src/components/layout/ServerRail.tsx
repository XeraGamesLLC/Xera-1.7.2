import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAppStore } from "../../store/app";
import { useUiStore } from "../../store/ui";
import { CompassIcon } from "../common/Icon";
import logo from "../../assets/logo.png";

export default function ServerRail() {
  const guilds = useAppStore((s) => s.guilds);
  const dmUnreadCounts = useAppStore((s) => s.dmUnreadCounts);
  const unreadChannelIds = useAppStore((s) => s.unreadChannelIds);
  const channelGuild = useAppStore((s) => s.channelGuild);
  const { guildId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const setMobilePanel = useUiStore((s) => s.setMobilePanel);
  const openModal = useUiStore((s) => s.openModal);

  const totalDmUnread = Object.values(dmUnreadCounts).reduce((sum, n) => sum + n, 0);
  const unreadGuildIds = new Set<string>();
  for (const cid of unreadChannelIds) {
    const gid = channelGuild[cid];
    if (gid) unreadGuildIds.add(gid);
  }

  function goHome() {
    navigate("/app/friends");
    setMobilePanel("channels");
  }

  function goToGuild(id: string) {
    navigate(`/app/guilds/${id}`);
    setMobilePanel("channels");
  }

  function goToDiscovery() {
    navigate("/app/discovery");
    setMobilePanel("channels");
  }

  return (
    <nav className="server-rail" aria-label="Servers">
      <div
        className={`server-pill home-pill ${!guildId ? "active" : ""} ${totalDmUnread > 0 ? "unread" : ""}`}
        onClick={goHome}
        title="Direct Messages"
      >
        <span className="pill-indicator" />
        <img src={logo} alt="XRA" />
        {totalDmUnread > 0 && <span className="unread-count-badge">{totalDmUnread > 99 ? "99+" : totalDmUnread}</span>}
      </div>
      <div className="server-rail-divider" />
      {guilds.map((g) => (
        <div
          key={g.id}
          className={`server-pill ${guildId === g.id ? "active" : ""} ${unreadGuildIds.has(g.id) ? "unread" : ""}`}
          onClick={() => goToGuild(g.id)}
          title={g.name}
        >
          <span className="pill-indicator" />
          {g.iconUrl ? <img src={g.iconUrl} alt="" /> : initials(g.name)}
        </div>
      ))}
      <div
        className={`server-pill ${location.pathname === "/app/discovery" ? "active" : ""}`}
        onClick={goToDiscovery}
        title="Discover Servers"
      >
        <span className="pill-indicator" />
        <CompassIcon size={22} />
      </div>
      <div
        className="server-pill action"
        onClick={() => openModal("create-server")}
        title="Add a Server"
      >
        +
      </div>
    </nav>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
