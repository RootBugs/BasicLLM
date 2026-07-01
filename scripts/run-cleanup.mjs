#!/usr/bin/env node

/**
 * Manual Cleanup Script
 * 
 * Usage: node scripts/run-cleanup.mjs
 */

import { runCleanup } from "../src/lib/cleanup.js";

async function main() {
  console.log("🧹 Starting manual cleanup...\n");
  
  const report = await runCleanup();
  
  console.log("\n📋 Cleanup Report:");
  console.log(`   Duration: ${report.completedAt.getTime() - report.startedAt.getTime()}ms`);
  console.log(`   Total deleted: ${report.totalDeleted.toLocaleString()} rows`);
  
  if (report.results.length > 0) {
    console.log("\n   Breakdown:");
    for (const result of report.results) {
      const status = result.error ? "❌" : "✅";
      console.log(`   ${status} ${result.table}: ${result.deleted.toLocaleString()} rows`);
    }
  }
  
  console.log("\n✅ Cleanup complete");
}

main().catch(console.error);
