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
    // Como temos um GlobalPrefix('api'), não devemos repetir o /api aqui
    consumer.apply(AuthMiddleware).forRoutes('auth/*');
  }
}
