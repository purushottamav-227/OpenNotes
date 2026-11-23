import { SignJWT, jwtVerify } from "jose";
import env from "../config/env.js";

function getSecret() {
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 64) {
    throw new Error(
      "JWT_SECRET must contain at least 64 characters before authentication can be used."
    );
  }

  return new TextEncoder().encode(env.JWT_SECRET);
}

/**
 * Generate a short-lived access token (15 minutes).
 *
 * The sessionVersion is embedded so that incrementing it on the User
 * document immediately invalidates all previously issued tokens for
 * that account (logout, password-change, security events).
 */
export async function generateAccessToken(user) {
  return new SignJWT({
    role: user.role,
    sv: user.sessionVersion ?? 0
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user._id.toString())
    .setIssuedAt()
    .setExpirationTime("15m")
    .setIssuer("opennotes-api")
    .setAudience("opennotes-client")
    .sign(getSecret());
}

export async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(token, getSecret(), {
    algorithms: ["HS256"],
    issuer: "opennotes-api",
    audience: "opennotes-client"
  });

  return payload;
}
