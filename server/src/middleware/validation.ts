import { Request, Response, NextFunction } from "express";
import { z, ZodSchema } from "zod";

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.query);
      req.query = parsed as any;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export const chatRequestSchema = z.object({
  message: z.string().min(1, "Message is required").max(2000, "Message too long"),
  sessionId: z.string().optional(),
  topK: z.number().min(1).max(20).optional(),
  includeDebug: z.boolean().optional(),
});

export const ingestRequestSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(10).max(50000),
  source: z.string().max(200).optional(),
  url: z.string().url().optional().or(z.literal("")),
  category: z.string().max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const transcribeRequestSchema = z.object({
  transcript: z.string().min(1).max(2000),
  sessionId: z.string().optional(),
});
