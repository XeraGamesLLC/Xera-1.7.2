import type { PrimaryGuild } from "../../store/app";

// Mirrors Discord's real Server Tag badge: the tag text on a small pill,
// tinted with the color the server admin chose. Renders nothing if the
// user hasn't selected a tag, or the server that owned it no longer has one.
export default function ServerTagBadge({ guild }: { guild: PrimaryGuild | null | undefined }) {
  if (!guild?.tag) return null;
  const color = guild.tagColor ?? "#5865F2";
  return (
    <span className="server-tag-badge" style={{ borderColor: color, color }} title={guild.name}>
      {guild.tag}
    </span>
  );
}
