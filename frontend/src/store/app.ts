import { create } from "zustand";

export interface Role {
  id: string;
  guildId: string;
  name: string;
  color: number;
  position: number;
  permissions: string;
  hoist: boolean;
  mentionable: boolean;
  isDefault: boolean;
}

export interface ChannelOverwrite {
  id: string;
  targetType: "ROLE" | "MEMBER";
  targetId: string;
  allow: string;
  deny: string;
}

export interface Channel {
  id: string;
  guildId: string | null;
  categoryId: string | null;
  type: "TEXT" | "VOICE" | "DM" | "GROUP_DM";
  name: string;
  topic: string | null;
  position: number;
  slowmodeSeconds: number;
  isNsfw: boolean;
  overwrites?: ChannelOverwrite[];
  members?: { userId: string; user: PublicUser }[];
}

export interface Category {
  id: string;
  name: string;
  position: number;
  channels: Channel[];
}

export interface Guild {
  id: string;
  name: string;
  iconUrl: string | null;
  ownerId: string;
  categories?: Category[];
  channels?: Channel[]; // channels without a category
  roles?: Role[];
}

export interface PublicUser {
  id: string;
  username: string;
  discriminator: string;
  avatarUrl: string | null;
  status: string;
  customStatus?: string | null;
}

export interface Member {
  id: string;
  userId: string;
  nickname: string | null;
  isTimedOut: boolean;
  timeoutUntil: string | null;
  user: PublicUser;
  roles: Role[];
}

export interface Attachment {
  id: string;
  url: string;
  filename: string;
  contentType: string;
  size: number;
}

export interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
}

export interface MessageEmbed {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  replyToId: string | null;
  pinned: boolean;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  author: PublicUser;
  attachments: Attachment[];
  reactions: Reaction[];
  embeds: MessageEmbed[];
  replyTo?: Message | null;
}

interface AppState {
  guilds: Guild[];
  guildDetail: Record<string, Guild>;
  members: Record<string, Member[]>;
  messages: Record<string, Message[]>;
  typing: Record<string, Set<string>>;
  presence: Record<string, string>;
  dmChannels: Channel[];
  friends: PublicUser[];
  incomingRequests: any[];
  outgoingRequests: any[];
  activeGuildId: string | null;
  activeChannelId: string | null;
  mentionCounts: Record<string, number>;
  unreadChannelIds: Set<string>;

  setGuilds: (guilds: Guild[]) => void;
  upsertGuild: (guild: Guild) => void;
  removeGuild: (guildId: string) => void;
  setGuildDetail: (guildId: string, guild: Guild) => void;
  setMembers: (guildId: string, members: Member[]) => void;
  setMessages: (channelId: string, messages: Message[]) => void;
  prependMessages: (channelId: string, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (message: Message) => void;
  removeMessage: (channelId: string, messageId: string) => void;
  setTyping: (channelId: string, userId: string, active: boolean) => void;
  setPresence: (userId: string, status: string) => void;
  setDmChannels: (channels: Channel[]) => void;
  upsertDmChannel: (channel: Channel) => void;
  setFriends: (friends: PublicUser[]) => void;
  setIncomingRequests: (r: any[]) => void;
  setOutgoingRequests: (r: any[]) => void;
  setActiveGuild: (id: string | null) => void;
  setActiveChannel: (id: string | null) => void;
  setMentionCount: (channelId: string, count: number) => void;
  clearMentionCount: (channelId: string) => void;
  incrementMentionCount: (channelId: string) => void;
  markUnread: (channelId: string) => void;
  clearUnread: (channelId: string) => void;
  addChannel: (channel: Channel) => void;
  updateChannel: (channel: Channel) => void;
  removeChannel: (guildId: string, channelId: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  guilds: [],
  guildDetail: {},
  members: {},
  messages: {},
  typing: {},
  presence: {},
  dmChannels: [],
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
  activeGuildId: null,
  activeChannelId: null,
  mentionCounts: {},
  unreadChannelIds: new Set(),

  setGuilds: (guilds) => set({ guilds }),
  upsertGuild: (guild) =>
    set((s) => ({
      guilds: s.guilds.some((g) => g.id === guild.id)
        ? s.guilds.map((g) => (g.id === guild.id ? { ...g, ...guild } : g))
        : [...s.guilds, guild],
    })),
  removeGuild: (guildId) =>
    set((s) => ({
      guilds: s.guilds.filter((g) => g.id !== guildId),
      activeGuildId: s.activeGuildId === guildId ? null : s.activeGuildId,
    })),
  setGuildDetail: (guildId, guild) => set((s) => ({ guildDetail: { ...s.guildDetail, [guildId]: guild } })),
  setMembers: (guildId, members) => set((s) => ({ members: { ...s.members, [guildId]: members } })),

  setMessages: (channelId, messages) => set((s) => ({ messages: { ...s.messages, [channelId]: messages } })),
  prependMessages: (channelId, older) =>
    set((s) => ({ messages: { ...s.messages, [channelId]: [...older, ...(s.messages[channelId] ?? [])] } })),
  addMessage: (message) =>
    set((s) => {
      const existing = s.messages[message.channelId] ?? [];
      if (existing.some((m) => m.id === message.id)) return s;
      return { messages: { ...s.messages, [message.channelId]: [...existing, message] } };
    }),
  updateMessage: (message) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [message.channelId]: (s.messages[message.channelId] ?? []).map((m) => (m.id === message.id ? message : m)),
      },
    })),
  removeMessage: (channelId, messageId) =>
    set((s) => ({
      messages: { ...s.messages, [channelId]: (s.messages[channelId] ?? []).filter((m) => m.id !== messageId) },
    })),

  setTyping: (channelId, userId, active) =>
    set((s) => {
      const current = new Set(s.typing[channelId] ?? []);
      if (active) current.add(userId);
      else current.delete(userId);
      return { typing: { ...s.typing, [channelId]: current } };
    }),

  setPresence: (userId, status) => set((s) => ({ presence: { ...s.presence, [userId]: status } })),

  setDmChannels: (channels) => set({ dmChannels: channels }),
  upsertDmChannel: (channel) =>
    set((s) => ({
      dmChannels: s.dmChannels.some((c) => c.id === channel.id)
        ? s.dmChannels.map((c) => (c.id === channel.id ? channel : c))
        : [channel, ...s.dmChannels],
    })),

  setFriends: (friends) => set({ friends }),
  setIncomingRequests: (incomingRequests) => set({ incomingRequests }),
  setOutgoingRequests: (outgoingRequests) => set({ outgoingRequests }),

  setActiveGuild: (activeGuildId) => set({ activeGuildId }),
  setActiveChannel: (activeChannelId) => set({ activeChannelId }),

  setMentionCount: (channelId, count) => set((s) => ({ mentionCounts: { ...s.mentionCounts, [channelId]: count } })),
  clearMentionCount: (channelId) => set((s) => ({ mentionCounts: { ...s.mentionCounts, [channelId]: 0 } })),
  incrementMentionCount: (channelId) =>
    set((s) => ({ mentionCounts: { ...s.mentionCounts, [channelId]: (s.mentionCounts[channelId] ?? 0) + 1 } })),
  markUnread: (channelId) =>
    set((s) => {
      if (s.activeChannelId === channelId) return s;
      const next = new Set(s.unreadChannelIds);
      next.add(channelId);
      return { unreadChannelIds: next };
    }),
  clearUnread: (channelId) =>
    set((s) => {
      if (!s.unreadChannelIds.has(channelId)) return s;
      const next = new Set(s.unreadChannelIds);
      next.delete(channelId);
      return { unreadChannelIds: next };
    }),

  addChannel: (channel) =>
    set((s) => {
      if (!channel.guildId) return s;
      const guild = s.guildDetail[channel.guildId];
      if (!guild) return s;
      if (channel.categoryId) {
        const categories = (guild.categories ?? []).map((c) =>
          c.id === channel.categoryId ? { ...c, channels: [...c.channels, channel] } : c
        );
        return { guildDetail: { ...s.guildDetail, [channel.guildId]: { ...guild, categories } } };
      }
      return {
        guildDetail: { ...s.guildDetail, [channel.guildId]: { ...guild, channels: [...(guild.channels ?? []), channel] } },
      };
    }),
  updateChannel: (channel) =>
    set((s) => {
      if (!channel.guildId) return s;
      const guild = s.guildDetail[channel.guildId];
      if (!guild) return s;
      const categories = (guild.categories ?? []).map((c) => ({
        ...c,
        channels: c.channels.map((ch) => (ch.id === channel.id ? channel : ch)),
      }));
      const channels = (guild.channels ?? []).map((ch) => (ch.id === channel.id ? channel : ch));
      return { guildDetail: { ...s.guildDetail, [channel.guildId]: { ...guild, categories, channels } } };
    }),
  removeChannel: (guildId, channelId) =>
    set((s) => {
      const guild = s.guildDetail[guildId];
      if (!guild) return s;
      const categories = (guild.categories ?? []).map((c) => ({
        ...c,
        channels: c.channels.filter((ch) => ch.id !== channelId),
      }));
      const channels = (guild.channels ?? []).filter((ch) => ch.id !== channelId);
      return { guildDetail: { ...s.guildDetail, [guildId]: { ...guild, categories, channels } } };
    }),
}));

export function getGuildChannels(guild: Guild): Channel[] {
  const fromCategories = (guild.categories ?? []).flatMap((c) => c.channels);
  return [...(guild.channels ?? []), ...fromCategories];
}
