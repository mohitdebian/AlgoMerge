// Middleware
import { Request, Response, NextFunction } from 'express';

export const myMiddleware = (req: Request, res: Response, next: NextFunction) => { next(); };

// Rate Limiting Middleware implementation to protect routes from DDOS / Brute Force
const requestCounts = new Map<string, { count: number, resetTime: number }>();
export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 100; // Limit each IP to 100 requests per windowMs

  const userRequestInfo = requestCounts.get(ip);
  if (!userRequestInfo || now > userRequestInfo.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }

  userRequestInfo.count += 1;
  if (userRequestInfo.count > maxRequests) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests from this IP, please try again after 1 minute.'
    });
  }
  next();
};

