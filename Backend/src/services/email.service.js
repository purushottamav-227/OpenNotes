import nodemailer from "nodemailer";
import env from "../config/env.js";

let transporter;

function getTransporter() {
  if (!env.EMAIL_USER || !env.EMAIL_APP_PASSWORD) {
    throw new Error("Email service is not configured.");
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT,
      secure: env.EMAIL_SECURE,
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_APP_PASSWORD
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });
  }

  return transporter;
}

export async function verifyEmailConnection() {
  await getTransporter().verify();
  return true;
}

export async function sendVerificationEmail({ email, token }) {
  if (!email || !token) {
    throw new Error("Recipient email and verification token are required.");
  }

  const verificationUrl = new URL(
    "/verify-email",
    env.FRONTEND_URL
  );

  verificationUrl.searchParams.set("token", token);

  const mailer = getTransporter();

  return mailer.sendMail({
    from: {
      name: "OpenNotes",
      address: env.EMAIL_USER
    },
    to: email,
    subject: "Verify your OpenNotes email address",
    text: [
      "Welcome to OpenNotes!",
      "",
      "Please verify your email address using the link below:",
      verificationUrl.toString(),
      "",
      "This link expires in 30 minutes.",
      "If you did not create this account, you can ignore this email."
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; line-height: 1.6;">
        <h2>Welcome to OpenNotes!</h2>
        <p>Please verify your email address to continue setting up your account.</p>
        <p>
          <a href="${verificationUrl.toString()}"
             style="display: inline-block; padding: 12px 20px; background: #176b4d; color: white; text-decoration: none; border-radius: 6px;">
            Verify Email
          </a>
        </p>
        <p>This link expires in 30 minutes.</p>
        <p>If you did not create this account, you can ignore this email.</p>
      </div>
    `
  });
}

export async function sendPasswordResetEmail({ email, token }) {
  const transporter = getTransporter();

  const resetUrl = new URL("/reset-password", env.FRONTEND_URL);
  resetUrl.searchParams.set("token", token);

  const expiresInMinutes = 30;

  await transporter.sendMail({
    from: env.EMAIL_USER,
    to: email,
    subject: "Reset your OpenNotes password",
    text: [
      "Hello,",
      "",
      "We received a request to reset your OpenNotes password.",
      "",
      `Use this link to reset your password: ${resetUrl.toString()}`,
      "",
      `This link expires in ${expiresInMinutes} minutes.`,
      "",
      "If you did not request a password reset, you can ignore this email.",
      "",
      "OpenNotes Team"
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Reset your OpenNotes password</h2>
        <p>We received a request to reset your OpenNotes password.</p>
        <p>
          Click the button below to choose a new password.
        </p>
        <p>
          <a
            href="${resetUrl.toString()}"
            style="
              display: inline-block;
              padding: 12px 20px;
              background-color: #166534;
              color: #ffffff;
              text-decoration: none;
              border-radius: 6px;
            "
          >
            Reset Password
          </a>
        </p>
        <p>This link expires in ${expiresInMinutes} minutes.</p>
        <p>If you did not request a password reset, you can ignore this email.</p>
        <p>— OpenNotes Team</p>
      </div>
    `
  });
}
