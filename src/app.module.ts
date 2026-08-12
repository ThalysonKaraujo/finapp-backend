import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';

import { CategoriesModule } from './modules/categories/categories.module';
import { GoalsModule } from './modules/goals/goals.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { WalletsModule } from './modules/wallets/wallets.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    GoalsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
