/**
 * Vercel Serverless Function Entry Point.
 *
 * Imports the CLEAN API app from createApiApp.ts — NOT from server.ts.
 * This ensures the Vercel Lambda bundle never touches vite, fs, path,
 * or any native module that crashes the serverless runtime.
 */
import { createApiApp } from "../src/server/createApiApp.ts";

const app = createApiApp();

export default app;
