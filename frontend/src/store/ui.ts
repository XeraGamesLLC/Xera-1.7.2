import { create } from "zustand";

export type MobilePanel = "servers" | "channels" | "chat" | "members";

interface UiState {
  mobilePanel: MobilePanel;
  isMemberListOpen: boolean;
  activeModal: string | null;
  modalProps: Record<string, unknown>;
  setMobilePanel: (panel: MobilePanel) => void;
  toggleMemberList: () => void;
  openModal: (name: string, props?: Record<string, unknown>) => void;
  closeModal: () => void;
}

// Landing directly on a specific destination (a channel, a DM, friends,
// discovery - anything but the bare server-picker) should start already
// showing that destination's chat view, not the sidebar. Getting this
// right on the very first render matters: the alternative was correcting
// it a tick later from a mount effect in each view, which always painted
// one frame with the sidebar open first - invisible on a fast dev reload,
// but a real, visible flash-then-cover on a slower phone, since the
// sidebar's own CSS transition then animates shut *over* the freshly
// revealed header instead of never having opened at all.
function initialMobilePanel(): MobilePanel {
  if (typeof window === "undefined") return "servers";
  const path = window.location.pathname;
  const isBareServerPicker = /^\/app\/guilds\/[^/]+$/.test(path);
  const hasDestination =
    path === "/app/friends" ||
    path === "/app/discovery" ||
    path.startsWith("/app/dms/") ||
    (path.startsWith("/app/guilds/") && !isBareServerPicker);
  return hasDestination ? "chat" : "servers";
}

export const useUiStore = create<UiState>((set) => ({
  mobilePanel: initialMobilePanel(),
  isMemberListOpen: false,
  activeModal: null,
  modalProps: {},
  setMobilePanel: (mobilePanel) => set({ mobilePanel }),
  toggleMemberList: () => set((s) => ({ isMemberListOpen: !s.isMemberListOpen })),
  openModal: (activeModal, modalProps = {}) => set({ activeModal, modalProps }),
  closeModal: () => set({ activeModal: null, modalProps: {} }),
}));
