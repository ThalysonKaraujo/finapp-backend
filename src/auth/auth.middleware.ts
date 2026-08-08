import { Injectable, type NestMiddleware } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import type { NextFunction, Request, Response } from 'express';
import { auth } from './auth';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const handler = toNodeHandler(auth);
    return handler(req, res);
  }
}
