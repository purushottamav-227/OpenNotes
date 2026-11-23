
import { randomBytes, createHash } from "node:crypto";

const TOKEN_BYTES = 32;
const TOKEN_EXPIRY_MINUTES = 30;

export function generatePasswordResetToken() {
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

export function hashPasswordResetToken(token) {
  if (
    typeof token !== "string" ||
    !/^[a-f0-9]{64}$/i.test(token)
  ) {
    throw new Error("Invalid password reset token.");
  }

  return createHash("sha256")
    .update(token)
    .digest("hex");
}
