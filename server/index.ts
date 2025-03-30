import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { testDatabaseConnection } from "./debug-db";

const app = express();
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

(async () => {
  // Esegui test di connessione al database prima di tutto
  console.log("\n===== TEST DI CONNESSIONE DATABASE =====");
  try {
    const dbTestResult = await testDatabaseConnection();
    if (!dbTestResult) {
      console.error("Test di connessione database fallito. Arresto dell'applicazione.");
      process.exit(1);
    }
    console.log("Test di connessione database completato con successo!");
  } catch (dbTestError) {
    console.error("Errore critico durante il test del database:", dbTestError);
    process.exit(1);
  }
  console.log("===== FINE TEST DI CONNESSIONE DATABASE =====\n");
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    app.set("env", "production");
    serveStatic(app);
  }

  // Configure port for production/development
  let port = parseInt(process.env.PORT || "5000");
  const maxPortAttempts = 10;
  
  const startServer = () => {
    const tryPort = (attemptPort: number, attempt = 1) => {
      server.listen({
        port: attemptPort,
        host: "0.0.0.0",
        reusePort: true,
      }, () => {
        log(`${app.get("env")} server serving on port ${attemptPort}`);
      }).on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          if (attempt < maxPortAttempts) {
            // Try the next port
            const nextPort = attemptPort + 1;
            log(`Port ${attemptPort} is already in use. Trying port ${nextPort}...`);
            tryPort(nextPort, attempt + 1);
          } else {
            log(`Failed to find an available port after ${maxPortAttempts} attempts.`);
            process.exit(1);
          }
        } else {
          console.error('Server error:', err);
          process.exit(1);
        }
      });
    };
    
    // Start with the initial port
    tryPort(port);
  };

  // Graceful shutdown
  process.on('SIGTERM', () => {
    log('Received SIGTERM. Performing graceful shutdown...');
    server.close(() => {
      log('Server closed');
      process.exit(0);
    });
  });

  startServer();
})();