import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  FRONTEND_URL: Joi.string().default('http://localhost:3001'),
  
  // Database - Supabase
  SUPABASE_URL: Joi.string().required(),
  
  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRATION: Joi.string().default('7d'),
  
  // OAuth - Google
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().optional(),
  GOOGLE_CALLBACK_URL: Joi.string().optional(),
  
  // OAuth - Discord
  DISCORD_CLIENT_ID: Joi.string().optional(),
  DISCORD_CLIENT_SECRET: Joi.string().optional(),
  DISCORD_CALLBACK_URL: Joi.string().optional(),
  
  // OAuth - Twitter/X
  TWITTER_CLIENT_ID: Joi.string().optional(),
  TWITTER_CLIENT_SECRET: Joi.string().optional(),
  TWITTER_CALLBACK_URL: Joi.string().optional(),
  
  // AI Services
  OPENAI_API_KEY: Joi.string().optional(),
  STABILITY_API_KEY: Joi.string().optional(),
  ASTRIA_API_KEY: Joi.string().optional(),
  OPENAI_MODEL: Joi.string().default('gpt-4o'),
  
  // Stream Chat
  STREAM_API_KEY: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  STREAM_API_SECRET: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  
  // SendGrid Configuration
  SENDGRID_API_KEY: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  SENDGRID_FROM_EMAIL: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().email().required(),
    otherwise: Joi.string().email().optional(),
  }),
});