import { StatusIcon } from "./Icon";

interface AvatarProps {
  url?: string | null;
  name: string;
  size?: number;
  status?: string;
}

export default function Avatar({ url, name, size = 32, status }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const dotSize = Math.max(10, Math.round(size * 0.32));
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {url ? <img src={url} alt="" width={size} height={size} style={{ borderRadius: "50%" }} /> : initial}
      {status && (
        <span className="status-dot">
          <StatusIcon status={status} size={dotSize} />
        </span>
      )}
    </span>
  );
}
