import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
  EMBEDDING_MODEL: z.string().default("text-embedding-004"),
  LLM_PROVIDER: z.enum(["gemini", "openai", "mock"]).default("gemini"),
  VECTOR_STORE: z.string().default("memory"),
  TOP_K: z.coerce.number().min(1).max(20).default(5),
  MIN_RETRIEVAL_SCORE: z.coerce.number().min(0).max(1).default(0.08),
  CHUNK_SIZE: z.coerce.number().min(100).max(5000).default(800),
  CHUNK_OVERLAP: z.coerce.number().min(0).max(1000).default(150),
  SEMANTIC_WEIGHT: z.coerce.number().min(0).max(1).default(0.7),
  KEYWORD_WEIGHT: z.coerce.number().min(0).max(1).default(0.3),
  CORS_ORIGIN: z.string().default("*"),
  MAX_CONTEXT_CHARS: z.coerce.number().default(9000),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Env = z.infer<typeof envSchema>;

let parsed: Env;

try {
  parsed = envSchema.parse(process.env);
} catch (err) {
  if (err instanceof z.ZodError) {
    console.error("❌ Invalid environment variables:");
    for (const issue of err.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    console.error("\nCheck .env.example for required configuration.");
    process.exit(1);
  }
  throw err;
}

export const env: Env = parsed;

export const isDev = env.NODE_ENV === "development";
export const isProd = env.NODE_ENV === "production";
