import {
  describe,
  it,
  expect,
  vi,
  beforeEach
} from "vitest";

import request from "supertest";


const mocks = vi.hoisted(() => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  verifyUserEmail: vi.fn(),
  resendVerificationEmail: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  revokeAllUserSessions: vi.fn()
}));


vi.mock("../src/services/auth.service.js", () => ({
  registerUser: mocks.registerUser,
  loginUser: mocks.loginUser,
  verifyUserEmail: mocks.verifyUserEmail,
  resendVerificationEmail: mocks.resendVerificationEmail,
  requestPasswordReset: mocks.requestPasswordReset,
  resetPassword: mocks.resetPassword,
  revokeAllUserSessions: mocks.revokeAllUserSessions
}));


vi.mock("../src/models/User.js", () => ({
  default: {
    findOne: vi.fn()
  }
}));


import app from "../src/app.js";


describe("Authentication API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });


  /* =====================================================
     REGISTER
  ===================================================== */

  describe("POST /api/v1/auth/register", () => {
    it("rejects an invalid email address", async () => {
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          name: "Test Student",
          email: "invalid-email",
          password: "SecurePassword123!"
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);

      expect(mocks.registerUser).not.toHaveBeenCalled();
    });


    it("rejects a password shorter than 12 characters", async () => {
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          name: "Test Student",
          email: "student@example.com",
          password: "Short123!"
        });

      expect(response.status).toBe(400);

      expect(mocks.registerUser).not.toHaveBeenCalled();
    });


    it("rejects an attempt to assign the admin role", async () => {
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          name: "Test Student",
          email: "student@example.com",
          password: "SecurePassword123!",
          role: "admin"
        });

      expect(response.status).toBe(400);

      expect(mocks.registerUser).not.toHaveBeenCalled();
    });


    it("registers a valid student", async () => {
      mocks.registerUser.mockResolvedValue({
        id: "507f1f77bcf86cd799439011",
        name: "Test Student",
        email: "student@example.com",
        role: "student",
        emailVerified: false
      });

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          name: "Test Student",
          email: "student@example.com",
          password: "SecurePassword123!"
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      expect(mocks.registerUser).toHaveBeenCalledWith({
        name: "Test Student",
        email: "student@example.com",
        password: "SecurePassword123!"
      });

      expect(response.body.data.passwordHash).toBeUndefined();
    });
  });


  /* =====================================================
     LOGIN
  ===================================================== */

  describe("POST /api/v1/auth/login", () => {
    it("rejects invalid login input", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "invalid-email",
          password: "anything"
        });

      expect(response.status).toBe(400);

      expect(mocks.loginUser).not.toHaveBeenCalled();
    });


    it("returns an access token after successful login", async () => {
      mocks.loginUser.mockResolvedValue({
        accessToken: "mock-access-token",
        tokenType: "Bearer",
        expiresIn: 900,
        user: {
          id: "507f1f77bcf86cd799439011",
          name: "Test Student",
          email: "student@example.com",
          role: "student",
          emailVerified: true
        }
      });

      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "student@example.com",
          password: "SecurePassword123!"
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.accessToken)
        .toBe("mock-access-token");

      expect(response.body.data.user.passwordHash)
        .toBeUndefined();
    });


    it("returns an error for incorrect credentials", async () => {
      const error = new Error(
        "Invalid email or password."
      );

      error.statusCode = 401;

      mocks.loginUser.mockRejectedValue(error);

      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "student@example.com",
          password: "WrongPassword123!"
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });


  /* =====================================================
     VERIFY EMAIL
  ===================================================== */

  describe("POST /api/v1/auth/verify-email", () => {
    it("rejects an invalid verification token", async () => {
      const response = await request(app)
        .post("/api/v1/auth/verify-email")
        .send({
          token: "invalid-token"
        });

      expect(response.status).toBe(400);

      expect(mocks.verifyUserEmail).not.toHaveBeenCalled();
    });


    it("verifies a valid token", async () => {
      mocks.verifyUserEmail.mockResolvedValue({
        email: "student@example.com",
        emailVerified: true
      });

      const token = "a".repeat(64);

      const response = await request(app)
        .post("/api/v1/auth/verify-email")
        .send({ token });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(mocks.verifyUserEmail)
        .toHaveBeenCalledWith(token);
    });
  });


  /* =====================================================
     RESEND VERIFICATION
  ===================================================== */

  describe("POST /api/v1/auth/resend-verification", () => {
    it("rejects an invalid email", async () => {
      const response = await request(app)
        .post("/api/v1/auth/resend-verification")
        .send({
          email: "invalid-email"
        });

      expect(response.status).toBe(400);

      expect(mocks.resendVerificationEmail)
        .not.toHaveBeenCalled();
    });


    it("returns a generic response for valid email input", async () => {
      mocks.resendVerificationEmail.mockResolvedValue({
        message:
          "If an eligible account exists, a verification email will be sent."
      });

      const response = await request(app)
        .post("/api/v1/auth/resend-verification")
        .send({
          email: "student@example.com"
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });


  /* =====================================================
     FORGOT PASSWORD
  ===================================================== */

  describe("POST /api/v1/auth/forgot-password", () => {
    it("rejects an invalid email", async () => {
      const response = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({
          email: "invalid-email"
        });

      expect(response.status).toBe(400);

      expect(mocks.requestPasswordReset)
        .not.toHaveBeenCalled();
    });


    it("returns a generic response for valid email input", async () => {
      mocks.requestPasswordReset.mockResolvedValue({
        message:
          "If an eligible account exists, password reset instructions will be sent."
      });

      const response = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({
          email: "student@example.com"
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });


  /* =====================================================
     RESET PASSWORD
  ===================================================== */

  describe("POST /api/v1/auth/reset-password", () => {
    it("rejects a malformed reset token", async () => {
      const response = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: "invalid-token",
          newPassword: "SecurePassword123!"
        });

      expect(response.status).toBe(400);

      expect(mocks.resetPassword).not.toHaveBeenCalled();
    });


    it("rejects a password shorter than 12 characters", async () => {
      const response = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token: "a".repeat(64),
          newPassword: "Short123!"
        });

      expect(response.status).toBe(400);

      expect(mocks.resetPassword).not.toHaveBeenCalled();
    });


    it("accepts a valid reset request", async () => {
      mocks.resetPassword.mockResolvedValue({
        message:
          "Password reset successfully. All existing sessions have been invalidated. You can now log in."
      });

      const token = "a".repeat(64);

      const response = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({
          token,
          newPassword: "NewSecurePassword123!"
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(mocks.resetPassword).toHaveBeenCalledWith({
        token,
        newPassword: "NewSecurePassword123!"
      });
    });
  });


  /* =====================================================
     LOGOUT ALL
  ===================================================== */

  describe("POST /api/v1/auth/logout-all", () => {
    it("rejects requests without an access token", async () => {
      const response = await request(app)
        .post("/api/v1/auth/logout-all");

      expect(response.status).toBe(401);

      expect(mocks.revokeAllUserSessions)
        .not.toHaveBeenCalled();
    });
  });
});