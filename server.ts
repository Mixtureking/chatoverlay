import path from "path";
import fs from "fs";
import { createApiApp } from "./src/server/createApiApp.ts";

const PORT = 3000;

// Create Express app with all API routes from shared module
const app = createApiApp();

// Enhanced file-based logging for local development (supplements console.log in createApiApp)
// This is intentionally NOT in createApiApp.ts to avoid importing `fs` and `path` in Vercel.
function logToFile(message: string) {
  const timestamp = new Date().toISOString();
  const logLine = `[LOGGER][${timestamp}] ${message}\n`;
  try {
    fs.appendFileSync(path.join(process.cwd(), "server_logs.txt"), logLine, "utf8");
  } catch (err) {
    // Ignore log-writing errors to prevent crash loop
  }
}

// Vite & Static file handler initialization for local development and standalone/Electron environments
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Use new Function to completely hide "vite" from Vercel NFT / esbuild static analysis.
    // This prevents the serverless bundler from pulling in vite + esbuild + rollup native modules.
    const dynamicImport = new Function("m", "return import(m)") as (m: string) => Promise<any>;
    const { createServer: createViteServer } = await dynamicImport("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    let distPath = path.join(process.cwd(), "dist");
    
    // Fall back to locations relative to __dirname for Electron and standalone builds
    if (typeof __dirname !== "undefined") {
      if (fs.existsSync(path.join(__dirname, "index.html"))) {
        distPath = __dirname;
      } else if (fs.existsSync(path.join(__dirname, "dist", "index.html"))) {
        distPath = path.join(__dirname, "dist");
      }
    }

    app.use((await import("express")).default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

// Only start the full server locally — Vercel uses api/index.ts instead
startServer();

export default app;
