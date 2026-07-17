import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listDiscoverableGuilds, joinDiscoverableGuild, type DiscoverableGuild } from "../api/guilds";
import { useAppStore } from "../store/app";
import { useUiStore } from "../store/ui";
import { apiErrorMessage } from "../api/client";
import { CompassIcon, MenuIcon } from "../components/common/Icon";

export default function DiscoveryPage() {
  const [guilds, setGuilds] = useState<DiscoverableGuild[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const upsertGuild = useAppStore((s) => s.upsertGuild);
  const myGuilds = useAppStore((s) => s.guilds);
  const setMobilePanel = useUiStore((s) => s.setMobilePanel);
  const navigate = useNavigate();

  useEffect(() => {
    setMobilePanel("chat");
    listDiscoverableGuilds()
      .then(setGuilds)
      .catch((err) => setError(apiErrorMessage(err, "Could not load Discovery")))
      .finally(() => setLoading(false));
  }, []);

  async function join(guildId: string) {
    setJoiningId(guildId);
    setError(null);
    try {
      const guild = await joinDiscoverableGuild(guildId);
      upsertGuild(guild);
      navigate(`/app/guilds/${guild.id}`);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not join that server"));
    } finally {
      setJoiningId(null);
    }
  }

  const myGuildIds = new Set(myGuilds.map((g) => g.id));

  return (
    <main className="chat-column">
      <div className="chat-header">
        <button className="icon-btn hamburger" onClick={() => setMobilePanel("channels")}><MenuIcon /></button>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <CompassIcon size={16} /> Discover Servers
        </span>
      </div>
      <div className="discovery-body">
        {error && <div className="form-error">{error}</div>}
        {loading && <div className="empty-state">Loading…</div>}
        {!loading && guilds.length === 0 && (
          <div className="empty-state">
            <CompassIcon size={40} />
            No public servers yet. Create one and check "Add server to Discovery" to be the first.
          </div>
        )}
        <div className="discovery-grid">
          {guilds.map((g) => {
            const alreadyMember = myGuildIds.has(g.id);
            return (
              <div key={g.id} className="discovery-card">
                <div className="discovery-card-icon">
                  {g.iconUrl ? <img src={g.iconUrl} alt="" /> : initials(g.name)}
                </div>
                <div className="discovery-card-body">
                  <div className="discovery-card-name">{g.name}</div>
                  <div className="discovery-card-stats">
                    <span><span className="status-pip online" /> {g.onlineCount} Online</span>
                    <span><span className="status-pip" /> {g.memberCount} Members</span>
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  style={{ width: "auto" }}
                  disabled={alreadyMember || joiningId === g.id}
                  onClick={() => (alreadyMember ? navigate(`/app/guilds/${g.id}`) : join(g.id))}
                >
                  {alreadyMember ? "Joined" : joiningId === g.id ? "Joining…" : "Join"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
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
