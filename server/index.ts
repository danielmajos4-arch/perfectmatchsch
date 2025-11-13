import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { type Server } from "http";
import net from "net";

const app = express();

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Ensure consistent environment variable loading
// Set NODE_ENV if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}

// Parse JSON and capture rawBody
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: false }));

// Log API requests
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

/**
 * Check if a port is available
 */
function isPortAvailable(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, host, () => {
      server.once("close", () => resolve(true));
      server.close();
    });
    server.on("error", () => resolve(false));
  });
}

/**
 * Find an available port, starting with the preferred port
 */
async function findAvailablePort(
  preferredPort: number,
  host: string,
  fallbackPort: number,
): Promise<number> {
  if (await isPortAvailable(preferredPort, host)) {
    return preferredPort;
  }
  log(`⚠️  Port ${preferredPort} is busy, trying ${fallbackPort}...`);
  if (await isPortAvailable(fallbackPort, host)) {
    return fallbackPort;
  }
  throw new Error(
    `Both ports ${preferredPort} and ${fallbackPort} are unavailable`,
  );
}

/**
 * Setup graceful shutdown handlers
 */
function setupGracefulShutdown(server: Server) {
  const shutdown = (signal: string) => {
    log(`\n${signal} received, shutting down gracefully...`);
    server.close(() => {
      log("✅ Server closed");
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      log("⚠️  Forcing shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Handle uncaught exceptions
  process.on("uncaughtException", (err) => {
    console.error("❌ Uncaught Exception:", err);
    shutdown("uncaughtException");
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason, promise) => {
    console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
    shutdown("unhandledRejection");
  });
}

(async () => {
  try {
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      console.error("❌ Server error:", err);
    });

    // Development vs Production serving
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ✅ Fixed host for macOS 12+ (IPv4 only, no IPv6)
    // Use 127.0.0.1 instead of ::1 or 0.0.0.0 to avoid ENOTSUP on macOS 12
    const host = "127.0.0.1";
    const preferredPort = parseInt(process.env.PORT || "5000", 10);
    const fallbackPort = 3000;

    // Find an available port
    const port = await findAvailablePort(preferredPort, host, fallbackPort);

    // Setup graceful shutdown
    setupGracefulShutdown(server);

    // Start server
    server.listen(port, host, () => {
      log(`🚀 Server running at http://${host}:${port}`);
      log(`📦 Environment: ${process.env.NODE_ENV || "development"}`);
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        log(`❌ Port ${port} is already in use`);
      } else if (err.code === "ENOTSUP") {
        log(
          `❌ IPv6 not supported on this system. Ensure host is set to 127.0.0.1`,
        );
      } else {
        log(`❌ Server error: ${err.message}`);
      }
      process.exit(1);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
})();
