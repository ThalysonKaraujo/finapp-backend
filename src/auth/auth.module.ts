import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { AuthMiddleware } from './auth.middleware';
import { AuthService } from './auth.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude('api/auth/verify')
      .forRoutes('auth/*', 'api/auth/*');
  }
}
