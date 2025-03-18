import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema';

// Create a PostgreSQL connection
const queryClient = postgres(process.env.DATABASE_URL!, {
  max: 10, // Max number of connections in the pool
  prepare: false,
});

// Create a Drizzle instance
export const db = drizzle(queryClient, { schema });