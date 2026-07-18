import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { useUiStore } from "../../store/ui";
import { useAppStore } from "../../store/app";
import { updateProfile, updateStatus, uploadAvatar, uploadBanner, setPrimaryGuild } from "../../api/users";
import { logout as apiLogout } from "../../api/auth";
import { disconnectSocket } from "../../api/socket";
import Avatar from "../common/Avatar";
import ServerTagBadge from "../common/ServerTagBadge";
import ImageCropperModal from "./ImageCropperModal";
import { CloseIcon } from "../common/Icon";

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
  const guilds = useAppStore((s) => s.guilds);
  const taggedGuilds = guilds.filter((g) => g.tag);
  const [cropperTarget, setCropperTarget] = useState<{ file: File; kind: "avatar" | "banner" } | null>(null);

  async function onPrimaryGuildChange(guildId: string) {
    const updated = await setPrimaryGuild(guildId || null);
    setUser(updated);
  }

  async function save() {
    setSaving(true);
    try {
      const updated = await updateProfile({ aboutMe, customStatus: customStatus || null });
      setUser(updated);
    } finally {
      setSaving(false);
    }
  }

  function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    setCropperTarget({ file, kind: "avatar" });
  }

  function onBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    setCropperTarget({ file, kind: "banner" });
  }

  async function onCropConfirm(blob: Blob) {
    if (!cropperTarget) return;
    const { kind } = cropperTarget;
    setCropperTarget(null);
    const cropped = new File([blob], `${kind}.png`, { type: "image/png" });
    const updated = kind === "avatar" ? await uploadAvatar(cropped) : await uploadBanner(cropped);
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
    <>
    <div className="modal-card">
      <button className="modal-close" onClick={closeModal}><CloseIcon size={14} /></button>
      <h1 style={{ color: "var(--header-primary)", marginTop: 0 }}>User Settings</h1>

      <div className="form-field">
        <label>Profile Banner</label>
        <div
          className="settings-banner-preview"
          style={user.bannerUrl ? { backgroundImage: `url(${user.bannerUrl})` } : undefined}
        >
          <label className="btn btn-secondary" style={{ width: "auto", cursor: "pointer" }}>
            {user.bannerUrl ? "Change Banner" : "Upload Banner"}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={onBannerChange} />
          </label>
        </div>
      </div>

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

      {taggedGuilds.length > 0 && (
        <div className="form-field">
          <label>Server Tag</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              value={user.primaryGuild?.id ?? ""}
              onChange={(e) => onPrimaryGuildChange(e.target.value)}
              style={{ flex: 1, background: "var(--bg-input)", border: "none", borderRadius: 4, padding: 10, color: "var(--text-normal)" }}
            >
              <option value="">None</option>
              {taggedGuilds.map((g) => (
                <option key={g.id} value={g.id}>{g.name} — {g.tag}</option>
              ))}
            </select>
            {user.primaryGuild && <ServerTagBadge guild={user.primaryGuild} />}
          </div>
        </div>
      )}

      <button className="btn btn-primary" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save Changes"}
      </button>

      <div style={{ marginTop: 24, borderTop: "1px solid var(--border-subtle)", paddingTop: 16 }}>
        <button className="btn btn-danger" onClick={onLogout}>Log Out</button>
      </div>
    </div>
    {cropperTarget && (
      <ImageCropperModal
        file={cropperTarget.file}
        title={cropperTarget.kind === "avatar" ? "Edit Avatar" : "Edit Banner"}
        shape={cropperTarget.kind === "avatar" ? "circle" : "rect"}
        aspect={cropperTarget.kind === "avatar" ? 1 : 2.5}
        onCancel={() => setCropperTarget(null)}
        onConfirm={onCropConfirm}
      />
    )}
    </>
  );
}
