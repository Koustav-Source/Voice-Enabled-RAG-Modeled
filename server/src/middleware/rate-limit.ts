import { Request, Response, NextFunction } from "express";

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export function rateLimit(options: RateLimitOptions) {
  const store = new Map<string, { count: number; resetTime: number }>();

  // Cleanup old entries every minute
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of store) {
      if (now > value.resetTime) {
        store.delete(key);
      }
    }
  }, 60_000).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();

    let entry = store.get(key);

    if (!entry || now > entry.resetTime) {
      entry = { count: 1, resetTime: now + options.windowMs };
      store.set(key, entry);
      return next();
    }

    entry.count++;

    if (entry.count > options.max) {
      res.setHeader("Retry-After", Math.ceil((entry.resetTime - now) / 1000).toString());
      return res.status(429).json({
        error: "RATE_LIMITED",
        message: "Too many requests, please try again later",
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      });
    }

    next();
  };
}
