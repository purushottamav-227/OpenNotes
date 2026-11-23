import session from "express-session";
import MongoStore from "connect-mongo";

import env from "./env.js";

const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function createSessionMiddleware() {
  if (!env.MONGODB_URI.trim()) {
    throw new Error(
      "MONGODB_URI must be configured before session middleware can start."
    );
  }

  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
    throw new Error(
      "SESSION_SECRET must contain at least 32 characters."
    );
  }

  return session({
    name: "opennotes.sid",

    secret: env.SESSION_SECRET,

    resave: false,

    saveUninitialized: false,

    rolling: true,

    store: MongoStore.create({
      mongoUrl: env.MONGODB_URI,
      collectionName: "opennotes_sessions",
      ttl: SESSION_MAX_AGE_MS / 1000,
      autoRemove: "native"
    }),

    cookie: {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_MS
    }
  });
}