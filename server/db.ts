import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema';

// Controllo di sicurezza per DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error("ERRORE CRITICO: DATABASE_URL non impostato!");
  process.exit(1); // Termina l'applicazione se non abbiamo una connessione database
}

// Log della connessione (oscurato password)
const dbUrlParts = process.env.DATABASE_URL.split('@');
const obscuredDbUrl = dbUrlParts.length > 1 
  ? `${dbUrlParts[0].split(':').slice(0, 2).join(':')}:***@${dbUrlParts[1]}`
  : 'url-non-valido';
  
console.log(`Tentativo di connessione a database: ${obscuredDbUrl}`);

// Create a PostgreSQL connection with simplified options
export const queryClient = postgres(process.env.DATABASE_URL, {
  max: 10, // Reduce max connections for stability
  prepare: false,
  debug: false,
  idle_timeout: 20, // Shorter idle timeout
  connect_timeout: 30, // Longer connection timeout for stability
  transform: {
    undefined: null,
  },
  connection: {
    application_name: 'flupsy-app',
  },
});

// Log di conferma
console.log("Client Postgres creato. Tentativo di istanziare Drizzle ORM...");

// Create a Drizzle instance
export const db = drizzle(queryClient, { schema });

console.log("Inizializzazione database completata con successo!");