import express, { type Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { registerRoutes } from "./routes";
import { initializeAuth } from "./auth";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

export default app;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

const environment = process.env.NODE_ENV ?? "development";
const runningInVercel = Boolean(process.env.VERCEL);

app.set("env", environment);

const bootstrapPromise = (async () => {
  try {
    await initializeAuth(app);
    await registerRoutes(app);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Failed to initialize server: ${message}`, "express");
    throw error;
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (!runningInVercel) {
    const server: Server = createServer(app);

    log(
      `App environment: ${app.get("env")}, setting up ${
        app.get("env") === "development" ? "Vite" : "static file serving"
      }...`,
    );

    if (app.get("env") === "development") {
      await setupVite(app, server);
      log("Vite setup completed");
    } else {
      serveStatic(app);
      log("Using static file serving");
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 3000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || "3000", 10);
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        log(`serving on http://localhost:${port}`);
        resolve();
      });
    });
  } else {
    log(
      "Running inside Vercel environment; HTTP server bootstrap handled by platform",
      "vercel",
    );
  }
})();

app.use(async (_req, _res, next) => {
  try {
    await bootstrapPromise;
    next();
  } catch (error) {
    next(error);
  }
});
