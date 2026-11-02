import "dotenv/config";
import { z } from "zod";

/**
 * Environment schema.
 *
 * The schema stays additive across phases so `.env` files remain compatible.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(5000),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (v) => v.startsWith("postgresql://") || v.startsWith("postgres://"),
      "DATABASE_URL must be a postgresql:// or postgres:// URL",
    ),

  FIREBASE_PROJECT_ID: z.string().min(1, "FIREBASE_PROJECT_ID is required"),
  FIREBASE_CLIENT_EMAIL: z
    .email("FIREBASE_CLIENT_EMAIL must be a valid email"),
  FIREBASE_PRIVATE_KEY: z
    .string()
    .min(1, "FIREBASE_PRIVATE_KEY is required")
    .refine(
      (v) => v.includes("BEGIN PRIVATE KEY"),
      "FIREBASE_PRIVATE_KEY must be a PEM private key (BEGIN PRIVATE KEY)",
    ),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");

    console.error(`Invalid environment configuration:\n${issues}`);
    process.exit(1);
  }

  return parsed.data;
}

export const env: Env = loadEnv();

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
export const isTest = env.NODE_ENV === "test";