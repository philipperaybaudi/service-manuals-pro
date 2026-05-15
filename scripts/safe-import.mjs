import { execSync } from "child_process";

const category = process.argv[2];

if (!category) {
  console.error("Usage: node safe-import.mjs Automobile");
  process.exit(1);
}

const report = `scripts/docs-a-classer-report-${category.toLowerCase()}.json`;

try {
  console.log("\n🔍 STEP 1: VALIDATION");
  execSync(`node scripts/validate-import-report.mjs ${report}`, { stdio: "inherit" });

  console.log("\n🧪 STEP 2: DRY RUN");
  execSync(`node scripts/import-from-report.mjs ${category} --dry-run`, { stdio: "inherit" });

  console.log("\n⚠️ CONFIRM IMPORT (type YES):");
  process.stdin.setEncoding("utf8");

  process.stdin.once("data", (data) => {
    if (data.trim() !== "YES") {
      console.log("❌ CANCELLED");
      process.exit(0);
    }

    console.log("\n🚀 STEP 3: REAL IMPORT");
    execSync(`node scripts/import-from-report.mjs ${category}`, { stdio: "inherit" });

    console.log("\n🔍 STEP 4: GLOBAL AUDIT");
    execSync(`node scripts/audit-global.mjs`, { stdio: "inherit" });

    console.log("\n✅ IMPORT COMPLETED");
  });

} catch (e) {
  console.error("\n💥 PROCESS STOPPED");
  process.exit(1);
}