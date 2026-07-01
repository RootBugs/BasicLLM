#!/usr/bin/env node

/**
 * Database Health Check Script
 * 
 * Usage: node scripts/db-health.mjs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkHealth() {
  console.log("🔍 Database Health Check\n");

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Connection: OK");
  } catch (error) {
    console.log("❌ Connection: FAILED");
    console.error(error.message);
    process.exit(1);
  }

  console.log("\n📊 Table Statistics:");
  const tables = ["users", "apiKeys", "requestLogs", "conversations", "rateLimits"];

  for (const table of tables) {
    try {
      const count = await prisma[table].count();
      console.log(`   ${table}: ${count.toLocaleString()} rows`);
    } catch {
      console.log(`   ${table}: N/A`);
    }
  }

  console.log("\n✅ Health check complete");
}

checkHealth()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
