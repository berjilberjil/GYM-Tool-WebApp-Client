import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// Limit to 1 connection per serverless function instance so we don't
// exhaust the Supabase pooler. Transaction-mode pooler handles multiplexing.
const client = postgres(connectionString, { prepare: false, max: 1 });

export const db = drizzle(client, { schema });
