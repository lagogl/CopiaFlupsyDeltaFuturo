import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createSaleNotification } from "./sales-notification-handler";
import { registerScreeningNotificationHandler } from "./screening-notification-handler";
import { testDatabaseConnection } from "./debug-db";
import { setupPerformanceOptimizations } from "./index-setup";
import { ensureDatabaseConsistency } from "./database-consistency-service";
import { createSecureApiLogger, secureLogger } from "./utils/secure-logging";
import { createSmartCacheMiddleware, createReplitPreviewCacheMiddleware } from "./utils/smart-cache";

const app = express();

// CRITICAL FIX: Method override middleware to bypass Replit proxy PATCH/PUT blocking
app.use((req, res, next) => {
  // Only apply to /api routes for security
  if (req.path.startsWith('/api/')) {
    const override = req.headers['x-http-method-override'] || req.query._method;
    if (override && ['PUT', 'PATCH', 'DELETE'].includes((override as string).toUpperCase())) {
      const originalMethod = req.method;
      req.method = (override as string).toUpperCase();
      console.log(`[METHOD-OVERRIDE] ${originalMethod} ${req.path} → ${req.method} (via header/query)`);
    }
  }
  next();
});

// OPTIONS preflight responder for CORS support
app.options('/api/*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-HTTP-Method-Override');
  res.header('Access-Control-Max-Age', '600');
  res.status(204).send();
});

// Method-override workaround is now implemented globally in frontend

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rendi disponibile globalmente per l'uso nei controller
globalThis.app = app;

// Smart cache middleware - TEMPORANEAMENTE DISABILITATO per aggiornamento asset frontend
// if (process.env.REPL_ID && process.env.NODE_ENV !== 'production') {
//   // Replit preview environment - minimal caching for development
//   app.use(createReplitPreviewCacheMiddleware());
//   secureLogger.info('Cache middleware: Replit preview mode (minimal caching)');
// } else {
//   // Production or local development - smart caching
//   app.use(createSmartCacheMiddleware());
//   secureLogger.info(`Cache middleware: Smart caching mode (env: ${process.env.NODE_ENV})`);
// }
secureLogger.info('Cache middleware: DISABLED - forcing fresh asset download');

// Secure API logging middleware - environment-gated with PII protection
app.use(createSecureApiLogger());
secureLogger.info('Logging middleware: Secure API logger initialized with PII protection');

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
    // CRITICAL FIX: Isolate Vite on dedicated Router to prevent API interception
    const ui = express.Router();
    await setupVite(ui, server);
    
    // Mount Vite router with filters: exclude /api requests and non-GET/HEAD methods
    app.use((req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      return ui(req, res, next);
    });
    
    // Ensure API fallthrough never reaches Vite - return proper JSON 404 for unknown API routes
    app.use('/api', (_req, res) => res.status(404).json({ message: 'API endpoint not found' }));
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