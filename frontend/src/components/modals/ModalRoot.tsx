import { useUiStore } from "../../store/ui";
import CreateServerModal from "./CreateServerModal";
import UserSettingsModal from "./UserSettingsModal";
import ServerSettingsModal from "./ServerSettingsModal";
import UserProfileModal from "./UserProfileModal";
import ChannelModal from "./ChannelModal";
import CreateCategoryModal from "./CreateCategoryModal";
import "../../styles/modals.css";

export default function ModalRoot() {
  const activeModal = useUiStore((s) => s.activeModal);
  const closeModal = useUiStore((s) => s.closeModal);
  const props = useUiStore((s) => s.modalProps);

  if (!activeModal) return null;

  function onOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) closeModal();
  }

  return (
    <div className="modal-overlay" onClick={onOverlayClick}>
      {activeModal === "create-server" && <CreateServerModal />}
      {activeModal === "user-settings" && <UserSettingsModal />}
      {activeModal === "server-settings" && <ServerSettingsModal guildId={props.guildId as string} />}
      {activeModal === "user-profile" && <UserProfileModal userId={props.userId as string} guildId={props.guildId as string | undefined} />}
      {activeModal === "channel-editor" && (
        <ChannelModal guildId={props.guildId as string} channel={props.channel as any} />
      )}
      {activeModal === "create-category" && <CreateCategoryModal guildId={props.guildId as string} />}
    </div>
  );
}
