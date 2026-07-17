// Mirrors backend/src/utils/permissions.ts — kept in sync manually since
// frontend and backend are separate deploy units. Used only for UI gating
// (hide buttons the user can't use); the backend re-checks everything
// server-side regardless, so this is not a trust boundary.
export const Permissions = {
  CREATE_INSTANT_INVITE: 1n << 0n,
  KICK_MEMBERS: 1n << 1n,
  BAN_MEMBERS: 1n << 2n,
  ADMINISTRATOR: 1n << 3n,
  MANAGE_CHANNELS: 1n << 4n,
  MANAGE_GUILD: 1n << 5n,
  ADD_REACTIONS: 1n << 6n,
  VIEW_AUDIT_LOG: 1n << 7n,
  VIEW_CHANNEL: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  MANAGE_MESSAGES: 1n << 13n,
  EMBED_LINKS: 1n << 14n,
  ATTACH_FILES: 1n << 15n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  MENTION_EVERYONE: 1n << 17n,
  USE_EXTERNAL_EMOJIS: 1n << 18n,
  CONNECT: 1n << 20n,
  SPEAK: 1n << 21n,
  MUTE_MEMBERS: 1n << 22n,
  DEAFEN_MEMBERS: 1n << 23n,
  MOVE_MEMBERS: 1n << 24n,
  CHANGE_NICKNAME: 1n << 26n,
  MANAGE_NICKNAMES: 1n << 27n,
  MANAGE_ROLES: 1n << 28n,
  MANAGE_EMOJIS: 1n << 29n,
  MODERATE_MEMBERS: 1n << 30n,
} as const;

export type PermissionFlag = keyof typeof Permissions;

export function combineRolePermissions(permissions: string[]): bigint {
  return permissions.reduce((acc, p) => acc | BigInt(p), 0n);
}

export function hasPermission(bitfield: bigint, flag: PermissionFlag): boolean {
  if ((bitfield & Permissions.ADMINISTRATOR) === Permissions.ADMINISTRATOR) return true;
  return (bitfield & Permissions[flag]) === Permissions[flag];
}
