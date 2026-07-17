import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUiStore } from "../../store/ui";
import { useAuthStore } from "../../store/auth";
import { useAppStore } from "../../store/app";
import { getUser } from "../../api/users";
import { sendFriendRequest } from "../../api/friends";
import { openDm } from "../../api/dms";
import Avatar from "../common/Avatar";

export default function UserProfileModal({ userId, guildId }: { userId: string; guildId?: string }) {
  const closeModal = useUiStore((s) => s.closeModal);
  const currentUser = useAuthStore((s) => s.user)!;
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);
  const member = useAppStore((s) => (guildId ? s.members[guildId]?.find((m) => m.userId === userId) : undefined));

  useEffect(() => {
    getUser(userId).then(setProfile);
  }, [userId]);

  if (!profile) return null;
  const isSelf = userId === currentUser.id;

  async function messageUser() {
    const channel = await openDm(userId);
    useAppStore.getState().upsertDmChannel(channel);
    closeModal();
    navigate(`/app/dms/${channel.id}`);
  }

  async function addFriend() {
    try {
      await sendFriendRequest(profile.username, profile.discriminator);
      setMessage("Friend request sent!");
    } catch {
      setMessage("Could not send friend request");
    }
  }

  return (
    <div className="modal-card">
      <button className="modal-close" onClick={closeModal}>✕</button>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Avatar url={profile.avatarUrl} name={profile.username} size={64} status={profile.status} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, color: "var(--header-primary)" }}>
            {member?.nickname || profile.username}#{profile.discriminator}
          </div>
          {profile.customStatus && <div style={{ color: "var(--text-muted)" }}>{profile.customStatus}</div>}
        </div>
      </div>

      {profile.aboutMe && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 12, textTransform: "uppercase", color: "var(--text-muted)" }}>About Me</h3>
          <p>{profile.aboutMe}</p>
        </div>
      )}

      {member && member.roles.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 12, textTransform: "uppercase", color: "var(--text-muted)" }}>Roles</h3>
          {member.roles.map((r: any) => (
            <span key={r.id} className="role-pill">{r.name}</span>
          ))}
        </div>
      )}

      {!isSelf && (
        <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
          <button className="btn btn-primary" style={{ width: "auto" }} onClick={messageUser}>Message</button>
          <button className="btn btn-secondary" onClick={addFriend}>Add Friend</button>
        </div>
      )}
      {message && <div style={{ marginTop: 8, color: "var(--text-muted)" }}>{message}</div>}
    </div>
  );
}
