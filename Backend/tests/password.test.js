import { describe, it, expect } from "vitest";
import {
  validatePassword,
  hashPassword,
  verifyPassword
} from "../src/utils/password.js";

describe("Password security", () => {
  it("accepts a valid password", () => {
    expect(
      validatePassword("SecurePassword123!").valid
    ).toBe(true);
  });

  it("rejects a password shorter than 12 characters", () => {
    const result = validatePassword("Short123!");

    expect(result.valid).toBe(false);
    expect(result.message).toContain("at least 12 characters");
  });

  it("rejects a password longer than 128 characters", () => {
    const longPassword = "A".repeat(129);
    const result = validatePassword(longPassword);

    expect(result.valid).toBe(false);
    expect(result.message).toContain("128 characters");
  });

  it("rejects non-string passwords", () => {
    const result = validatePassword(123456789012);

    expect(result.valid).toBe(false);
    expect(result.message).toBe("Password must be a string.");
  });

  it("creates an Argon2id password hash", async () => {
    const password = "SecurePassword123!";
    const passwordHash = await hashPassword(password);

    expect(passwordHash).toMatch(/^\$argon2id\$/);
    expect(passwordHash).not.toBe(password);
  });

  it("accepts the correct password", async () => {
    const password = "SecurePassword123!";
    const passwordHash = await hashPassword(password);

    await expect(
      verifyPassword(password, passwordHash)
    ).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const password = "SecurePassword123!";
    const passwordHash = await hashPassword(password);

    await expect(
      verifyPassword("WrongPassword123!", passwordHash)
    ).resolves.toBe(false);
  });

  it("rejects an invalid password hash", async () => {
    await expect(
      verifyPassword("SecurePassword123!", "invalid-hash")
    ).resolves.toBe(false);
  });

  it("rejects a password that is too short when hashing", async () => {
    await expect(
      hashPassword("Short123!")
    ).rejects.toThrow("Password must contain at least 12 characters.");
  });
});