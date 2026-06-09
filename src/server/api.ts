/**
 * Vercel Serverless Function Source Entry Point.
 *
 * This source file is compiled into api/index.js during the build phase.
 */
import { createApiApp } from "./createApiApp.ts";

const app = createApiApp();

export default app;
