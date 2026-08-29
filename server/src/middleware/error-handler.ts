import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../utils/logger.js";

export type AppErrorType =
  | "VALIDATION_ERROR"
  | "AI_PROVIDER_ERROR"
  | "RETRIEVAL_ERROR"
  | "TRANSCRIPTION_ERROR"
  | "TTS_ERROR"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    public type: AppErrorType,
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as any).requestId || "unknown";

  if (err instanceof ZodError) {
    logger.warn("Validation error", { requestId, issues: err.issues });
    return res.status(400).json({
      requestId,
      error: "VALIDATION_ERROR",
      message: "Invalid request data",
      details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  if (err instanceof AppError) {
    logger.warn(`AppError: ${err.type}`, { requestId, message: err.message, statusCode: err.statusCode });
    return res.status(err.statusCode).json({
      requestId,
      error: err.type,
      message: err.message,
      details: err.details,
    });
  }

  logger.error("Unhandled error", {
    requestId,
    error: err.message,
    stack: err.stack?.slice(0, 1000),
    route: req.path,
  });

  const isDev = process.env.NODE_ENV === "development";

  return res.status(500).json({
    requestId,
    error: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
    details: isDev ? err.message : undefined,
  });
}

export function notFoundHandler(req: Request, res: Response) {
  const requestId = (req as any).requestId || "unknown";
  res.status(404).json({
    requestId,
    error: "NOT_FOUND",
    message: `Route ${req.method} ${req.path} not found`,
  });
}
