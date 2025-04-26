import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createSaleNotification } from "./sales-notification-handler";
import { testDatabaseConnection } from "./debug-db";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rendi disponibile globalmente per l'uso nei controller
globalThis.app = app;

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
  
  // Registra il servizio di creazione notifiche per operazioni di vendita
  app.locals.createSaleNotification = createSaleNotification;
  
  // Inizializza lo scheduler per l'invio automatico delle email
  import('./controllers/email-controller').then(EmailController => {
    try {
      EmailController.initializeEmailScheduler();
      console.log('Scheduler email inizializzato con successo');
    } catch (err) {
      console.error('Errore durante l\'inizializzazione dello scheduler email:', err);
    }
  });
  
  // Importa il controller per le notifiche di crescita
  import('./controllers/growth-notification-handler').then(GrowthNotificationHandler => {
    try {
      // Esegui un controllo iniziale
      GrowthNotificationHandler.checkCyclesForTP3000()
        .then(count => {
          console.log(`Controllo iniziale notifiche accrescimento completato: create ${count} notifiche`);
        })
        .catch(err => {
          console.error('Errore durante il controllo notifiche accrescimento:', err);
        });
      
      // Imposta un timer giornaliero (esegue il controllo a mezzanotte)
      const setupDailyCheck = () => {
        const now = new Date();
        const nextMidnight = new Date(now);
        nextMidnight.setDate(now.getDate() + 1);
        nextMidnight.setHours(0, 0, 0, 0);
        
        const msUntilMidnight = nextMidnight.getTime() - now.getTime();
        
        // Imposta il timeout per il primo controllo a mezzanotte
        setTimeout(() => {
          // Esegui il controllo
          GrowthNotificationHandler.checkCyclesForTP3000()
            .then(count => {
              console.log(`Controllo giornaliero notifiche accrescimento completato: create ${count} notifiche`);
            })
            .catch(err => {
              console.error('Errore durante il controllo giornaliero notifiche accrescimento:', err);
            });
          
          // Imposta il controllo per tutti i giorni successivi (ogni 24 ore)
          setInterval(() => {
            GrowthNotificationHandler.checkCyclesForTP3000()
              .then(count => {
                console.log(`Controllo giornaliero notifiche accrescimento completato: create ${count} notifiche`);
              })
              .catch(err => {
                console.error('Errore durante il controllo giornaliero notifiche accrescimento:', err);
              });
          }, 24 * 60 * 60 * 1000); // 24 ore in millisecondi
        }, msUntilMidnight);
        
        console.log(`Timer per controllo notifiche accrescimento impostato, prossima esecuzione: ${nextMidnight.toLocaleString()}`);
      };
      
      // Avvia il timer
      setupDailyCheck();
    } catch (err) {
      console.error('Errore durante l\'inizializzazione dello scheduler notifiche accrescimento:', err);
    }
  });

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