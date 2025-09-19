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

// Create a PostgreSQL connection with optimized options for high-performance Switch API
export const queryClient = postgres(process.env.DATABASE_URL, {
  max: 25, // Increased connection pool for better performance
  prepare: true, // Enable prepared statements for better performance
  debug: false,
  idle_timeout: 30, // Increased idle timeout to avoid reconnections
  connect_timeout: 10, // Optimized connection timeout
  connection_timeout_millis: 10000,
  transform: {
    undefined: null,
  },
  connection: {
    application_name: 'flupsy-app-optimized',
    statement_timeout: '5s', // Prevent stuck queries
  },
});

// Log di conferma
console.log("Client Postgres creato. Tentativo di istanziare Drizzle ORM...");

// Create a Drizzle instance
export const db = drizzle(queryClient, { schema });

console.log("Inizializzazione database completata con successo!");