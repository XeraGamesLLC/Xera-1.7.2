import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createGuild, joinByInvite } from "../../api/guilds";
import { useAppStore } from "../../store/app";
import { useUiStore } from "../../store/ui";
import { apiErrorMessage } from "../../api/client";
import { CloseIcon } from "../common/Icon";

export default function CreateServerModal() {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [discoverable, setDiscoverable] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const closeModal = useUiStore((s) => s.closeModal);
  const upsertGuild = useAppStore((s) => s.upsertGuild);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "create") {
        const guild = await createGuild(name, discoverable);
        upsertGuild(guild);
        navigate(`/app/guilds/${guild.id}`);
      } else {
        const code = inviteCode.trim().split("/").pop() ?? inviteCode;
        const guild = await joinByInvite(code);
        upsertGuild(guild);
        navigate(`/app/guilds/${guild.id}`);
      }
      closeModal();
    } catch (err) {
      setError(apiErrorMessage(err, "Something went wrong"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-card">
      <button className="modal-close" onClick={closeModal}><CloseIcon size={14} /></button>
      <h1 style={{ color: "var(--header-primary)", marginTop: 0 }}>
        {mode === "create" ? "Create a Server" : "Join a Server"}
      </h1>
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={onSubmit}>
        {mode === "create" ? (
          <>
            <div className="form-field">
              <label>Server name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={100} autoFocus />
            </div>
            <div className="checkbox-row">
              <input
                id="discoverable"
                type="checkbox"
                checked={discoverable}
                onChange={(e) => setDiscoverable(e.target.checked)}
              />
              <label htmlFor="discoverable">Add server to Discovery</label>
            </div>
          </>
        ) : (
          <div className="form-field">
            <label>Invite link or code</label>
            <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} required autoFocus />
          </div>
        )}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Working…" : mode === "create" ? "Create" : "Join"}
        </button>
      </form>
      <div className="auth-footer">
        {mode === "create" ? (
          <button className="btn-link" onClick={() => setMode("join")}>Have an invite? Join a server</button>
        ) : (
          <button className="btn-link" onClick={() => setMode("create")}>Create your own server instead</button>
        )}
      </div>
    </div>
  );
}
