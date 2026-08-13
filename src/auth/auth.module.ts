import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthMiddleware } from './auth.middleware';

@Module({
  imports: [DatabaseModule],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 'auth/*' matches /api/auth in Prod (due to setGlobalPrefix('api'))
    // 'api/auth/*' matches /api/auth in E2E (where setGlobalPrefix is missing)
    consumer.apply(AuthMiddleware).forRoutes('auth/*', 'api/auth/*');
  }
}
