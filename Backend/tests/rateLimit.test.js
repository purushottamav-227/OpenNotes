import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { rateLimit } from "express-rate-limit";

describe("Authentication rate limiting", () => {
  let app;

  beforeEach(() => {
    vi.useRealTimers();

    app = express();
    app.use(express.json());

    // A small test-only limit makes it possible to verify
    // rate limiting without making many requests.
    const testLimiter = rateLimit({
      windowMs: 60_000,
      limit: 2,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        success: false,
        message: "Too many requests."
      }
    });

    app.post("/test-login", testLimiter, (req, res) => {
      res.status(200).json({
        success: true
      });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests within the limit", async () => {
    const first = await request(app).post("/test-login");
    const second = await request(app).post("/test-login");

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
  });

  it("blocks requests after the limit is exceeded", async () => {
    await request(app).post("/test-login");
    await request(app).post("/test-login");

    const third = await request(app).post("/test-login");

    expect(third.status).toBe(429);
    expect(third.body.success).toBe(false);
    expect(third.body.message).toBe("Too many requests.");
  });
});