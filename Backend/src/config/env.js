import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(5000),

  FRONTEND_URL: z.url().default("http://localhost:5173"),

  MONGODB_URI: z.string().default(""),

  JWT_SECRET: z.string().min(64).optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  // Email configuration
  EMAIL_HOST: z.string().default("smtp.gmail.com"),

  EMAIL_PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(465),

  EMAIL_SECURE: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),

  EMAIL_USER: z.email().optional().or(z.literal("")),

  EMAIL_APP_PASSWORD: z.string().default(""),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),

  // GitHub OAuth
  GITHUB_CLIENT_ID: z.string().default(""),
  GITHUB_CLIENT_SECRET: z.string().default(""),

  // OAuth callback URLs
  GOOGLE_CALLBACK_URL: z
    .url()
    .default("http://localhost:5000/api/v1/auth/google/callback"),

  GITHUB_CALLBACK_URL: z
    .url()
    .default("http://localhost:5000/api/v1/auth/github/callback"),
  
    // Backblaze B2 S3-compatible storage
  B2_ENDPOINT: z.url().optional(),
  B2_REGION: z.string().default("us-east-005"),
  B2_BUCKET_NAME: z.string().default(""),
  B2_KEY_ID: z.string().default(""),
  B2_APPLICATION_KEY: z.string().default(""),

  MAX_PDF_SIZE_MB: z.coerce.number().int().min(1).max(25).default(25),
  MAX_PDF_PARTS: z.coerce.number().int().min(1).max(10).default(10),
  SIGNED_URL_EXPIRY_SECONDS: z.coerce.number().int().min(60).max(900).default(300)
  
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment configuration:");
  console.error(parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsedEnv.data;

if (
  env.B2_ENDPOINT &&
  (!env.B2_BUCKET_NAME || !env.B2_KEY_ID || !env.B2_APPLICATION_KEY)
) {
  console.error("Backblaze B2 configuration is incomplete.");
  process.exit(1);
}

if (!env.MONGODB_URI.trim()) {
  console.warn(
    "MONGODB_URI is not configured. Database-dependent functionality will be unavailable."
  );
}

if (!env.JWT_SECRET) {
  console.warn(
    "JWT_SECRET is not configured. Token generation may be unavailable."
  );
}

if (!env.EMAIL_USER || !env.EMAIL_APP_PASSWORD) {
  console.warn(
    "Email credentials are not configured. Email delivery will be unavailable."
  );
}

if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
  console.warn("Google OAuth is not configured.");
}

if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
  console.warn("GitHub OAuth is not configured.");
}

export default env;