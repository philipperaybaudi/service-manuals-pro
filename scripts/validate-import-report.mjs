import fs from "fs";

const file = process.argv[2];

if (!file) {
  console.error("Usage: node validate-import-report.mjs report.json");
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(file, "utf-8"));
const data = Array.isArray(raw) ? raw : raw.documents || [];

const errors = [];
const warnings = [];
const slugs = new Set();

for (const doc of data) {
  if (!doc.slug) errors.push(`Missing slug`);
  if (slugs.has(doc.slug)) errors.push(`Duplicate slug: ${doc.slug}`);
  slugs.add(doc.slug);

  if (!doc.title) errors.push(`${doc.slug}: missing title`);
  if (!doc.title_fr) errors.push(`${doc.slug}: missing title_fr`);

  if (!doc.description || doc.description.length < 20)
    warnings.push(`${doc.slug}: weak description`);

  if (!doc.description_fr || doc.description_fr.length < 20)
    warnings.push(`${doc.slug}: weak description_fr`);

  if (doc.description === doc.description_fr)
    errors.push(`${doc.slug}: identical descriptions`);

  if (!doc.price || doc.price <= 0)
    errors.push(`${doc.slug}: invalid price`);

  if (!doc.page_count || doc.page_count === 0)
    errors.push(`${doc.slug}: page_count=0`);
}

console.log("\n--- VALIDATION REPORT ---");

if (errors.length) {
  console.log("\n❌ ERRORS:");
  errors.forEach(e => console.log(" - " + e));
}

if (warnings.length) {
  console.log("\n⚠️ WARNINGS:");
  warnings.forEach(w => console.log(" - " + w));
}

if (errors.length) {
  console.log("\n🚫 IMPORT BLOCKED");
  process.exit(1);
} else {
  console.log("\n✅ VALIDATION PASSED");
}