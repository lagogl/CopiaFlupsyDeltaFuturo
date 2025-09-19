import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createSaleNotification } from "./sales-notification-handler";
import { registerScreeningNotificationHandler } from "./screening-notification-handler";
import { testDatabaseConnection } from "./debug-db";
import { setupPerformanceOptimizations } from "./index-setup";
import { ensureDatabaseConsistency } from "./database-consistency-service";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rendi disponibile globalmente per l'uso nei controller
globalThis.app = app;

// Middleware per cache-busting nella preview di Replit
app.use((req, res, next) => {
  // Forza no-cache per tutte le risorse nella preview di Replit
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  res.header('ETag', Date.now().toString());
  next();
});

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
  // Test di connessione database
  console.log("\n===== TEST DI CONNESSIONE DATABASE =====");
  try {
    await testDatabaseConnection();
    console.log("✅ Connessione database principale verificata con successo");
  } catch (error) {
    console.error("❌ Errore connessione database principale:", error);
    console.log("⚠️ Continuando con avvio del server...");
  }
  console.log("===== FINE TEST DI CONNESSIONE DATABASE =====\n");
  
  // Configura le ottimizzazioni di prestazioni (indici database critici)
  console.log("🔧 Configurazione ottimizzazioni prestazioni e indici database...");
  try {
    await setupPerformanceOptimizations(app);
    console.log("✅ Ottimizzazioni complete - indici database attivi");
  } catch (error) {
    console.error("⚠️ Errore durante configurazione ottimizzazioni:", error);
  }
  
  // Controllo automatico consistenza database
  console.log("🔍 Controllo consistenza database...");
  try {
    const consistencyResult = await ensureDatabaseConsistency();
    if (consistencyResult.consistent) {
      console.log("✅ Database consistente - nessun problema rilevato");
    } else {
      console.log(`🔧 Database riparato automaticamente - risolte ${consistencyResult.fixedIssues} inconsistenze`);
    }
  } catch (error) {
    console.error("⚠️ Errore durante il controllo consistenza:", error);
  }

  // Inizializza il servizio di sincronizzazione esterno (temporaneamente disabilitato)
  console.log("🔄 Servizio sincronizzazione esterno temporaneamente disabilitato per debug");
  // setTimeout(async () => {
  //   try {
  //     const { ExternalSyncService } = await import('./external-sync-service');
  //     const syncService = new ExternalSyncService();
  //     
  //     // Avvia la sincronizzazione iniziale
  //     console.log("📥 Avvio sincronizzazione iniziale dati esterni...");
  //     await syncService.performFullSync();
  //     console.log("✅ Sincronizzazione iniziale completata");
  //     
  //     // Programma sincronizzazioni periodiche (ogni 30 minuti)
  //     setInterval(async () => {
  //       try {
  //         console.log("🔄 Sincronizzazione periodica in corso...");
  //         await syncService.performFullSync();
  //         console.log("✅ Sincronizzazione periodica completata");
  //       } catch (error) {
  //         console.error("❌ Errore durante sincronizzazione periodica:", error);
  //       }
  //     }, 30 * 60 * 1000); // 30 minuti
  //     
  //     console.log("⏰ Sincronizzazione periodica programmata (ogni 30 minuti)");
  //   } catch (error) {
  //     console.error("❌ Errore durante l'inizializzazione del servizio di sincronizzazione:", error);
  //   }
  // }, 5000); // Avvia dopo 5 secondi per permettere al server di inizializzarsi
  
  const server = await registerRoutes(app);
  
  // Registra il servizio di creazione notifiche per operazioni di vendita
  app.locals.createSaleNotification = createSaleNotification;
  
  // Registra l'handler per le notifiche di vagliatura
  registerScreeningNotificationHandler(app);
  
  // Inizializza lo scheduler per l'invio automatico delle email
  setTimeout(() => {
    import('./controllers/email-controller').then(EmailController => {
      try {
        EmailController.initializeEmailScheduler();
        console.log('📧 Scheduler email inizializzato con successo');
      } catch (err) {
        console.error('⚠️ Errore durante inizializzazione scheduler email:', err);
      }
    });
  }, 2000);
  
  // Importa il controller per le notifiche di crescita
  setTimeout(() => {
    import('./controllers/growth-notification-handler').then(GrowthNotificationHandler => {
      try {
        console.log('🌱 Inizializzazione notifiche di crescita...');
        
        // Setup timer giornaliero semplificato
        const setupDailyCheck = () => {
          const now = new Date();
          const nextMidnight = new Date(now);
          nextMidnight.setDate(now.getDate() + 1);
          nextMidnight.setHours(0, 0, 0, 0);
          
          const msUntilMidnight = nextMidnight.getTime() - now.getTime();
          
          setTimeout(() => {
            GrowthNotificationHandler.checkCyclesForTP3000()
              .then(count => console.log(`Controllo notifiche crescita: create ${count} notifiche`))
              .catch(err => console.error('Errore controllo notifiche crescita:', err));
            
            setInterval(() => {
              GrowthNotificationHandler.checkCyclesForTP3000()
                .then(count => console.log(`Controllo giornaliero notifiche: create ${count} notifiche`))
                .catch(err => console.error('Errore controllo giornaliero:', err));
            }, 24 * 60 * 60 * 1000);
          }, msUntilMidnight);
          
          console.log(`Timer notifiche crescita: prossima esecuzione ${nextMidnight.toLocaleString()}`);
        };
        
        setupDailyCheck();
      } catch (err) {
        console.error('⚠️ Errore inizializzazione notifiche crescita:', err);
      }
    });
  }, 3000);

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
  
  const startServer = (attemptPort: number, attempts: number = 0): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (attempts >= maxPortAttempts) {
        const error = new Error(`Failed to start server after ${maxPortAttempts} attempts`);
        console.error(error.message);
        reject(error);
        return;
      }

      const serverInstance = server.listen(attemptPort, "0.0.0.0", () => {
        log(`${app.get("env")} server serving on port ${attemptPort}`);
        resolve();
      });

      serverInstance.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${attemptPort} is busy, trying port ${attemptPort + 1}...`);
          startServer(attemptPort + 1, attempts + 1)
            .then(resolve)
            .catch(reject);
        } else {
          console.error('Server error:', err);
          reject(err);
        }
      });
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

  // Start the server with proper error handling
  try {
    // Small delay to ensure all initialization is complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    await startServer(port);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();