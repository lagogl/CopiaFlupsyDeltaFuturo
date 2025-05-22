import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createSaleNotification } from "./sales-notification-handler";
import { registerScreeningNotificationHandler } from "./screening-notification-handler";
import { testDatabaseConnection } from "./debug-db";

// Abilitiamo le API ottimizzate per migliorare le prestazioni del server
process.env.USE_OPTIMIZED_APIS = "true";

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
  // Bypassiamo temporaneamente il test del database per poter testare le modifiche al frontend
  console.log("\n===== TEST DI CONNESSIONE DATABASE =====");
  console.log("Test di connessione database temporaneamente disabilitato per debug");
  console.log("===== FINE TEST DI CONNESSIONE DATABASE =====\n");
  
  const server = await registerRoutes(app);
  
  // Registra il servizio di creazione notifiche per operazioni di vendita
  app.locals.createSaleNotification = createSaleNotification;
  
  // Registra l'handler per le notifiche di vagliatura
  registerScreeningNotificationHandler(app);
  
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
    server.listen(5000, "0.0.0.0", () => {
      log(`${app.get("env")} server serving on port 5000`);
    }).on('error', (err) => {
      console.error('Server error:', err);
      process.exit(1);
    });
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