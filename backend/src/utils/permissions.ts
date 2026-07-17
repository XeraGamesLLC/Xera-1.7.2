/**
 * Discord-style permission bitfield. Each flag is a bit in a BigInt so a
 * role's (or overwrite's) permission set is a single integer, exactly like
 * old Discord. VOICE-prefixed flags are defined now so the schema/UI don't
 * need to change when voice channels get real audio in a later phase.
 */
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
  CONNECT: 1n << 20n, // voice, stubbed
  SPEAK: 1n << 21n, // voice, stubbed
  MUTE_MEMBERS: 1n << 22n, // voice, stubbed
  DEAFEN_MEMBERS: 1n << 23n, // voice, stubbed
  MOVE_MEMBERS: 1n << 24n, // voice, stubbed
  CHANGE_NICKNAME: 1n << 26n,
  MANAGE_NICKNAMES: 1n << 27n,
  MANAGE_ROLES: 1n << 28n,
  MANAGE_EMOJIS: 1n << 29n,
  MODERATE_MEMBERS: 1n << 30n, // timeout
} as const;

export type PermissionFlag = keyof typeof Permissions;

export const DEFAULT_EVERYONE_PERMISSIONS =
  Permissions.VIEW_CHANNEL |
  Permissions.SEND_MESSAGES |
  Permissions.READ_MESSAGE_HISTORY |
  Permissions.ADD_REACTIONS |
  Permissions.CREATE_INSTANT_INVITE |
  Permissions.EMBED_LINKS |
  Permissions.ATTACH_FILES |
  Permissions.USE_EXTERNAL_EMOJIS |
  Permissions.CHANGE_NICKNAME |
  Permissions.CONNECT |
  Permissions.SPEAK;

export function combine(...flags: bigint[]): bigint {
  return flags.reduce((acc, f) => acc | f, 0n);
}

export function has(bitfield: bigint, flag: bigint): boolean {
  if ((bitfield & Permissions.ADMINISTRATOR) === Permissions.ADMINISTRATOR) return true;
  return (bitfield & flag) === flag;
}

/** Union of permissions from every role a member has, OR'd together. */
export function computeBasePermissions(rolePermissions: bigint[]): bigint {
  return rolePermissions.reduce((acc, p) => acc | p, 0n);
}

/**
 * Applies channel-level permission overwrites on top of a member's base
 * (guild-role-derived) permissions: @everyone overwrite first, then role
 * overwrites, then the member-specific overwrite — matching Discord's
 * documented resolution order. Administrators bypass overwrites entirely.
 */
export function computeChannelPermissions(
  basePermissions: bigint,
  overwrites: { targetType: "ROLE" | "MEMBER"; targetId: string; allow: bigint; deny: bigint }[],
  memberRoleIds: string[],
  everyoneRoleId: string,
  userId: string
): bigint {
  if ((basePermissions & Permissions.ADMINISTRATOR) === Permissions.ADMINISTRATOR) {
    return basePermissions;
  }

  let permissions = basePermissions;

  const everyoneOverwrite = overwrites.find(
    (o) => o.targetType === "ROLE" && o.targetId === everyoneRoleId
  );
  if (everyoneOverwrite) {
    permissions = (permissions & ~everyoneOverwrite.deny) | everyoneOverwrite.allow;
  }

  let roleAllow = 0n;
  let roleDeny = 0n;
  for (const o of overwrites) {
    if (o.targetType === "ROLE" && memberRoleIds.includes(o.targetId) && o.targetId !== everyoneRoleId) {
      roleAllow |= o.allow;
      roleDeny |= o.deny;
    }
  }
  permissions = (permissions & ~roleDeny) | roleAllow;

  const memberOverwrite = overwrites.find((o) => o.targetType === "MEMBER" && o.targetId === userId);
  if (memberOverwrite) {
    permissions = (permissions & ~memberOverwrite.deny) | memberOverwrite.allow;
  }

  return permissions;
}
