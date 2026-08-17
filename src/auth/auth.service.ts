import { Injectable } from '@nestjs/common';
import { auth } from './auth';

@Injectable()
export class AuthService {
  async verifyEmail(token: string, headers: any): Promise<boolean> {
    try {
      const response = await auth.api.verifyEmail({
        headers,
        query: { token },
      });

      return !!response?.status;
    } catch (e) {
      return false;
    }
  }
}
