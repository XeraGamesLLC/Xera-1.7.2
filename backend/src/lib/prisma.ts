import { PrismaClient } from "@prisma/client";

// Prisma parameterizes every query it generates, which is the primary
// SQL-injection defense for this whole app — raw string concatenation into
// SQL is never used anywhere in the codebase (see CHECKLIST.md security notes).
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
