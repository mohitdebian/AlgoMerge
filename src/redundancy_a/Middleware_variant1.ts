// Middleware
import { Request, Response, NextFunction } from 'express';
export const myMiddleware = (req: Request, res: Response, next: NextFunction) => { next(); };
