import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;
console.log("DATABASE_URL", process.env);

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure connection pool for better reliability in serverless environments
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  allowExitOnIdle: true, // Allow the pool to close all clients and exit when all clients are idle
});

// Add error handling for the pool
pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

// Create database instance with error handling
export const db = drizzle({ client: pool, schema });

// Test connection on startup
pool.query('SELECT 1').then(() => {
  console.log('Database connection established successfully');
}).catch((err) => {
  console.error('Failed to establish database connection:', err);
});