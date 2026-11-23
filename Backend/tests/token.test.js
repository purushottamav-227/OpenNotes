import { describe, it, expect } from "vitest";
import { generateAccessToken, verifyAccessToken } from "../src/utils/token.js";

describe("JWT access tokens", () => {
  it("generates and verifies a valid access token", async () => {
    const user = {
      _id: "507f1f77bcf86cd799439011",
      role: "student"
    };

    const token = await generateAccessToken(user);
    const payload = await verifyAccessToken(token);

    expect(payload.sub).toBe(user._id);
    expect(payload.role).toBe("student");
    expect(payload.iss).toBe("opennotes-api");
    expect(payload.aud).toBe("opennotes-client");
  });

  it("rejects a malformed token", async () => {
    await expect(
      verifyAccessToken("not-a-valid-token")
    ).rejects.toThrow();
  });
});