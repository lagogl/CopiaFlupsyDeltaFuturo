// File: integrate_direct_operation.js
// Script per integrare la route diretta per le operazioni nel server Express

// Modifica e integra la route direttamente nel file routes.ts
const fs = require('fs');
const path = require('path');

/**
 * Integra la route diretta per le operazioni nel file routes.ts
 * @returns {boolean} - true se l'integrazione è avvenuta con successo
 */
function integrateDirectOperationRoute() {
  console.log("Avvio dell'integrazione della route diretta per le operazioni");
  
  try {
    // 1. Leggi il contenuto del file routes.ts
    const routesFilePath = path.join(__dirname, 'server', 'routes.ts');
    let routesContent = fs.readFileSync(routesFilePath, 'utf8');
    
    // 2. Controlla se l'importazione è già presente
    if (!routesContent.includes('fix_direct_operation_route')) {
      console.log("Aggiunta dell'importazione...");
      
      // Aggiungi l'importazione all'inizio del file
      const importStatement = `import { implementDirectOperationRoute } from '../fix_direct_operation_route';\n`;
      routesContent = importStatement + routesContent;
    }
    
    // 3. Aggiungi la chiamata alla funzione dopo la creazione dell'app Express
    if (!routesContent.includes('implementDirectOperationRoute')) {
      console.log("Aggiunta della chiamata alla funzione...");
      
      // Trova la posizione dopo la creazione dell'app Express
      const appCreationLine = "const app = express();";
      const insertPosition = routesContent.indexOf(appCreationLine) + appCreationLine.length;
      
      // Inserisci la chiamata alla funzione
      const functionCall = `\n\n// Implementa la route diretta per le operazioni
implementDirectOperationRoute(app, db, operations);\n`;
      
      routesContent = routesContent.slice(0, insertPosition) + functionCall + routesContent.slice(insertPosition);
    }
    
    // 4. Salva il file modificato
    fs.writeFileSync(routesFilePath, routesContent);
    
    console.log("Integrazione completata con successo!");
    return true;
  } catch (error) {
    console.error("Errore durante l'integrazione:", error);
    return false;
  }
}

// Modifica anche il lato client per usare la nuova route
function updateClientOperationForm() {
  console.log("Aggiornamento del form operazioni lato client...");
  
  try {
    // 1. Trova il file del componente OperationForm
    const operationFormPath = path.join(__dirname, 'client', 'src', 'components', 'OperationForm.tsx');
    let operationFormContent = fs.readFileSync(operationFormPath, 'utf8');
    
    // 2. Modifica la chiamata API per usare la nuova route diretta
    // Cerca la chiamata apiRequest nel metodo onSubmit
    const apiRequestLine = "apiRequest('/api/operations', formData);";
    const updatedApiRequest = "apiRequest('/api/direct-operations', formData);";
    
    if (operationFormContent.includes(apiRequestLine)) {
      operationFormContent = operationFormContent.replace(apiRequestLine, updatedApiRequest);
      
      // 3. Salva il file modificato
      fs.writeFileSync(operationFormPath, operationFormContent);
      console.log("Form operazioni aggiornato con successo!");
      return true;
    } else {
      console.log("Nessuna occorrenza della chiamata API trovata nel form operazioni");
      return false;
    }
  } catch (error) {
    console.error("Errore durante l'aggiornamento del form operazioni:", error);
    return false;
  }
}

// Esporta le funzioni
module.exports = {
  integrateDirectOperationRoute,
  updateClientOperationForm
};