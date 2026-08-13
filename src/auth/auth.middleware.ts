import { Injectable, type NestMiddleware } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import type { NextFunction, Request, Response } from 'express';
import { auth } from './auth';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // NestJS strips the global prefix '/api' from req.url
    // Better Auth relies on the full URL to match routes, so we restore it
    req.url = req.originalUrl;
    const handler = toNodeHandler(auth);
    return handler(req, res);
  }
}
