import type { MessageEmbed } from "../../store/app";

export default function EmbedCard({ embed }: { embed: MessageEmbed }) {
  if (!embed.title && !embed.description && !embed.imageUrl) return null;

  let hostname = "";
  try {
    hostname = new URL(embed.url).hostname;
  } catch {
    hostname = embed.url;
  }

  return (
    <div className="embed-card">
      <div className="embed-card-body">
        <div className="embed-card-site">{embed.siteName || hostname}</div>
        {embed.title && (
          <a className="embed-card-title" href={embed.url} target="_blank" rel="noopener noreferrer">
            {embed.title}
          </a>
        )}
        {embed.description && <div className="embed-card-description">{embed.description}</div>}
      </div>
      {embed.imageUrl && <img className="embed-card-image" src={embed.imageUrl} alt="" loading="lazy" />}
    </div>
  );
}
