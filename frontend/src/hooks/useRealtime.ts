import { useEffect } from "react";
import { useAuthStore } from "../store/auth";
import { useAppStore, type Message } from "../store/app";
import { connectSocket, disconnectSocket } from "../api/socket";
import { getGuild, listMembers } from "../api/guilds";

/** Wires Socket.IO events into the global app store. Mounted once, at the app shell level. */
export function useRealtime() {
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!token || !userId) return;

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
      const s = useAppStore.getState();
      s.addMessage(message);
      if (message.authorId !== userId) {
        s.markUnread(message.channelId);
        // DM/group-DM channel rooms are all auto-joined at connect time
        // (unlike guild channels, which only reach here once opened this
        // session - see channel:activity below), so this is the one place
        // that reliably sees every new DM regardless of which one you have
        // open, which is what the red unread-count badge needs.
        if (s.dmChannels.some((c) => c.id === message.channelId)) {
          s.incrementDmUnread(message.channelId);
        }
      }
    }
    function onChannelActivity({ channelId, guildId, authorId }: { channelId: string; guildId: string; authorId: string }) {
      if (authorId === userId) return;
      const s = useAppStore.getState();
      s.registerChannelGuild(channelId, guildId);
      s.markUnread(channelId);
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
    function onCategoryCreate({ category }: { category: any }) {
      useAppStore.getState().addCategory(category.guildId, category);
    }
    function onReadStateUpdate(payload: { channelId: string; userId: string; lastReadMessageId: string }) {
      useAppStore.getState().setReadState(payload.channelId, payload.userId, payload.lastReadMessageId);
    }
    function onDmCreate({ channel }: { channel: any }) {
      // Lets a brand-new incoming DM (or being added to a group DM) show up
      // in the sidebar and count toward the unread badge immediately -
      // without this, onMessageCreate's dmChannels.some(...) check below
      // never recognizes the channel as one of "my" DMs until something
      // else happened to refetch the list (e.g. visiting Friends).
      useAppStore.getState().upsertDmChannel(channel);
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
    socket.on("category:create", onCategoryCreate);
    socket.on("read-state:update", onReadStateUpdate);
    socket.on("dm:create", onDmCreate);
    socket.on("channel:activity", onChannelActivity);
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
  }, [token, userId]);
}
