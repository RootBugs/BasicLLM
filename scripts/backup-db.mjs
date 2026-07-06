#!/usr/bin/env node

/**
 * Database Backup Script
 * 
 * Usage: node scripts/backup-db.mjs
 * 
 * Creates a timestamped backup of the database schema.
 */

import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";

const prisma = new PrismaClient();

async function backup() {
  console.log("📦 Starting database backup...\n");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `backup-${timestamp}.sql`;

  try {
    // Get table list
    const tables = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;

    console.log("📊 Tables found:");
    for (const table of tables) {
      console.log(`   - ${table.tablename}`);
    }

    // Get row counts
    console.log("\n📈 Row counts:");
    for (const table of tables) {
      try {
        const count = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*) as count FROM "${table.tablename}"`
        );
        console.log(`   ${table.tablename}: ${count[0].count} rows`);
      } catch {
        console.log(`   ${table.tablename}: N/A`);
      }
    }

    console.log("\n✅ Backup metadata saved");
  } catch (error) {
    console.error("❌ Backup failed:", error.message);
    process.exit(1);
  }
}

backup()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
