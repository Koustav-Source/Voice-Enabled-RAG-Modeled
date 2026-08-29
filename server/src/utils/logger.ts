import { env } from "../config/env.js";

type LogLevel = "debug" | "info" | "warn" | "error";

const levelOrder: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return levelOrder[level] >= levelOrder[env.LOG_LEVEL];
}

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] ${level.toUpperCase()} ${message}`;
  if (meta && Object.keys(meta).length > 0) {
    // Avoid logging secrets
    const safeMeta = { ...meta };
    for (const key of Object.keys(safeMeta)) {
      if (key.toLowerCase().includes("key") || key.toLowerCase().includes("secret") || key.toLowerCase().includes("token")) {
        safeMeta[key] = "[REDACTED]";
      }
    }
    return `${base} ${JSON.stringify(safeMeta)}`;
  }
  return base;
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => {
    if (shouldLog("debug")) console.debug(formatMessage("debug", message, meta));
  },
  info: (message: string, meta?: Record<string, unknown>) => {
    if (shouldLog("info")) console.info(formatMessage("info", message, meta));
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    if (shouldLog("warn")) console.warn(formatMessage("warn", message, meta));
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    if (shouldLog("error")) console.error(formatMessage("error", message, meta));
  },
};
