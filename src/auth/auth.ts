import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer } from 'better-auth/plugins';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './auth.schema';

import { Resend } from 'resend';

const client = postgres(process.env.DATABASE_URL || '');
const db = drizzle(client, { schema });

const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  plugins: [bearer()],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url, token }) => {
      if (process.env.NODE_ENV === 'test') {
        return;
      }

      const customUrl = `http://localhost:3000/api/auth/verify?token=${token}`;
      await resend.emails.send({
        from: 'FinApp <onboarding@resend.dev>',
        to: user.email,
        subject: 'Confirme seu e-mail no FinApp',
        html: `<p>Olá ${user.name},</p><p>Clique no link abaixo para verificar sua conta:</p><p><a href="${customUrl}">${customUrl}</a></p>`,
      });
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  trustedOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    'exp://*',
    'app://*',
  ],
  rateLimit: {
    enabled: true,
    window: 10, // 10 seconds global window
    max: 100, // 100 requests per 10s globally
    customRules: {
      '/api/auth/sign-in/email': {
        window: 60,
        max: 5, // 5 attempts per minute for sign in
      },
      '/api/auth/sign-up/email': {
        window: 60,
        max: 3, // 3 attempts per minute for sign up
      },
    },
  },
  advanced: {
    ipAddress: {
      ipAddressHeaders: ['x-forwarded-for', 'x-real-ip'],
      disableIpTracking: false,
    },
  },
});
