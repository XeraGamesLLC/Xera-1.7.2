import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAppStore } from "../../store/app";
import { useUiStore } from "../../store/ui";
import { CompassIcon } from "../common/Icon";

export default function ServerRail() {
  const guilds = useAppStore((s) => s.guilds);
  const { guildId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const setMobilePanel = useUiStore((s) => s.setMobilePanel);
  const openModal = useUiStore((s) => s.openModal);

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
      <div className={`server-pill ${!guildId ? "active" : ""}`} onClick={goHome} title="Direct Messages">
        <span className="pill-indicator" />
        XRA
      </div>
      <div className="server-rail-divider" />
      {guilds.map((g) => (
        <div
          key={g.id}
          className={`server-pill ${guildId === g.id ? "active" : ""}`}
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
