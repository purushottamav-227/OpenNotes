import User from "../models/User.js";
import College from "../models/College.js";

import {
  hashPassword,
  verifyPassword
} from "../utils/password.js";

import { generateAccessToken } from "../utils/token.js";

import {
  generateEmailVerificationToken,
  hashEmailVerificationToken
} from "../utils/emailverification.js";

import {
  generatePasswordResetToken,
  hashPasswordResetToken
} from "../utils/passwordReset.js";

import {
  sendVerificationEmail,
  sendPasswordResetEmail
} from "./email.service.js";


function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}


/* =========================================================
   REGISTER USER
========================================================= */

export async function registerUser({
  name,
  email,
  password,
  collegeId
}) {
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.exists({
    email: normalizedEmail
  });

  if (existingUser) {
    throw createError(
      "An account with this email already exists.",
      409
    );
  }

  let selectedCollege = null;

  if (collegeId) {
    selectedCollege = await College.findOne({
      _id: collegeId,
      isActive: true,
      verificationStatus: "verified"
    })
      .select("_id")
      .lean();

    if (!selectedCollege) {
      throw createError(
        "The selected college does not exist or is not verified.",
        400
      );
    }
  }

  const passwordHash = await hashPassword(password);

  const {
    token,
    tokenHash,
    expiresAt
  } = generateEmailVerificationToken();

  let user;

  try {
    user = await User.create({
      name,
      email: normalizedEmail,
      passwordHash,

      // Public registration can only create students.
      role: "student",

      collegeId: selectedCollege?._id ?? null,

      collegeAffiliationStatus: selectedCollege
        ? "pending"
        : "not_provided",

      emailVerified: false,

      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: expiresAt,

      teacherApprovalStatus: "not_applicable",

      authProvider: "local",
      sessionVersion: 0
    });
  } catch (error) {
    if (
      error.code === 11000 &&
      error.keyPattern?.email
    ) {
      throw createError(
        "An account with this email already exists.",
        409
      );
    }

    throw error;
  }

  try {
    await sendVerificationEmail({
      email: user.email,
      token
    });
  } catch (error) {
    console.error(
      "Verification email delivery failed:",
      error.message
    );

    // The account remains unverified.
    // The raw verification token is never returned.
    throw createError(
      "Your account was created, but the verification email could not be sent. Please try again later.",
      503
    );
  }

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    collegeId: user.collegeId,
    collegeAffiliationStatus:
      user.collegeAffiliationStatus,
    emailVerified: user.emailVerified,
    message:
      "Registration successful. Please check your email to verify your account."
  };
}


/* =========================================================
   LOGIN USER
========================================================= */

export async function loginUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({
    email: normalizedEmail
  }).select("+passwordHash +sessionVersion");

  // Use the same error for unknown email and wrong password.
  if (
    !user ||
    !user.passwordHash ||
    !(await verifyPassword(password, user.passwordHash))
  ) {
    throw createError(
      "Invalid email or password.",
      401
    );
  }

  if (!user.isActive) {
    throw createError(
      "This account is inactive.",
      403
    );
  }

  if (!user.emailVerified) {
    const error = createError(
      "Please verify your email address before logging in.",
      403
    );

    error.code = "EMAIL_NOT_VERIFIED";

    throw error;
  }

  // Important: sessionVersion is explicitly selected above.
  // The generated JWT must contain the actual database value.
  const accessToken = await generateAccessToken(user);

  user.lastLoginAt = new Date();

  await user.save();

  return {
    accessToken,
    tokenType: "Bearer",
    expiresIn: 900,

    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      collegeId: user.collegeId,
      emailVerified: user.emailVerified,
      collegeAffiliationStatus:
        user.collegeAffiliationStatus,
      teacherApprovalStatus:
        user.teacherApprovalStatus
    }
  };
}


/* =========================================================
   VERIFY EMAIL
========================================================= */

export async function verifyUserEmail(token) {
  let tokenHash;

  try {
    tokenHash = hashEmailVerificationToken(token);
  } catch {
    throw createError(
      "Invalid or expired verification link.",
      400
    );
  }

  const user = await User.findOne({
    emailVerificationTokenHash: tokenHash,
    emailVerificationExpiresAt: {
      $gt: new Date()
    },
    emailVerified: false,
    isActive: true
  }).select(
    "+emailVerificationTokenHash +emailVerificationExpiresAt"
  );

  if (!user) {
    throw createError(
      "Invalid or expired verification link.",
      400
    );
  }

  user.emailVerified = true;

  user.emailVerificationTokenHash = null;
  user.emailVerificationExpiresAt = null;

  // The verified email proves control of the address. If its domain is one
  // of the selected college's registered domains, the affiliation is
  // confirmed. Otherwise it stays "pending" for manual review.
  if (user.collegeId && user.collegeAffiliationStatus === "pending") {
    const college = await College.findOne({
      _id: user.collegeId,
      isActive: true,
      verificationStatus: "verified"
    })
      .select("domains")
      .lean();

    const emailDomain = user.email.split("@").pop().toLowerCase();

    if (college?.domains?.includes(emailDomain)) {
      user.collegeAffiliationStatus = "verified";
    }
  }

  await user.save();

  return {
    email: user.email,
    emailVerified: user.emailVerified
  };
}


/* =========================================================
   RESEND VERIFICATION EMAIL
========================================================= */

export async function resendVerificationEmail({ email }) {
  const normalizedEmail = email.trim().toLowerCase();

  const genericResponse = {
    message:
      "If an eligible account exists, a verification email will be sent."
  };

  const user = await User.findOne({
    email: normalizedEmail
  });

  if (!user || !user.isActive || user.emailVerified) {
    return genericResponse;
  }

  const {
    token,
    tokenHash,
    expiresAt
  } = generateEmailVerificationToken();

  user.emailVerificationTokenHash = tokenHash;
  user.emailVerificationExpiresAt = expiresAt;

  await user.save();

  try {
    await sendVerificationEmail({
      email: user.email,
      token
    });
  } catch (error) {
    console.error(
      "Resend verification email delivery failed:",
      error.message
    );

    throw createError(
      "Unable to send the verification email right now. Please try again later.",
      503
    );
  }

  return genericResponse;
}


/* =========================================================
   REQUEST PASSWORD RESET
========================================================= */

export async function requestPasswordReset({ email }) {
  const normalizedEmail = email.trim().toLowerCase();

  const genericResponse = {
    message:
      "If an eligible account exists, password reset instructions will be sent."
  };

  const user = await User.findOne({
    email: normalizedEmail,
    isActive: true,
    authProvider: "local"
  });

  // Do not reveal whether an account exists.
  if (!user) {
    return genericResponse;
  }

  const {
    token,
    tokenHash,
    expiresAt
  } = generatePasswordResetToken();

  user.passwordResetTokenHash = tokenHash;
  user.passwordResetExpiresAt = expiresAt;

  await user.save();

  try {
    await sendPasswordResetEmail({
      email: user.email,
      token
    });
  } catch (error) {
    console.error(
      "Password reset email delivery failed:",
      error.message
    );

    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;

    await user.save();

    throw createError(
      "Unable to send password reset instructions right now. Please try again later.",
      503
    );
  }

  return genericResponse;
}


/* =========================================================
   RESET PASSWORD
========================================================= */

export async function resetPassword({
  token,
  newPassword
}) {
  let tokenHash;

  try {
    tokenHash = hashPasswordResetToken(token);
  } catch {
    throw createError(
      "The password reset link is invalid or has expired.",
      400
    );
  }

  const passwordHash = await hashPassword(newPassword);

  /*
   * Atomic operation:
   *
   * 1. Match the hashed reset token.
   * 2. Check that it has not expired.
   * 3. Check that the account is active and local.
   * 4. Change the password.
   * 5. Remove the reset token.
   * 6. Increment sessionVersion.
   *
   * Only one concurrent request can successfully consume
   * this reset token.
   */

  const updatedUser = await User.findOneAndUpdate(
    {
      passwordResetTokenHash: tokenHash,

      passwordResetExpiresAt: {
        $gt: new Date()
      },

      isActive: true,
      authProvider: "local"
    },
    {
      $set: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null
      },

      $inc: {
        sessionVersion: 1
      }
    },
    {
      new: true,
      runValidators: true
    }
  ).select("_id");

  if (!updatedUser) {
    throw createError(
      "The password reset link is invalid or has expired.",
      400
    );
  }

  return {
    message:
      "Password reset successfully. All existing sessions have been invalidated. You can now log in."
  };
}


/* =========================================================
   LOGOUT ALL DEVICES
========================================================= */

export async function revokeAllUserSessions(userId) {
  const user = await User.findOneAndUpdate(
    {
      _id: userId,
      isActive: true
    },
    {
      $inc: {
        sessionVersion: 1
      }
    },
    {
      new: true
    }
  ).select("_id");

  if (!user) {
    throw createError(
      "Your account is unavailable. Please log in again.",
      401
    );
  }

  return {
    message:
      "You have been logged out from all devices. Please log in again to continue."
  };
}