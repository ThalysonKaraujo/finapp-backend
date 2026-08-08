import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export const PG_CONNECTION = 'PG_CONNECTION';

export const databaseProvider: Provider = {
  provide: PG_CONNECTION,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const databaseUrl = configService.get<string>('DATABASE_URL');

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined');
    }

    const queryClient = postgres(databaseUrl);

    return drizzle(queryClient);
  },
};
