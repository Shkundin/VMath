import { readdir, readFile } from "fs/promises";
import { join } from "path";
import type { Queryable } from "./database.service";

export async function ensureSchemaMigrationsTable(database: Queryable) {
  await database.query(`
    create table if not exists schema_migrations (
      version text primary key,
      executed_at timestamptz not null default now()
    )
  `);
}

export async function runMigrations(database: Queryable, migrationsDir: string) {
  await ensureSchemaMigrationsTable(database);

  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));

  for (const file of files) {
    const existing = await database.query<{ version: string }>(
      `select version from schema_migrations where version = $1`,
      [file]
    );
    if (existing.rows.length > 0) {
      continue;
    }

    const sql = (await readFile(join(migrationsDir, file), "utf8")).replace(
      /create extension if not exists [^;]+;/gi,
      ""
    );
    await database.query(sql);
    await database.query(`insert into schema_migrations (version) values ($1)`, [file]);
  }
}
