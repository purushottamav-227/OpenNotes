import mongoose from "mongoose";
import env from "./env.js";

export async function connectDatabase() {
  const mongoUri = env.MONGODB_URI.trim();

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000
  });

  console.log("MongoDB connected successfully.");
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}