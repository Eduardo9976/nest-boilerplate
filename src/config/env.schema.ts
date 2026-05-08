import { z } from 'zod';

export const EnvSchema = z
  .object({
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/).default('15m'),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_REFRESH_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/).default('7d'),
    ENABLE_JWT_AUTH: z
      .string()
      .default('true')
      .transform((v) => v === 'true'),
    ENABLE_GOOGLE_AUTH: z
      .string()
      .default('false')
      .transform((v) => v === 'true'),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_CALLBACK_URL: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.ENABLE_GOOGLE_AUTH) {
      if (!data.GOOGLE_CLIENT_ID) {
        ctx.addIssue({
          code: 'custom',
          message: 'GOOGLE_CLIENT_ID required when ENABLE_GOOGLE_AUTH=true',
          path: ['GOOGLE_CLIENT_ID'],
        });
      }
      if (!data.GOOGLE_CLIENT_SECRET) {
        ctx.addIssue({
          code: 'custom',
          message: 'GOOGLE_CLIENT_SECRET required when ENABLE_GOOGLE_AUTH=true',
          path: ['GOOGLE_CLIENT_SECRET'],
        });
      }
      if (!data.GOOGLE_CALLBACK_URL) {
        ctx.addIssue({
          code: 'custom',
          message: 'GOOGLE_CALLBACK_URL required when ENABLE_GOOGLE_AUTH=true',
          path: ['GOOGLE_CALLBACK_URL'],
        });
      }
    }
  });

export type Env = z.infer<typeof EnvSchema>;
