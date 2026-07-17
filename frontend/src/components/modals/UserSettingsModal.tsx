import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { useUiStore } from "../../store/ui";
import { updateProfile, updateStatus, uploadAvatar } from "../../api/users";
import { logout as apiLogout } from "../../api/auth";
import { disconnectSocket } from "../../api/socket";
import Avatar from "../common/Avatar";

const STATUSES: { value: "ONLINE" | "IDLE" | "DND" | "INVISIBLE"; label: string }[] = [
  { value: "ONLINE", label: "Online" },
  { value: "IDLE", label: "Idle" },
  { value: "DND", label: "Do Not Disturb" },
  { value: "INVISIBLE", label: "Invisible" },
];

export default function UserSettingsModal() {
  const user = useAuthStore((s) => s.user)!;
  const setUser = useAuthStore((s) => s.setUser);
  const closeModal = useUiStore((s) => s.closeModal);
  const navigate = useNavigate();
  const [aboutMe, setAboutMe] = useState(user.aboutMe ?? "");
  const [customStatus, setCustomStatus] = useState(user.customStatus ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const updated = await updateProfile({ aboutMe, customStatus: customStatus || null });
      setUser(updated);
    } finally {
      setSaving(false);
    }
  }

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const updated = await uploadAvatar(file);
    setUser(updated);
  }

  async function onLogout() {
    disconnectSocket();
    await apiLogout();
    useAuthStore.getState().logout();
    closeModal();
    navigate("/login");
  }

  return (
    <div className="modal-card">
      <button className="modal-close" onClick={closeModal}>✕</button>
      <h1 style={{ color: "var(--header-primary)", marginTop: 0 }}>User Settings</h1>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <Avatar url={user.avatarUrl} name={user.username} size={64} />
        <div>
          <div style={{ fontWeight: 700, color: "var(--header-primary)" }}>{user.username}#{user.discriminator}</div>
          <label className="btn btn-secondary" style={{ display: "inline-block", marginTop: 8, cursor: "pointer" }}>
            Change Avatar
            <input type="file" accept="image/*" hidden onChange={onAvatarChange} />
          </label>
        </div>
      </div>

      <div className="form-field">
        <label>Status</label>
        <select
          value={user.status}
          onChange={async (e) => setUser(await updateStatus(e.target.value as any))}
          style={{ width: "100%", background: "var(--bg-input)", border: "none", borderRadius: 4, padding: 10, color: "var(--text-normal)" }}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label>Custom Status</label>
        <input value={customStatus} onChange={(e) => setCustomStatus(e.target.value)} maxLength={128} placeholder="What's happening?" />
      </div>

      <div className="form-field">
        <label>About Me</label>
        <textarea value={aboutMe} onChange={(e) => setAboutMe(e.target.value)} maxLength={190} rows={3} />
      </div>

      <button className="btn btn-primary" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save Changes"}
      </button>

      <div style={{ marginTop: 24, borderTop: "1px solid var(--border-subtle)", paddingTop: 16 }}>
        <button className="btn btn-danger" onClick={onLogout}>Log Out</button>
      </div>
    </div>
  );
}
