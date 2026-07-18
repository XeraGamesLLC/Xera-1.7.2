import { prisma } from "../lib/prisma";
import { isSuperAdminIdentity } from "../utils/superAdmin";

export async function isSuperAdminUserId(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true, discriminator: true } });
  return !!user && isSuperAdminIdentity(user);
}
