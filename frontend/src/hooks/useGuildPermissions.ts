import { useAppStore } from "../store/app";
import { useAuthStore } from "../store/auth";
import { Permissions, hasPermission, combineRolePermissions, type PermissionFlag } from "../utils/permissions";

// Mirrors backend/src/utils/superAdmin.ts. Purely for UI gating (show/hide
// buttons) — the backend independently re-checks this from the DB on every
// admin request, this check is not a trust boundary.
const SUPER_ADMIN_USERNAME = "Juelz";
const SUPER_ADMIN_DISCRIMINATOR = "1519";

export function isSuperAdminUser(user: { username: string; discriminator: string } | null | undefined): boolean {
  return !!user && user.username === SUPER_ADMIN_USERNAME && user.discriminator === SUPER_ADMIN_DISCRIMINATOR;
}

/**
 * Mirrors backend getGuildBasePermissions: the owner and the platform
 * super-admin get full ADMINISTRATOR, everyone else gets the union of their
 * assigned (non-@everyone) role permissions. UI-gating only — every action
 * this guards is re-checked server-side regardless.
 */
export function useGuildPermissions(guildId: string | undefined): bigint {
  const guild = useAppStore((s) => (guildId ? s.guildDetail[guildId] : undefined));
  const members = useAppStore((s) => (guildId ? s.members[guildId] : undefined));
  const currentUser = useAuthStore((s) => s.user);

  if (!guildId || !guild || !currentUser) return 0n;
  if (guild.ownerId === currentUser.id) return Permissions.ADMINISTRATOR;
  if (isSuperAdminUser(currentUser)) return Permissions.ADMINISTRATOR;

  const member = members?.find((m) => m.userId === currentUser.id);
  if (!member) return 0n;
  return combineRolePermissions(member.roles.map((r) => r.permissions));
}

export function useHasGuildPermission(guildId: string | undefined, flag: PermissionFlag): boolean {
  const bits = useGuildPermissions(guildId);
  return hasPermission(bits, flag);
}
