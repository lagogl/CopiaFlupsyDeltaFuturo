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
  
  // Configura le ottimizzazioni di prestazioni
  console.log("🔧 Configurazione ottimizzazioni prestazioni...");
  try {
    await setupPerformanceOptimizations(app);
    console.log("✅ Ottimizzazioni prestazioni configurate con successo");
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
  // import('./controllers/growth-notification-handler').then(GrowthNotificationHandler => {
  //   try {
  //     // Esegui un controllo iniziale
  //     GrowthNotificationHandler.checkCyclesForTP3000()
  //       .then(count => {
  //         console.log(`Controllo iniziale notifiche accrescimento completato: create ${count} notifiche`);
  //       })
  //       .catch(err => {
  //         console.error('Errore durante il controllo notifiche accrescimento:', err);
  //       });
  //     
  //     // Imposta un timer giornaliero (esegue il controllo a mezzanotte)
  //     const setupDailyCheck = () => {
  //       const now = new Date();
  //       const nextMidnight = new Date(now);
  //       nextMidnight.setDate(now.getDate() + 1);
  //       nextMidnight.setHours(0, 0, 0, 0);
  //       
  //       const msUntilMidnight = nextMidnight.getTime() - now.getTime();
  //       
  //       // Imposta il timeout per il primo controllo a mezzanotte
  //       setTimeout(() => {
  //         // Esegui il controllo
  //         GrowthNotificationHandler.checkCyclesForTP3000()
  //           .then(count => {
  //             console.log(`Controllo giornaliero notifiche accrescimento completato: create ${count} notifiche`);
  //           })
  //           .catch(err => {
  //             console.error('Errore durante il controllo giornaliero notifiche accrescimento:', err);
  //           });
  //         
  //         // Imposta il controllo per tutti i giorni successivi (ogni 24 ore)
  //         setInterval(() => {
  //           GrowthNotificationHandler.checkCyclesForTP3000()
  //             .then(count => {
  //               console.log(`Controllo giornaliero notifiche accrescimento completato: create ${count} notifiche`);
  //             })
  //             .catch(err => {
  //               console.error('Errore durante il controllo giornaliero notifiche accrescimento:', err);
  //             });
  //         }, 24 * 60 * 60 * 1000); // 24 ore in millisecondi
  //       }, msUntilMidnight);
  //       
  //       console.log(`Timer per controllo notifiche accrescimento impostato, prossima esecuzione: ${nextMidnight.toLocaleString()}`);
  //     };
  //     
  //     // Avvia il timer
  //     setupDailyCheck();
  //   } catch (err) {
  //     console.error('Errore durante l\'inizializzazione dello scheduler notifiche accrescimento:', err);
  //   }
  // });

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
  
  const startServer = (attemptPort: number, attempts: number = 0) => {
    if (attempts >= maxPortAttempts) {
      console.error(`Failed to start server after ${maxPortAttempts} attempts`);
      process.exit(1);
      return;
    }

    server.listen(attemptPort, "0.0.0.0", () => {
      log(`${app.get("env")} server serving on port ${attemptPort}`);
    }).on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${attemptPort} is busy, trying port ${attemptPort + 1}...`);
        startServer(attemptPort + 1, attempts + 1);
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
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

  startServer(port);
})();