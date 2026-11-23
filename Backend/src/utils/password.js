import argon2 from "argon2";

const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;

export function validatePassword(password) {
  if (typeof password !== "string") {
    return {
      valid: false,
      message: "Password must be a string."
    };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      message: `Password must contain at least ${PASSWORD_MIN_LENGTH} characters.`
    };
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return {
      valid: false,
      message: `Password cannot exceed ${PASSWORD_MAX_LENGTH} characters.`
    };
  }

  return { valid: true };
}

export async function hashPassword(password) {
  const validation = validatePassword(password);

  if (!validation.valid) {
    throw new Error(validation.message);
  }

  return argon2.hash(password, {
    type: argon2.argon2id
  });
}

export async function verifyPassword(password, passwordHash) {
  if (
    typeof password !== "string" ||
    typeof passwordHash !== "string" ||
    !passwordHash.startsWith("$argon2id$")
  ) {
    return false;
  }

  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
}
