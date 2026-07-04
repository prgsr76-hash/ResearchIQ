import dotenv from 'dotenv';

dotenv.config();

/**
 * Validated environment configuration object.
 * Throws on startup if any required variable is missing.
 */
interface EnvConfig {
  /** MongoDB connection string */
  MONGODB_URI: string;
  /** Secret key for JWT signing/verification */
  JWT_SECRET: string;
  /** Google Gemini API key */
  GEMINI_API_KEY: string;
  /** Server port (defaults to 5000) */
  PORT: number;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config: EnvConfig = {
  MONGODB_URI: requireEnv('MONGODB_URI'),
  JWT_SECRET: requireEnv('JWT_SECRET'),
  GEMINI_API_KEY: requireEnv('GEMINI_API_KEY'),
  PORT: parseInt(process.env['PORT'] || '5000', 10),
};
