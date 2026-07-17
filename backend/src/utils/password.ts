import argon2 from "argon2";

// argon2id is the OWASP-recommended default: resistant to both GPU cracking
// (unlike bcrypt/sha) and side-channel attacks (unlike argon2i alone).
const HASH_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // ~19 MB, OWASP minimum recommendation
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, HASH_OPTIONS);
}

export function verifyPassword(hash: string, plain: string): Promise<boolean> {
  return argon2.verify(hash, plain);
}

const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 128,
};

export function validatePasswordStrength(password: string): string | null {
  if (password.length < PASSWORD_RULES.minLength) {
    return `Password must be at least ${PASSWORD_RULES.minLength} characters`;
  }
  if (password.length > PASSWORD_RULES.maxLength) {
    return `Password must be at most ${PASSWORD_RULES.maxLength} characters`;
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must contain uppercase, lowercase, and a number";
  }
  return null;
}
