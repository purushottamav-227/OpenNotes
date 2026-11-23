import { verifyEmailConnection } from "./src/services/email.service.js";

try {
  await verifyEmailConnection();
  console.log("Email SMTP connection successful!");
  process.exitCode = 0;
} catch (error) {
  console.error("Email SMTP connection failed:", error.message);
  process.exitCode = 1;
}