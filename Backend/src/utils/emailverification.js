import { randomBytes, createHash } from "node:crypto";

const TOKEN_BYTES = 32;
const TOKEN_EXPIRY_MINUTES = 30;

/**
 * Generate a cryptographically secure email verification token.
 * Store the hash in the database, not the raw token.
 */
export function generateEmailVerificationToken() {
  const token = randomBytes(TOKEN_BYTES).toString("hex");

  const tokenHash = createHash("sha256")
    .update(token)
    .digest("hex");

  const expiresAt = new Date(
    Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000
  );

  return {
    token,
    tokenHash,
    expiresAt
  };
}

/**
 * Hash a verification token received from the user.
 * Compare the resulting hash with the value stored in MongoDB.
 */
export function hashEmailVerificationToken(token) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
    throw new Error("Invalid email verification token.");
  }

  return createHash("sha256")
    .update(token)
    .digest("hex");
}
