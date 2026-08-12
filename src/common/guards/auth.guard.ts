import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { auth } from '../../auth/auth'; // Importing the betterAuth instance
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    try {
      // Extract the bearer token to use as cache key
      const authHeader = request.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('Invalid or missing token');
      }
      const token = authHeader.split(' ')[1];

      // 1. Check cache first
      const cachedSession = await this.cacheManager.get(token);
      if (cachedSession) {
        request.user = (cachedSession as any).user;
        return true;
      }

      // Better Auth expects web standard Headers, so we adapt Node.js headers
      const headers = new Headers();
      for (const key in request.headers) {
        if (request.headers[key]) {
          headers.append(key, request.headers[key] as string);
        }
      }

      // 2. Fetch session from Database (via Better Auth)
      const session = await auth.api.getSession({
        headers: headers,
      });

      if (!session || !session.user) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      // 3. Save to cache
      await this.cacheManager.set(token, session);

      // Attach user to the request object so our @CurrentUser decorator can pick it up
      request.user = session.user;

      return true;
    } catch (error) {
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
