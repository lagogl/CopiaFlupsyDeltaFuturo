// File: websocket_operations_integration.js
// Questo file integra le funzionalità WebSocket con il sistema di operazioni

// Importa le funzionalità per WebSocket e operazioni
const { configureWebSocketServer } = require('./fix_websocket_server');
const { createOperationSafely, handleCreateOperation } = require('./fix_improved_operations');

/**
 * Configura il WebSocket e l'integrazione con le operazioni
 * @param {Object} httpServer - Il server HTTP di Express
 * @param {Object} storage - L'oggetto storage per interagire con il database
 * @returns {Object} - Un oggetto con tutte le utilità configurate
 */
function setupWebSocketAndOperations(httpServer, storage) {
  // Configura il server WebSocket
  const wsServer = configureWebSocketServer(httpServer);
  const { broadcastMessage } = wsServer;
  
  console.log("WebSocket server configurato con successo");
  
  // Definisci la funzione di broadcast globale
  global.broadcastUpdate = (type, data) => {
    try {
      console.log(`Broadcast update: ${type}`, data);
      return broadcastMessage(type, data);
    } catch (error) {
      console.error("Error in broadcastUpdate:", error);
      return false;
    }
  };
  
  console.log("Funzione broadcastUpdate definita a livello globale");
  
  // Funzioni helper per le operazioni
  const operationHelpers = {
    // Crea un'operazione e invia automaticamente aggiornamenti via WebSocket
    async createOperationWithNotification(operationData) {
      const result = await createOperationSafely(operationData, storage);
      
      if (result.success) {
        // La notifica WebSocket viene già gestita in createOperationSafely
        console.log("Operazione creata e notifica inviata");
      } else {
        console.error("Errore nella creazione dell'operazione:", result.error);
      }
      
      return result;
    },
    
    // Funzione per registrare route Express che gestiscono operazioni
    registerExpressRoutes(app) {
      // POST per creare una nuova operazione
      app.post("/api/operations", async (req, res) => {
        await handleCreateOperation(req, res, storage);
      });
      
      // PUT per aggiornare un'operazione
      app.put("/api/operations/:id", async (req, res) => {
        try {
          const id = parseInt(req.params.id);
          if (isNaN(id)) {
            return res.status(400).json({ message: "ID operazione non valido" });
          }
          
          const updatedOperation = await storage.updateOperation(id, req.body);
          
          if (!updatedOperation) {
            return res.status(404).json({ message: "Operazione non trovata" });
          }
          
          // Invia notifica di aggiornamento
          global.broadcastUpdate('operation_updated', {
            operation: updatedOperation,
            message: `Operazione ${id} aggiornata`
          });
          
          return res.json(updatedOperation);
        } catch (error) {
          console.error("Errore nell'aggiornamento dell'operazione:", error);
          return res.status(500).json({ 
            message: `Errore durante l'aggiornamento: ${error.message || String(error)}` 
          });
        }
      });
      
      // DELETE per eliminare un'operazione
      app.delete("/api/operations/:id", async (req, res) => {
        try {
          const id = parseInt(req.params.id);
          if (isNaN(id)) {
            return res.status(400).json({ message: "ID operazione non valido" });
          }
          
          // Ottieni l'operazione prima di eliminarla per la notifica
          const operation = await storage.getOperation(id);
          if (!operation) {
            return res.status(404).json({ message: "Operazione non trovata" });
          }
          
          const success = await storage.deleteOperation(id);
          
          if (success) {
            // Invia notifica di eliminazione
            global.broadcastUpdate('operation_deleted', {
              operationId: id,
              basketId: operation.basketId,
              message: `Operazione ${id} eliminata`
            });
            
            return res.status(200).json({ message: "Operazione eliminata con successo" });
          } else {
            return res.status(500).json({ message: "Impossibile eliminare l'operazione" });
          }
        } catch (error) {
          console.error("Errore nell'eliminazione dell'operazione:", error);
          return res.status(500).json({ 
            message: `Errore durante l'eliminazione: ${error.message || String(error)}` 
          });
        }
      });
      
      console.log("Route per le operazioni registrate");
      
      return app;
    }
  };
  
  // Restituisci tutte le utilità configurate
  return {
    wsServer,
    broadcastMessage,
    operationHelpers
  };
}

module.exports = {
  setupWebSocketAndOperations
};