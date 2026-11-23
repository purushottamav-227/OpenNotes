import {
  registerSchema,
  loginSchema
} from "../validators/auth.validator.js";

import {
  registerUser,
  loginUser,
  verifyUserEmail,
  resendVerificationEmail,
  requestPasswordReset,
  resetPassword,
  revokeAllUserSessions
} from "../services/auth.service.js";

import User from "../models/User.js";


function sendValidationError(res, message, issues) {
  return res.status(400).json({
    success: false,
    message,
    errors: issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message
    }))
  });
}


/* =========================================================
   REGISTER
========================================================= */

export async function registerController(req, res, next) {
  try {
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      return sendValidationError(
        res,
        "Invalid registration details.",
        validation.error.issues
      );
    }

    const user = await registerUser(validation.data);

    return res.status(201).json({
      success: true,
      message:
        "Registration successful. Email verification is required before account activation.",
      data: user
    });
  } catch (error) {
    return next(error);
  }
}


/* =========================================================
   LOGIN
========================================================= */

export async function loginController(req, res, next) {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return sendValidationError(
        res,
        "Invalid login details.",
        validation.error.issues
      );
    }

    const result = await loginUser(validation.data);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: result
    });
  } catch (error) {
    return next(error);
  }
}


/* =========================================================
   CURRENT USER
========================================================= */

export async function getCurrentUserController(req, res, next) {
  try {
    const user = await User.findOne({
      _id: req.auth.userId,
      isActive: true
    }).select(
      "name email role collegeId collegeAffiliationStatus emailVerified teacherApprovalStatus profile authProvider createdAt"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Your account is unavailable. Please log in again."
      });
    }

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    return next(error);
  }
}


/* =========================================================
   VERIFY EMAIL
========================================================= */

export async function verifyEmailController(req, res, next) {
  try {
    const { token } = req.body ?? {};

    if (
      typeof token !== "string" ||
      !/^[a-f0-9]{64}$/i.test(token)
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid verification token is required."
      });
    }

    const result = await verifyUserEmail(token);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully.",
      data: result
    });
  } catch (error) {
    return next(error);
  }
}


/* =========================================================
   RESEND VERIFICATION EMAIL
========================================================= */

export async function resendVerificationEmailController(
  req,
  res,
  next
) {
  try {
    const email = req.body?.email;

    if (
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address."
      });
    }

    const result = await resendVerificationEmail({
      email
    });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    return next(error);
  }
}


/* =========================================================
   FORGOT PASSWORD
========================================================= */

export async function requestPasswordResetController(
  req,
  res,
  next
) {
  try {
    const email = req.body?.email;

    if (
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address."
      });
    }

    const result = await requestPasswordReset({
      email
    });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    return next(error);
  }
}


/* =========================================================
   RESET PASSWORD
========================================================= */

export async function resetPasswordController(req, res, next) {
  try {
    const { token, newPassword } = req.body ?? {};

    if (
      typeof token !== "string" ||
      !/^[a-f0-9]{64}$/i.test(token)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A valid password reset token is required."
      });
    }

    if (
      typeof newPassword !== "string" ||
      newPassword.length < 12 ||
      newPassword.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain between 12 and 128 characters."
      });
    }

    const result = await resetPassword({
      token,
      newPassword
    });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    return next(error);
  }
}


/* =========================================================
   LOGOUT ALL DEVICES
========================================================= */

export async function logoutAllController(req, res, next) {
  try {
    const result = await revokeAllUserSessions(
      req.auth.userId
    );

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    return next(error);
  }
}