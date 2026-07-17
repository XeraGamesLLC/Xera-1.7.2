import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/app";
import { useUiStore } from "../store/ui";
import Avatar from "../components/common/Avatar";
import {
  listFriends,
  listIncoming,
  listOutgoing,
  sendFriendRequest,
  acceptRequest,
  declineRequest,
  removeFriend,
} from "../api/friends";
import { openDm } from "../api/dms";
import { apiErrorMessage } from "../api/client";
import { MenuIcon, UsersIcon } from "../components/common/Icon";

type Tab = "online" | "all" | "pending" | "add";

export default function FriendsView() {
  const [tab, setTab] = useState<Tab>("online");
  const friends = useAppStore((s) => s.friends);
  const incoming = useAppStore((s) => s.incomingRequests);
  const outgoing = useAppStore((s) => s.outgoingRequests);
  const setFriends = useAppStore((s) => s.setFriends);
  const setIncoming = useAppStore((s) => s.setIncomingRequests);
  const setOutgoing = useAppStore((s) => s.setOutgoingRequests);
  const presence = useAppStore((s) => s.presence);
  const navigate = useNavigate();
  const setMobilePanel = useUiStore((s) => s.setMobilePanel);

  function refresh() {
    listFriends().then(setFriends);
    listIncoming().then(setIncoming);
    listOutgoing().then(setOutgoing);
  }

  useEffect(() => {
    refresh();
    setMobilePanel("chat");
  }, []);

  async function openConversation(userId: string) {
    const channel = await openDm(userId);
    useAppStore.getState().upsertDmChannel(channel);
    navigate(`/app/dms/${channel.id}`);
    setMobilePanel("chat");
  }

  const onlineFriends = friends.filter((f) => (presence[f.id] ?? f.status) !== "OFFLINE");
  const shown = tab === "online" ? onlineFriends : friends;

  return (
    <main className="chat-column">
      <div className="chat-header">
        <button className="icon-btn hamburger" onClick={() => setMobilePanel("channels")}><MenuIcon /></button>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><UsersIcon size={16} /> Friends</span>
        <nav style={{ display: "flex", gap: 16, marginLeft: 24, fontSize: 14 }}>
          {(["online", "all", "pending", "add"] as Tab[]).map((t) => (
            <button
              key={t}
              className="btn-link"
              style={{ fontWeight: tab === t ? 700 : 400, color: tab === t ? "var(--header-primary)" : "var(--text-muted)" }}
              onClick={() => setTab(t)}
            >
              {t === "add" ? "Add Friend" : t[0].toUpperCase() + t.slice(1)}
              {t === "pending" && incoming.length > 0 ? ` (${incoming.length})` : ""}
            </button>
          ))}
        </nav>
      </div>

      <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
        {tab === "add" && <AddFriendForm onSent={refresh} />}

        {tab === "pending" && (
          <div>
            <h3 style={{ color: "var(--text-muted)", fontSize: 13, textTransform: "uppercase" }}>
              Incoming - {incoming.length}
            </h3>
            {incoming.map((r: any) => (
              <div key={r.id} className="member-row" style={{ justifyContent: "space-between" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar url={r.requester.avatarUrl} name={r.requester.username} size={32} />
                  {r.requester.username}#{r.requester.discriminator}
                </span>
                <span>
                  <button className="btn btn-secondary" onClick={() => acceptRequest(r.id).then(refresh)}>Accept</button>{" "}
                  <button className="btn btn-danger" onClick={() => declineRequest(r.id).then(refresh)}>Ignore</button>
                </span>
              </div>
            ))}
            <h3 style={{ color: "var(--text-muted)", fontSize: 13, textTransform: "uppercase", marginTop: 16 }}>
              Outgoing - {outgoing.length}
            </h3>
            {outgoing.map((r: any) => (
              <div key={r.id} className="member-row">
                <Avatar url={r.addressee.avatarUrl} name={r.addressee.username} size={32} />
                {r.addressee.username}#{r.addressee.discriminator} - Pending
              </div>
            ))}
          </div>
        )}

        {(tab === "online" || tab === "all") &&
          shown.map((f) => (
            <div key={f.id} className="member-row" style={{ justifyContent: "space-between" }} onClick={() => openConversation(f.id)}>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar url={f.avatarUrl} name={f.username} size={32} status={presence[f.id] ?? f.status} />
                {f.username}#{f.discriminator}
              </span>
              <button
                className="btn btn-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Remove ${f.username} as a friend?`)) removeFriend(f.id).then(refresh);
                }}
              >
                Remove
              </button>
            </div>
          ))}
        {(tab === "online" || tab === "all") && shown.length === 0 && (
          <div className="empty-state">No one here yet.</div>
        )}
      </div>
    </main>
  );
}

function AddFriendForm({ onSent }: { onSent: () => void }) {
  const [tag, setTag] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const [username, discriminator] = tag.split("#");
    if (!username || !discriminator || discriminator.length !== 4) {
      setError("Enter a username#0000");
      return;
    }
    try {
      await sendFriendRequest(username, discriminator);
      setMessage("Friend request sent!");
      setTag("");
      onSent();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not send request"));
    }
  }

  return (
    <div>
      <h2 style={{ color: "var(--header-primary)" }}>Add Friend</h2>
      <p style={{ color: "var(--text-muted)" }}>You can add friends with their username and tag.</p>
      <form onSubmit={onSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="Username#0000"
          style={{ flex: 1, background: "var(--bg-input)", border: "none", borderRadius: 4, padding: 10, color: "var(--text-normal)" }}
        />
        <button className="btn btn-primary" style={{ width: "auto" }} type="submit">Send Friend Request</button>
      </form>
      {error && <div className="form-error" style={{ marginTop: 12 }}>{error}</div>}
      {message && <div style={{ color: "var(--online)", marginTop: 12 }}>{message}</div>}
    </div>
  );
}
