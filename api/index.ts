import { createApiApp } from '../server/app.js';

/**
 * Single unified Vercel Serverless Function handling all /api/* endpoints.
 * Keeps total serverless functions to 1 (well within Vercel Hobby Free Plan's 12-function limit).
 */
const app = createApiApp();

export default app;
