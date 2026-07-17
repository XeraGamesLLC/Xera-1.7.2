import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client";
import { joinByInvite } from "../api/guilds";
import { useAppStore } from "../store/app";
import "../styles/auth.css";

export default function InvitePage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    api
      .get(`/invites/${code}`)
      .then((res) => setInvite(res.data.invite))
      .catch((err) => setError(apiErrorMessage(err, "Invite not found")));
  }, [code]);

  async function join() {
    setJoining(true);
    setError(null);
    try {
      const guild = await joinByInvite(code!);
      useAppStore.getState().upsertGuild(guild);
      navigate(`/app/guilds/${guild.id}`);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not join server"));
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>You've been invited!</h1>
        {error && <div className="form-error">{error}</div>}
        {invite && (
          <>
            <p className="subtitle">
              Join <strong>{invite.guild.name}</strong> — #{invite.channel.name}
            </p>
            <button className="btn btn-primary" onClick={join} disabled={joining}>
              {joining ? "Joining…" : "Accept Invite"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
