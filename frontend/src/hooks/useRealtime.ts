import { useEffect } from "react";
import { useAuthStore } from "../store/auth";
import { useAppStore, type Message } from "../store/app";
import { connectSocket, disconnectSocket } from "../api/socket";
import { getGuild, listMembers } from "../api/guilds";

/** Wires Socket.IO events into the global app store. Mounted once, at the app shell level. */
export function useRealtime() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!accessToken || !userId) return;

    const socket = connectSocket();

    const typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

    async function refreshGuild(guildId: string) {
      try {
        const [guild, members] = await Promise.all([getGuild(guildId), listMembers(guildId)]);
        useAppStore.getState().setGuildDetail(guildId, guild);
        useAppStore.getState().setMembers(guildId, members);
      } catch {
        // guild may have been deleted/left concurrently — ignore
      }
    }

    function onMessageCreate(message: Message) {
      useAppStore.getState().addMessage(message);
      if (message.authorId !== userId) {
        useAppStore.getState().markUnread(message.channelId);
      }
    }
    function onMessageUpdate(message: Message) {
      useAppStore.getState().updateMessage(message);
    }
    function onMessageDelete({ channelId, id }: { channelId: string; id: string }) {
      useAppStore.getState().removeMessage(channelId, id);
    }
    function onReactionAdd(payload: { messageId: string; userId: string; emoji: string; id: string }) {
      const s = useAppStore.getState();
      for (const [channelId, msgs] of Object.entries(s.messages)) {
        const msg = msgs.find((m) => m.id === payload.messageId);
        if (msg) {
          const reactions = [...msg.reactions, { id: payload.id, messageId: payload.messageId, userId: payload.userId, emoji: payload.emoji }];
          s.updateMessage({ ...msg, reactions });
          break;
        }
        void channelId;
      }
    }
    function onReactionRemove(payload: { messageId: string; userId: string; emoji: string }) {
      const s = useAppStore.getState();
      for (const msgs of Object.values(s.messages)) {
        const msg = msgs.find((m) => m.id === payload.messageId);
        if (msg) {
          const reactions = msg.reactions.filter((r) => !(r.userId === payload.userId && r.emoji === payload.emoji));
          s.updateMessage({ ...msg, reactions });
          break;
        }
      }
    }
    function onTyping({ channelId, userId: typingUserId }: { channelId: string; userId: string }) {
      if (typingUserId === userId) return;
      useAppStore.getState().setTyping(channelId, typingUserId, true);
      const key = `${channelId}:${typingUserId}`;
      clearTimeout(typingTimeouts.get(key));
      typingTimeouts.set(
        key,
        setTimeout(() => useAppStore.getState().setTyping(channelId, typingUserId, false), 6000)
      );
    }
    function onPresence({ userId: uid, status }: { userId: string; status: string }) {
      useAppStore.getState().setPresence(uid, status);
    }
    function onMention({ channelId }: { channelId: string }) {
      useAppStore.getState().incrementMentionCount(channelId);
      useAppStore.getState().markUnread(channelId);
    }

    function onGuildUpdate({ guild }: { guild: any }) {
      useAppStore.getState().upsertGuild(guild);
    }
    function onGuildDelete({ guildId }: { guildId: string }) {
      useAppStore.getState().removeGuild(guildId);
    }
    function onKickedOrBanned({ guildId }: { guildId: string }) {
      useAppStore.getState().removeGuild(guildId);
    }
    function onChannelCreate({ channel }: { channel: any }) {
      useAppStore.getState().addChannel(channel);
    }
    function onChannelUpdate({ channel }: { channel: any }) {
      useAppStore.getState().updateChannel(channel);
    }
    function onChannelDelete({ channelId }: { channelId: string }) {
      const s = useAppStore.getState();
      if (s.activeGuildId) s.removeChannel(s.activeGuildId, channelId);
    }
    function onRoleOrMemberChange() {
      const guildId = useAppStore.getState().activeGuildId;
      if (guildId) refreshGuild(guildId);
    }
    function onMemberRemove() {
      onRoleOrMemberChange();
    }
    function onFriendEvent() {
      // FriendsView re-fetches on focus/interval; nothing to patch centrally here.
    }

    socket.on("message:create", onMessageCreate);
    socket.on("message:update", onMessageUpdate);
    socket.on("message:delete", onMessageDelete);
    socket.on("reaction:add", onReactionAdd);
    socket.on("reaction:remove", onReactionRemove);
    socket.on("typing:start", onTyping);
    socket.on("presence:update", onPresence);
    socket.on("notification:mention", onMention);
    socket.on("guild:update", onGuildUpdate);
    socket.on("guild:delete", onGuildDelete);
    socket.on("guild:kicked", onKickedOrBanned);
    socket.on("guild:banned", onKickedOrBanned);
    socket.on("channel:create", onChannelCreate);
    socket.on("channel:update", onChannelUpdate);
    socket.on("channel:delete", onChannelDelete);
    socket.on("role:create", onRoleOrMemberChange);
    socket.on("role:update", onRoleOrMemberChange);
    socket.on("role:delete", onRoleOrMemberChange);
    socket.on("member:role_update", onRoleOrMemberChange);
    socket.on("member:update", onRoleOrMemberChange);
    socket.on("member:timeout", onRoleOrMemberChange);
    socket.on("member:remove", onMemberRemove);
    socket.on("friend:request", onFriendEvent);
    socket.on("friend:accepted", onFriendEvent);
    socket.on("friend:removed", onFriendEvent);

    return () => {
      for (const t of typingTimeouts.values()) clearTimeout(t);
      disconnectSocket();
    };
  }, [accessToken, userId]);
}
