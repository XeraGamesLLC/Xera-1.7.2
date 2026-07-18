import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUiStore } from "../../store/ui";
import { useAuthStore } from "../../store/auth";
import { useAppStore } from "../../store/app";
import { getUser, type UserProfile } from "../../api/users";
import { sendFriendRequest } from "../../api/friends";
import { openDm } from "../../api/dms";
import Avatar from "../common/Avatar";
import { CloseIcon, DeveloperBadgeIcon, CalendarIcon } from "../common/Icon";

function formatJoinDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function UserProfileModal({ userId, guildId }: { userId: string; guildId?: string }) {
  const closeModal = useUiStore((s) => s.closeModal);
  const currentUser = useAuthStore((s) => s.user)!;
  const presence = useAppStore((s) => s.presence);
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const member = useAppStore((s) => (guildId ? s.members[guildId]?.find((m) => m.userId === userId) : undefined));

  useEffect(() => {
    getUser(userId).then(setProfile);
  }, [userId]);

  if (!profile) return null;
  const isSelf = userId === currentUser.id;
  // Merge in live presence - profile.status is the user's persisted
  // preference (never reset to OFFLINE server-side on disconnect by
  // design), so without this a user who's gone offline still shows
  // whatever status they last had while connected.
  const liveStatus = presence[userId] ?? profile.status;

  async function messageUser() {
    const channel = await openDm(userId);
    useAppStore.getState().upsertDmChannel(channel);
    closeModal();
    navigate(`/app/dms/${channel.id}`);
  }

  async function addFriend() {
    try {
      await sendFriendRequest(profile!.username, profile!.discriminator);
      setMessage("Friend request sent!");
    } catch {
      setMessage("Could not send friend request");
    }
  }

  function editProfile() {
    closeModal();
    useUiStore.getState().openModal("user-settings");
  }

  const displayName = member?.nickname || profile.username;

  return (
    <div className="modal-card profile-modal">
      <button className="modal-close" onClick={closeModal}><CloseIcon size={14} /></button>
      <div className="profile-banner" style={profile.bannerUrl ? { backgroundImage: `url(${profile.bannerUrl})` } : undefined} />
      <div className="profile-body">
        <div className="profile-avatar-row">
          <div className="profile-avatar-wrap">
            <Avatar url={profile.avatarUrl} name={profile.username} size={80} status={liveStatus} />
          </div>
          {isSelf ? (
            <button className="btn btn-primary profile-action-btn" onClick={editProfile}>Edit Profile</button>
          ) : (
            <div className="profile-actions">
              <button className="btn btn-primary profile-action-btn" onClick={messageUser}>Message</button>
              <button className="btn btn-secondary profile-action-btn" onClick={addFriend}>Add Friend</button>
            </div>
          )}
        </div>

        <div className="profile-identity">
          <div className="profile-name-row">
            <span className="profile-display-name">{displayName}</span>
            {profile.isDeveloper && (
              <span className="profile-badge" title="Platform Developer">
                <DeveloperBadgeIcon size={16} />
              </span>
            )}
          </div>
          <div className="profile-username">{profile.username}#{profile.discriminator}</div>
          {profile.customStatus && <div className="profile-custom-status">{profile.customStatus}</div>}
        </div>

        {message && <div className="profile-inline-message">{message}</div>}

        <div className="profile-card">
          {profile.aboutMe && (
            <div className="profile-card-section">
              <h3>About Me</h3>
              <p>{profile.aboutMe}</p>
            </div>
          )}

          {member && member.roles.filter((r) => !r.isDefault).length > 0 && (
            <div className="profile-card-section">
              <h3>Roles</h3>
              <div>
                {member.roles.filter((r) => !r.isDefault).map((r) => (
                  <span key={r.id} className="role-pill">{r.name}</span>
                ))}
              </div>
            </div>
          )}

          <div className="profile-card-section">
            <h3>Member Since</h3>
            <div className="profile-member-since">
              <CalendarIcon size={16} />
              {formatJoinDate(profile.createdAt)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
