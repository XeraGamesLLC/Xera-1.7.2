import { useState, type FormEvent } from "react";
import { useAppStore, type Channel, type ChannelPurpose } from "../../store/app";
import { useUiStore } from "../../store/ui";
import { createChannel, updateChannel, deleteChannel } from "../../api/guilds";
import { apiErrorMessage } from "../../api/client";
import { CloseIcon, SpeakerIcon, AnnouncementIcon, RulebookIcon } from "../common/Icon";

const PURPOSES: { value: ChannelPurpose; label: string; description: string; icon: (size: number) => React.ReactNode }[] = [
  {
    value: "NORMAL",
    label: "Normal",
    description: "Anyone in the server can send messages here.",
    icon: () => "#",
  },
  {
    value: "ANNOUNCEMENT",
    label: "Announcements",
    description: "Only admins and the server owner can send messages here.",
    icon: (size) => <AnnouncementIcon size={size} />,
  },
  {
    value: "RULES",
    label: "Rules",
    description: "Same as Announcements, just marked with a different icon.",
    icon: (size) => <RulebookIcon size={size} />,
  },
];

// Handles both creating a new channel and editing an existing one - pass
// `channel` (and `guildId`) via modalProps to edit, omit `channel` to create.
export default function ChannelModal({ guildId, channel }: { guildId: string; channel?: Channel }) {
  const isEdit = !!channel;
  const closeModal = useUiStore((s) => s.closeModal);
  const guild = useAppStore((s) => s.guildDetail[guildId]);
  const categories = guild?.categories ?? [];

  const [name, setName] = useState(channel?.name ?? "");
  const [type, setType] = useState<"TEXT" | "VOICE">((channel?.type as "TEXT" | "VOICE") ?? "TEXT");
  const [purpose, setPurpose] = useState<ChannelPurpose>(channel?.purpose ?? "NORMAL");
  const [categoryId, setCategoryId] = useState<string>(channel?.categoryId ?? "");
  const [topic, setTopic] = useState(channel?.topic ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isEdit) {
        await updateChannel(guildId, channel.id, {
          name,
          topic: topic || null,
          purpose: type === "TEXT" ? purpose : "NORMAL",
          categoryId: categoryId || null,
        });
      } else {
        await createChannel(guildId, {
          name,
          type,
          purpose: type === "TEXT" ? purpose : "NORMAL",
          categoryId: categoryId || null,
          topic: topic || null,
        });
      }
      closeModal();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save channel"));
    } finally {
      setLoading(false);
    }
  }

  async function onDelete() {
    if (!channel) return;
    if (!confirm(`Delete #${channel.name}? This can't be undone.`)) return;
    setLoading(true);
    try {
      await deleteChannel(guildId, channel.id);
      closeModal();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not delete channel"));
      setLoading(false);
    }
  }

  return (
    <div className="modal-card">
      <button className="modal-close" onClick={closeModal}><CloseIcon size={14} /></button>
      <h1 style={{ color: "var(--header-primary)", marginTop: 0 }}>{isEdit ? `Edit #${channel!.name}` : "Create a Channel"}</h1>
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="form-field">
          <label>Channel name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, ""))}
            required
            minLength={1}
            maxLength={100}
            autoFocus
            placeholder="new-channel"
          />
        </div>

        {!isEdit && (
          <div className="form-field">
            <label>Channel type</label>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className={`btn ${type === "TEXT" ? "btn-primary" : "btn-secondary"}`}
                style={{ width: "auto", flex: 1 }}
                onClick={() => setType("TEXT")}
              >
                # Text
              </button>
              <button
                type="button"
                className={`btn ${type === "VOICE" ? "btn-primary" : "btn-secondary"}`}
                style={{ width: "auto", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                onClick={() => setType("VOICE")}
              >
                <SpeakerIcon size={14} /> Voice
              </button>
            </div>
          </div>
        )}

        {type === "TEXT" && (
          <div className="form-field">
            <label>Channel purpose</label>
            {/* Plain divs, not <label> elements: this row lives inside
                .form-field, whose "label" selector forces display:block,
                uppercase, 12px muted text onto any real <label> descendant,
                which stomped this row's flex layout and text styling. A div
                sidesteps that cascade entirely. */}
            {PURPOSES.map((p) => (
              <div
                key={p.value}
                className="channel-purpose-option"
                onClick={() => setPurpose(p.value)}
              >
                <input
                  type="radio"
                  name="channel-purpose"
                  checked={purpose === p.value}
                  onChange={() => setPurpose(p.value)}
                />
                <span className="channel-purpose-icon">{p.icon(15)}</span>
                <span>
                  <div className="channel-purpose-label">{p.label}</div>
                  <div className="channel-purpose-desc">{p.description}</div>
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="form-field">
          <label>Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={{ background: "var(--bg-input)", color: "var(--text-normal)", border: "none", borderRadius: 4, padding: "8px 10px" }}
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {type === "TEXT" && (
          <div className="form-field">
            <label>Topic (optional)</label>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={1024} placeholder="What's this channel about?" />
          </div>
        )}

        <button className="btn btn-primary" type="submit" disabled={loading || !name}>
          {loading ? "Working…" : isEdit ? "Save Changes" : "Create Channel"}
        </button>
        {isEdit && (
          <button type="button" className="btn btn-danger" style={{ marginTop: 8 }} onClick={onDelete} disabled={loading}>
            Delete Channel
          </button>
        )}
      </form>
    </div>
  );
}
