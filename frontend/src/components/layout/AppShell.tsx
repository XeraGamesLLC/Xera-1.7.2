import { useEffect } from "react";
import { Outlet, useParams } from "react-router-dom";
import ServerRail from "./ServerRail";
import ChannelSidebar from "./ChannelSidebar";
import MemberList from "./MemberList";
import ModalRoot from "../modals/ModalRoot";
import { useRealtime } from "../../hooks/useRealtime";
import { useUiStore } from "../../store/ui";
import { useAppStore } from "../../store/app";
import { listMyGuilds } from "../../api/guilds";
import { listDmChannels } from "../../api/dms";
import { listFriends, listIncoming, listOutgoing } from "../../api/friends";
import "../../styles/layout.css";

export default function AppShell() {
  useRealtime();
  const { guildId } = useParams();
  const mobilePanel = useUiStore((s) => s.mobilePanel);
  const isMemberListOpen = useUiStore((s) => s.isMemberListOpen);
  const setGuilds = useAppStore((s) => s.setGuilds);
  const setDmChannels = useAppStore((s) => s.setDmChannels);
  const setFriends = useAppStore((s) => s.setFriends);
  const setIncoming = useAppStore((s) => s.setIncomingRequests);
  const setOutgoing = useAppStore((s) => s.setOutgoingRequests);

  useEffect(() => {
    listMyGuilds().then(setGuilds).catch(() => undefined);
    listDmChannels().then(setDmChannels).catch(() => undefined);
    listFriends().then(setFriends).catch(() => undefined);
    listIncoming().then(setIncoming).catch(() => undefined);
    listOutgoing().then(setOutgoing).catch(() => undefined);
  }, []);

  const sidebarOpen = mobilePanel === "servers" || mobilePanel === "channels";

  return (
    <div className={`app-shell ${sidebarOpen ? "sidebar-open" : ""} ${isMemberListOpen ? "member-list-open" : ""}`}>
      <div className="sidebar-scrim" onClick={() => useUiStore.getState().setMobilePanel("chat")} />
      <ServerRail />
      <ChannelSidebar key={guildId ?? "dm"} />
      <Outlet />
      <MemberList />
      <ModalRoot />
    </div>
  );
}
