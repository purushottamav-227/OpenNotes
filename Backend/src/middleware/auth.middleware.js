import User from "../models/User.js";
import { verifyAccessToken } from "../utils/token.js";


const JWT_ERROR_NAMES = new Set([
  "JWTExpired",
  "JWTClaimValidationFailed",
  "JWSSignatureVerificationFailed",
  "JWSInvalid",
  "JWTInvalid",
  "JWTMalformed",
  "JWKSNoMatchingKey"
]);

const JWT_ERROR_CODES = new Set([
  "ERR_JWT_EXPIRED",
  "ERR_JWS_INVALID",
  "ERR_JWT_INVALID",
  "ERR_JWT_CLAIM_VALIDATION_FAILED",
  "ERR_JWS_SIGNATURE_VERIFICATION_FAILED"
]);


/* =========================================================
   AUTHENTICATE USER
========================================================= */

export async function authenticateUser(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (
      typeof authorization !== "string" ||
      !authorization.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    const token = authorization
      .slice("Bearer ".length)
      .trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    // Verify JWT signature, expiry, issuer and audience.
    const payload = await verifyAccessToken(token);

    if (
      typeof payload.sub !== "string" ||
      !/^[a-f\d]{24}$/i.test(payload.sub)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token."
      });
    }

    // Fetch live user data from MongoDB.
    // sessionVersion is select:false in the User schema,
    // so explicitly select it here.
    const user = await User.findById(payload.sub)
      .select("_id role isActive +sessionVersion");

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message:
          "Your account is unavailable. Please log in again."
      });
    }

    const tokenSessionVersion =
      typeof payload.sv === "number" &&
      Number.isInteger(payload.sv) &&
      payload.sv >= 0
        ? payload.sv
        : 0;

    const currentSessionVersion =
      Number.isInteger(user.sessionVersion) &&
      user.sessionVersion >= 0
        ? user.sessionVersion
        : 0;

    // Exact comparison prevents tokens with unexpected
    // session versions from being accepted.
    if (tokenSessionVersion !== currentSessionVersion) {
      return res.status(401).json({
        success: false,
        message:
          "Your session has expired. Please log in again."
      });
    }

    // Always use the current role from MongoDB.
    req.auth = {
      userId: user._id.toString(),
      role: user.role
    };

    return next();
  } catch (error) {
    if (
      JWT_ERROR_NAMES.has(error?.name) ||
      JWT_ERROR_CODES.has(error?.code) ||
      error?.name === "CastError"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid or expired authentication token."
      });
    }

    return next(error);
  }
}


/* =========================================================
   ROLE AUTHORIZATION
========================================================= */

export function requireRole(...allowedRoles) {
  return function roleAuthorization(req, res, next) {
    if (!req.auth) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access this resource."
      });
    }

    return next();
  };
}