import { Injectable, type NestMiddleware } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import type { NextFunction, Request, Response } from 'express';
import { auth } from './auth';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // NestJS strips the global prefix '/api' from req.url
    // Better Auth relies on the full URL to match routes, so we restore it
    if (req.method === 'GET' && req.originalUrl.includes('/verify-email')) {
      const token = req.query.token as string;
      return res.redirect(`/api/auth/verify?token=${token}`);
    }

    const protocol = req.protocol || 'http';
    const host = req.get('host');
    const query = new URLSearchParams(req.query as any).toString();
    const basePath = req.originalUrl.split('?')[0];
    req.url = `${protocol}://${host}${basePath}${query ? `?${query}` : ''}`;

    // Ensure Origin header is present for native mobile clients
    if (!req.headers.origin) {
      req.headers.origin = `${protocol}://${host || 'localhost:3000'}`;
    }

    const handler = toNodeHandler(auth);
    return handler(req, res);
  }
}
