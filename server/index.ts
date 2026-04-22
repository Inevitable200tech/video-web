import dotenv from "dotenv";
import express, { type Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import fs from "fs";
import path from "path";
import cookieParser from "cookie-parser";
import { randomUUID } from "crypto";
import { clerkMiddleware } from '@clerk/express'

const rootEnvPath = path.resolve("cert.env");
const folderEnvPath = path.resolve("cert_env", "cert.env");
export const envPath = fs.existsSync(rootEnvPath) ? rootEnvPath : folderEnvPath;

dotenv.config({ path: envPath }); // Adjust the path if your .env is elsewhere

log("Starting server initialization…");
log(`Loaded environment variables: MONGO_URL=${process.env.MONGO_URL}, PORT=${process.env.PORT}`);
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(clerkMiddleware());




// --- server/index.ts ---

// 1. Trust proxy is essential for Render.com HTTPS/Cookies
app.set("trust proxy", 1);

// 2. Simple CSRF Middleware (Disabled for Development)
/*
const CSRF_EXCLUDE = [
  "/api/admin/login", 
  "/api/admin/developer-request", 
  "/api/admin/verify-developer-code",
  "/api/students-upload",
];

app.use((req, res, next) => {
  // 1. Always allow GET requests
  if (req.method === "GET") return next();

  // 2. Always allow Excluded routes
  if (CSRF_EXCLUDE.includes(req.path)) return next();

  // 3. STRICT CHECK for the custom header
  // Note: Node.js converts all incoming headers to lowercase automatically
  const csrfHeader = req.headers["x-requested-with"];
  
  if (csrfHeader === "VideoPortal-App") {
    return next();
  }

  // LOGGING: This will help you debug in your Render.com logs
  console.warn(`[CSRF BLOCK] Method: ${req.method} | Path: ${req.path} | Header: ${csrfHeader}`);
  
  return res.status(403).json({ 
    message: "Security Check Failed: Missing Security Header" 
  });
});
*/

// ---------------- START ANTI-CACHING MIDDLEWARE ----------------

// Global middleware to disable caching for all API and HTML responses
app.use((req, res, next) => {
  // These headers prevent the browser and any proxies from caching responses.
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});



// ---------------- END ANTI-CACHING MIDDLEWARE ----------------


app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  // ✅ Ensure user has a persistent cookie
  if (!req.cookies.userUploadId) {
    res.cookie("userUploadId", randomUUID(), {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
    });
  }

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 10000) {
        logLine = logLine.slice(0, 199) + "…";
      }

      log(logLine);
    }


  });

  next();
});

import { connectDatabases } from "./db";

(async () => {
  try {
    await connectDatabases();
  } catch (err) {
    log("Exiting process due to Database connection failure.");
    process.exit(1);
  }

  log("Registering routes…");
  const server = await registerRoutes(app);
  log("Routes registered.");

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    log(`Error encountered: ${err.message || err}`);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    log("Setting up Vite for development…");
    await setupVite(app, server);
    log("Vite setup complete.");
  } else {
    log("Serving static files for production…");
    serveStatic(app);
    log("Static file serving setup complete.");
  }

  const port = Number(process.env.PORT) || 5000;
  log(`Starting server on port ${port}…`);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: false,
  }, () => {
    log(`Server is running and serving on port ${port}`);
  });
})();
