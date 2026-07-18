// The platform's single hardcoded super-admin identity. username+discriminator
// is a safe, stable key for this: neither field is ever editable post-registration
// (see validators/user.schema.ts — updateProfileSchema only allows aboutMe/
// customStatus), so unlike an email or a client-supplied flag, this pairing
// can't be renamed into or spoofed by another account.
const SUPER_ADMIN_USERNAME = "Juelz";
const SUPER_ADMIN_DISCRIMINATOR = "1519";

export function isSuperAdminIdentity(user: { username: string; discriminator: string }): boolean {
  return user.username === SUPER_ADMIN_USERNAME && user.discriminator === SUPER_ADMIN_DISCRIMINATOR;
}
