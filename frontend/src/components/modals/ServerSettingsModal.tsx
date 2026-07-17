import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUiStore } from "../../store/ui";
import { useAppStore, type Guild } from "../../store/app";
import { useAuthStore } from "../../store/auth";
import {
  updateGuild,
  deleteGuild,
  leaveGuild,
  createRole,
  updateRole,
  deleteRole,
  assignRole,
  removeRole,
  listInvites,
  createInvite,
  deleteInvite,
  listBans,
  unbanMember,
  getAuditLog,
  kickMember,
  banMember,
  timeoutMember,
  getGuild,
  listMembers,
  uploadGuildIcon,
} from "../../api/guilds";
import { Permissions, type PermissionFlag } from "../../utils/permissions";
import { CloseIcon, ImageIcon } from "../common/Icon";
import { apiErrorMessage } from "../../api/client";

type Tab = "overview" | "roles" | "members" | "invites" | "bans" | "audit-log";

export default function ServerSettingsModal({ guildId }: { guildId: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const closeModal = useUiStore((s) => s.closeModal);
  const guild = useAppStore((s) => s.guildDetail[guildId]);
  const members = useAppStore((s) => s.members[guildId] ?? []);
  const currentUser = useAuthStore((s) => s.user)!;
  const navigate = useNavigate();

  if (!guild) return null;
  const isOwner = guild.ownerId === currentUser.id;

  return (
    <div className="modal-card wide">
      <button className="modal-close" onClick={closeModal}><CloseIcon size={14} /></button>
      <div className="modal-sidebar">
        {(["overview", "roles", "members", "invites", "bans", "audit-log"] as Tab[]).map((t) => (
          <div key={t} className={`modal-sidebar-item ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t.replace("-", " ").replace(/^\w/, (c) => c.toUpperCase())}
          </div>
        ))}
        <div style={{ height: 1, background: "var(--border-subtle)", margin: "8px 0" }} />
        {isOwner ? (
          <div
            className="modal-sidebar-item"
            style={{ color: "var(--danger)" }}
            onClick={async () => {
              if (confirm(`Delete ${guild.name}? This can't be undone.`)) {
                await deleteGuild(guildId);
                useAppStore.getState().removeGuild(guildId);
                closeModal();
                navigate("/app/friends");
              }
            }}
          >
            Delete Server
          </div>
        ) : (
          <div
            className="modal-sidebar-item"
            style={{ color: "var(--danger)" }}
            onClick={async () => {
              if (confirm(`Leave ${guild.name}?`)) {
                await leaveGuild(guildId);
                useAppStore.getState().removeGuild(guildId);
                closeModal();
                navigate("/app/friends");
              }
            }}
          >
            Leave Server
          </div>
        )}
      </div>
      <div className="modal-content">
        {tab === "overview" && (
          <OverviewTab
            guildId={guildId}
            name={guild.name}
            iconUrl={guild.iconUrl}
            discoverable={guild.discoverable ?? false}
            tag={guild.tag ?? null}
            tagColor={guild.tagColor ?? null}
          />
        )}
        {tab === "roles" && <RolesTab guildId={guildId} />}
        {tab === "members" && <MembersTab guildId={guildId} members={members} currentUserId={currentUser.id} />}
        {tab === "invites" && <InvitesTab guildId={guildId} />}
        {tab === "bans" && <BansTab guildId={guildId} />}
        {tab === "audit-log" && <AuditLogTab guildId={guildId} />}
      </div>
    </div>
  );
}

function OverviewTab({
  guildId,
  name,
  iconUrl,
  discoverable,
  tag,
  tagColor,
}: {
  guildId: string;
  name: string;
  iconUrl: string | null;
  discoverable: boolean;
  tag: string | null;
  tagColor: string | null;
}) {
  const [value, setValue] = useState(name);
  const [isDiscoverable, setIsDiscoverable] = useState(discoverable);
  const [tagValue, setTagValue] = useState(tag ?? "");
  const [tagColorValue, setTagColorValue] = useState(tagColor ?? "#5865F2");
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const upsertGuild = useAppStore((s) => s.upsertGuild);
  const patchGuildDetail = useAppStore((s) => s.patchGuildDetail);

  // upsertGuild keeps the server rail's icon/name in sync (it reads from
  // the separate `guilds` list); patchGuildDetail keeps this modal itself
  // in sync (it reads from `guildDetail`, a different slice — updateGuild()
  // and uploadGuildIcon() only return the bare guild row, so without this
  // merge the modal kept showing stale values until an unrelated
  // guild:update socket event happened to refetch the full detail).
  function syncGuild(guild: Guild) {
    upsertGuild(guild);
    patchGuildDetail(guildId, guild);
  }

  async function onIconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    setUploadingIcon(true);
    setError(null);
    try {
      syncGuild(await uploadGuildIcon(guildId, file));
    } catch (err) {
      setError(apiErrorMessage(err, "Could not upload icon"));
    } finally {
      setUploadingIcon(false);
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Overview</h2>
      {error && <div className="form-error">{error}</div>}
      <div className="form-field">
        <label>Server Icon</label>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="discovery-card-icon" style={{ width: 64, height: 64 }}>
            {iconUrl ? <img src={iconUrl} alt="" /> : <ImageIcon size={24} />}
          </div>
          <label className="btn btn-secondary" style={{ width: "auto", cursor: "pointer" }}>
            {uploadingIcon ? "Uploading…" : "Change Icon"}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={onIconChange} disabled={uploadingIcon} />
          </label>
        </div>
      </div>
      <div className="form-field">
        <label>Server Name</label>
        <input value={value} onChange={(e) => setValue(e.target.value)} />
      </div>
      <div className="checkbox-row">
        <input
          id="overview-discoverable"
          type="checkbox"
          checked={isDiscoverable}
          onChange={(e) => setIsDiscoverable(e.target.checked)}
        />
        <label htmlFor="overview-discoverable">Show this server on Discovery</label>
      </div>
      <div className="form-field">
        <label>Server Tag</label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            value={tagValue}
            maxLength={4}
            placeholder="e.g. NH"
            style={{ width: 100, textTransform: "uppercase" }}
            onChange={(e) => setTagValue(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
          />
          <input
            type="color"
            value={tagColorValue}
            onChange={(e) => setTagColorValue(e.target.value)}
            disabled={!tagValue}
            style={{ width: 36, height: 32, padding: 0, border: "none", background: "none" }}
          />
          {tagValue && <span className="server-tag-badge" style={{ borderColor: tagColorValue, color: tagColorValue }}>{tagValue}</span>}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
          Up to 4 characters (letters, numbers, - or _). Members can choose to display it next to their name. Clear it to remove the tag.
        </div>
      </div>
      <button
        className="btn btn-primary"
        style={{ width: "auto" }}
        onClick={async () => {
          setError(null);
          try {
            syncGuild(
              await updateGuild(guildId, {
                name: value,
                discoverable: isDiscoverable,
                tag: tagValue || null,
                tagColor: tagValue ? tagColorValue : null,
              })
            );
          } catch (err) {
            setError(apiErrorMessage(err, "Could not save server settings"));
          }
        }}
      >
        Save
      </button>
    </div>
  );
}

const PERMISSION_OPTIONS: PermissionFlag[] = [
  "ADMINISTRATOR",
  "MANAGE_GUILD",
  "MANAGE_ROLES",
  "MANAGE_CHANNELS",
  "MANAGE_MESSAGES",
  "MANAGE_NICKNAMES",
  "MANAGE_EMOJIS",
  "KICK_MEMBERS",
  "BAN_MEMBERS",
  "MODERATE_MEMBERS",
  "CREATE_INSTANT_INVITE",
  "CHANGE_NICKNAME",
  "SEND_MESSAGES",
  "READ_MESSAGE_HISTORY",
  "ADD_REACTIONS",
  "ATTACH_FILES",
  "EMBED_LINKS",
  "MENTION_EVERYONE",
  "USE_EXTERNAL_EMOJIS",
  "VIEW_AUDIT_LOG",
];

function RolesTab({ guildId }: { guildId: string }) {
  const guild = useAppStore((s) => s.guildDetail[guildId]);
  const setGuildDetail = useAppStore((s) => s.setGuildDetail);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const roles = guild?.roles ?? [];
  const selected = roles.find((r) => r.id === selectedRoleId);

  async function refetch() {
    setGuildDetail(guildId, await getGuild(guildId));
  }

  async function togglePermission(flag: PermissionFlag) {
    if (!selected) return;
    const current = BigInt(selected.permissions);
    const bit = Permissions[flag];
    const next = (current & bit) === bit ? current & ~bit : current | bit;
    await updateRole(guildId, selected.id, { permissions: next.toString() });
    await refetch();
  }

  return (
    <div style={{ display: "flex", gap: 24 }}>
      <div style={{ width: 180 }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Roles</h2>
        {roles.map((r) => (
          <div
            key={r.id}
            className="modal-sidebar-item"
            style={{ color: r.color ? `#${r.color.toString(16).padStart(6, "0")}` : undefined }}
            onClick={() => setSelectedRoleId(r.id)}
          >
            {r.name}
          </div>
        ))}
        <button
          className="btn btn-secondary"
          style={{ marginTop: 8, width: "100%" }}
          onClick={async () => {
            await createRole(guildId, "new role");
            await refetch();
          }}
        >
          + Create Role
        </button>
      </div>
      <div style={{ flex: 1 }}>
        {selected ? (
          <div>
            <div className="form-field">
              <label>Role Name</label>
              <input
                defaultValue={selected.name}
                disabled={selected.isDefault}
                onBlur={async (e) => {
                  if (e.target.value !== selected.name) {
                    await updateRole(guildId, selected.id, { name: e.target.value });
                    await refetch();
                  }
                }}
              />
            </div>
            <div className="checkbox-row">
              <input
                type="checkbox"
                checked={selected.hoist}
                onChange={async (e) => {
                  await updateRole(guildId, selected.id, { hoist: e.target.checked });
                  await refetch();
                }}
              />
              Display separately in member list
            </div>
            <h3 style={{ fontSize: 13, textTransform: "uppercase", color: "var(--text-muted)", marginTop: 16 }}>Permissions</h3>
            {PERMISSION_OPTIONS.map((flag) => (
              <div className="checkbox-row" key={flag}>
                <input
                  type="checkbox"
                  checked={(BigInt(selected.permissions) & Permissions[flag]) === Permissions[flag]}
                  onChange={() => togglePermission(flag)}
                />
                {flag.replace(/_/g, " ")}
              </div>
            ))}
            {!selected.isDefault && (
              <button
                className="btn btn-danger"
                style={{ marginTop: 16 }}
                onClick={async () => {
                  if (confirm("Delete this role?")) {
                    await deleteRole(guildId, selected.id);
                    setSelectedRoleId(null);
                    await refetch();
                  }
                }}
              >
                Delete Role
              </button>
            )}
          </div>
        ) : (
          <div className="empty-state">Select a role to edit it.</div>
        )}
      </div>
    </div>
  );
}

function MembersTab({ guildId, members, currentUserId }: { guildId: string; members: any[]; currentUserId: string }) {
  const guild = useAppStore((s) => s.guildDetail[guildId]);
  const roles = guild?.roles ?? [];
  const setMembers = useAppStore((s) => s.setMembers);

  async function refetch() {
    setMembers(guildId, await listMembers(guildId));
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Members - {members.length}</h2>
      {members.map((m) => (
        <div key={m.id} className="settings-row">
          <div>
            <div style={{ fontWeight: 600 }}>{m.nickname || m.user.username}#{m.user.discriminator}</div>
            <div>
              {m.roles.map((r: any) => (
                <span key={r.id} className="role-pill">{r.name}</span>
              ))}
            </div>
          </div>
          {m.userId !== currentUserId && (
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <select
                onChange={async (e) => {
                  if (e.target.value) {
                    await assignRole(guildId, m.userId, e.target.value);
                    await refetch();
                    e.target.value = "";
                  }
                }}
                style={{ background: "var(--bg-input)", color: "var(--text-normal)", border: "none", borderRadius: 4 }}
              >
                <option value="">+ Add Role</option>
                {roles.filter((r) => !r.isDefault && !m.roles.some((mr: any) => mr.id === r.id)).map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {m.roles.filter((r: any) => !r.isDefault).map((r: any) => (
                <button key={r.id} className="btn btn-secondary" onClick={async () => { await removeRole(guildId, m.userId, r.id); await refetch(); }}>
                  -{r.name}
                </button>
              ))}
              <button className="btn btn-secondary" onClick={async () => { await timeoutMember(guildId, m.userId, 10); await refetch(); }}>
                Timeout 10m
              </button>
              <button className="btn btn-secondary" onClick={async () => { await kickMember(guildId, m.userId); await refetch(); }}>
                Kick
              </button>
              <button className="btn btn-danger" onClick={async () => { if (confirm("Ban this member?")) { await banMember(guildId, m.userId); await refetch(); } }}>
                Ban
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function InvitesTab({ guildId }: { guildId: string }) {
  const [invites, setInvites] = useState<any[]>([]);
  const guild = useAppStore((s) => s.guildDetail[guildId]);
  const firstChannel = (guild?.channels ?? [])[0] ?? guild?.categories?.[0]?.channels?.[0];

  useEffect(() => {
    listInvites(guildId).then(setInvites);
  }, [guildId]);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Invites</h2>
      <button
        className="btn btn-primary"
        style={{ width: "auto", marginBottom: 12 }}
        onClick={async () => {
          if (!firstChannel) return;
          await createInvite(guildId, firstChannel.id);
          setInvites(await listInvites(guildId));
        }}
      >
        Create Invite Link
      </button>
      {invites.map((i) => (
        <div key={i.code} className="settings-row">
          <span>/invite/{i.code} - {i.uses} uses</span>
          <button
            className="btn btn-danger"
            onClick={async () => {
              await deleteInvite(guildId, i.code);
              setInvites(await listInvites(guildId));
            }}
          >
            Revoke
          </button>
        </div>
      ))}
    </div>
  );
}

function BansTab({ guildId }: { guildId: string }) {
  const [bans, setBans] = useState<any[]>([]);
  useEffect(() => {
    listBans(guildId).then(setBans);
  }, [guildId]);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Bans</h2>
      {bans.length === 0 && <div className="empty-state">No bans yet.</div>}
      {bans.map((b) => (
        <div key={b.id} className="settings-row">
          <span>{b.user.username}#{b.user.discriminator} - {b.reason || "No reason given"}</span>
          <button className="btn btn-secondary" onClick={async () => { await unbanMember(guildId, b.userId); setBans(await listBans(guildId)); }}>
            Revoke Ban
          </button>
        </div>
      ))}
    </div>
  );
}

function AuditLogTab({ guildId }: { guildId: string }) {
  const [entries, setEntries] = useState<any[]>([]);
  useEffect(() => {
    getAuditLog(guildId).then(setEntries);
  }, [guildId]);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Audit Log</h2>
      {entries.length === 0 && <div className="empty-state">Nothing has happened yet.</div>}
      {entries.map((e) => (
        <div key={e.id} className="settings-row">
          <span>
            <strong>{e.actor.username}</strong> - {e.action.replace(/_/g, " ")}
            {e.reason ? ` (${e.reason})` : ""}
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{new Date(e.createdAt).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
