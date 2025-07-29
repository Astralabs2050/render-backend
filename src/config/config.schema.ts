import { validateEnv } from './env.validation';
export const configValidationSchema = {
  validate: (config: Record<string, any>) => {
    try {
      return validateEnv(config);
    } catch (error) {
      throw new Error(`Configuration validation failed: ${error.message}`);
    }
  }
};