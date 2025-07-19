import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  
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
});