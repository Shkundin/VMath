import { join } from "path";
import { loadAppConfig } from "../config/app-config";
import { createPgPool } from "./database.service";
import { runMigrations } from "./migration-runner";

async function main() {
  const config = loadAppConfig();
  const pool = createPgPool(config);

  try {
    await runMigrations(pool, join(process.cwd(), "src", "database", "migrations"));
    console.log("Database migrations completed");
  } finally {
    await pool.end();
  }
}

void main();
