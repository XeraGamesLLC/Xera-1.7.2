import { useAuthStore } from "../../store/auth";
import { useUiStore } from "../../store/ui";
import Avatar from "../common/Avatar";

export default function UserPanel() {
  const user = useAuthStore((s) => s.user);
  const openModal = useUiStore((s) => s.openModal);
  if (!user) return null;

  return (
    <div className="user-panel">
      <Avatar url={user.avatarUrl} name={user.username} size={32} status={user.status} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--header-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user.username}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user.customStatus || `#${user.discriminator}`}
        </div>
      </div>
      <button className="icon-btn" title="User Settings" onClick={() => openModal("user-settings")}>
        ⚙
      </button>
    </div>
  );
}
