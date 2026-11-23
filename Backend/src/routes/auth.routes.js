import { Router } from "express";

import {
  registerController,
  loginController,
  getCurrentUserController,
  verifyEmailController,
  resendVerificationEmailController,
  requestPasswordResetController,
  resetPasswordController,
  logoutAllController
} from "../controllers/auth.controller.js";

import {
  loginRateLimiter,
  registerRateLimiter,
  resendVerificationRateLimiter,
  verifyEmailRateLimiter,
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter
} from "../middleware/rateLimit.middleware.js";

import {
  authenticateUser
} from "../middleware/auth.middleware.js";


const router = Router();


/* =========================================================
   REGISTRATION AND LOGIN
========================================================= */

router.post(
  "/register",
  registerRateLimiter,
  registerController
);

router.post(
  "/login",
  loginRateLimiter,
  loginController
);


/* =========================================================
   EMAIL VERIFICATION
========================================================= */

router.post(
  "/verify-email",
  verifyEmailRateLimiter,
  verifyEmailController
);

router.post(
  "/resend-verification",
  resendVerificationRateLimiter,
  resendVerificationEmailController
);


/* =========================================================
   PASSWORD RESET
========================================================= */

router.post(
  "/forgot-password",
  forgotPasswordRateLimiter,
  requestPasswordResetController
);

router.post(
  "/reset-password",
  resetPasswordRateLimiter,
  resetPasswordController
);


/* =========================================================
   AUTHENTICATED USER
========================================================= */

router.get(
  "/me",
  authenticateUser,
  getCurrentUserController
);


/* =========================================================
   LOGOUT
========================================================= */

// Invalidates all existing JWTs for the authenticated user.
router.post(
  "/logout-all",
  authenticateUser,
  logoutAllController
);


export default router;