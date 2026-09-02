import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SentryModule } from '@sentry/nestjs/setup';
import { redisStore } from 'cache-manager-redis-yet';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';

import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

import { BudgetsModule } from './modules/budgets/budgets.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ObjectivesModule } from './modules/objectives/objectives.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { WalletsModule } from './modules/wallets/wallets.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
      },
    }),
    SentryModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          url: `redis://${configService.get('REDIS_HOST')}:${configService.get('REDIS_PORT')}`,
          ttl: 300000,
        }),
      }),
    }),
    DatabaseModule,
    AuthModule,
    TransactionsModule,
    CategoriesModule,
    WalletsModule,
    ReportsModule,
    BudgetsModule,
    ObjectivesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
