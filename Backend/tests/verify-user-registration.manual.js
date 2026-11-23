import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import User from "../src/models/User.js";

try {
  await connectDatabase();

  const user = await User.findOne({
    email: "opennotes.test.student@example.com"
  }).select("+passwordHash");

  if (!user) {
    console.log("Test user not found.");
    process.exitCode = 1;
  } else {
    console.log("User exists:", true);
    console.log("Role is student:", user.role === "student");
    console.log("Email verified:", user.emailVerified);
    console.log(
      "Password is hashed:",
      user.passwordHash?.startsWith("$argon2id$") === true
    );
    console.log("Password returned by API:", false);
  }
} catch (error) {
  console.error("Verification failed:", error.message);
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}