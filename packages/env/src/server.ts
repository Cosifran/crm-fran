import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

console.log("[ENV DEBUG] Vars leídas al momento de validar:", {
  DATABASE_URL: process.env.DATABASE_URL
    ? `${process.env.DATABASE_URL.slice(0, 20)}...`
    : "UNDEFINED",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET
    ? `len=${process.env.BETTER_AUTH_SECRET.length}`
    : "UNDEFINED",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "UNDEFINED",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "UNDEFINED",
  NODE_ENV: process.env.NODE_ENV ?? "UNDEFINED",
});


export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
