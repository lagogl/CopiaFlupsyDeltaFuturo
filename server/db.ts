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

// Create a PostgreSQL connection with optimized options for Neon
export const queryClient = postgres(process.env.DATABASE_URL, {
  max: 20, // Increase max connections for better concurrency
  prepare: false,
  debug: false, // Disable debug in production
  idle_timeout: 300, // 5 minutes - keep connections alive longer
  connect_timeout: 10, // Reduce connection timeout
  max_lifetime: 60 * 60, // Connection TTL: 1 hour
  transform: {
    // Optimize data transformation
    undefined: null,
  },
  connection: {
    application_name: 'flupsy-app',
  },
  // Reduce logging noise in production
  onnotice: process.env.NODE_ENV === 'development' ? 
    (notice) => console.log('PostgreSQL Notice:', notice.message) : undefined,
  onparameter: process.env.NODE_ENV === 'development' ? 
    (param, value) => console.log(`PostgreSQL Parameter: ${param} = ${value}`) : undefined,
});

// Log di conferma
console.log("Client Postgres creato. Tentativo di istanziare Drizzle ORM...");

// Create a Drizzle instance
export const db = drizzle(queryClient, { schema });

console.log("Inizializzazione database completata con successo!");