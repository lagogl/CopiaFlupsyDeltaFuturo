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

// Create a PostgreSQL connection with enhanced options
export const queryClient = postgres(process.env.DATABASE_URL, {
  max: 5, // Reduce max connections
  prepare: false,
  debug: false, // Disable debug in production
  idle_timeout: 20,
  connect_timeout: 30,
  max_lifetime: 60 * 30, // Connection TTL: 30 minutes
  connection: {
    application_name: 'flupsy-app',
  },
  onnotice: (notice) => console.error('PostgreSQL Notice:', notice),
  onparameter: (param) => console.error('PostgreSQL Parameter:', param),
});

// Log di conferma
console.log("Client Postgres creato. Tentativo di istanziare Drizzle ORM...");

// Create a Drizzle instance
export const db = drizzle(queryClient, { schema });

console.log("Inizializzazione database completata con successo!");