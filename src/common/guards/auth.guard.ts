import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { auth } from '../../auth/auth'; // Importing the betterAuth instance

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    try {
      // Better Auth expects web standard Headers, so we adapt Node.js headers
      const headers = new Headers();
      for (const key in request.headers) {
        if (request.headers[key]) {
          headers.append(key, request.headers[key] as string);
        }
      }

      // getSession automatically checks the Authorization Bearer token (since we have the bearer plugin)
      const session = await auth.api.getSession({
        headers: headers,
      });

      if (!session || !session.user) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      // Attach user to the request object so our @CurrentUser decorator can pick it up
      request.user = session.user;
      
      return true;
    } catch (error) {
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
