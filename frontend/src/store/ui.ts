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

export const useUiStore = create<UiState>((set) => ({
  mobilePanel: "servers",
  isMemberListOpen: false,
  activeModal: null,
  modalProps: {},
  setMobilePanel: (mobilePanel) => set({ mobilePanel }),
  toggleMemberList: () => set((s) => ({ isMemberListOpen: !s.isMemberListOpen })),
  openModal: (activeModal, modalProps = {}) => set({ activeModal, modalProps }),
  closeModal: () => set({ activeModal: null, modalProps: {} }),
}));
