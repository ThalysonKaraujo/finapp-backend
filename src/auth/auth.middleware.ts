import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { auth } from './auth';
import { toNodeHandler } from 'better-auth/node';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const handler = toNodeHandler(auth);
    return handler(req, res);
  }
}
