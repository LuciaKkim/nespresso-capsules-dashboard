#!/usr/bin/env node
/**
 * Paste browser export into data/dashboard-export.json, then:
 *   node scripts/update-seed-from-export.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "data", "dashboard-export.json");
const targets = [
  path.join(root, "src", "seed", "dashboard.json"),
  path.join(root, "public", "seed-dashboard.json"),
];

if (!fs.existsSync(src)) {
  console.error(
    "Missing data/dashboard-export.json — in the app console run:\n" +
      "copy(JSON.stringify(JSON.parse(localStorage.getItem('nespresso-dashboard-v2-en'))))\n" +
      "and save to data/dashboard-export.json",
  );
  process.exit(1);
}

const raw = fs.readFileSync(src, "utf8");
const parsed = JSON.parse(raw);
const pretty = `${JSON.stringify(parsed, null, 2)}\n`;
for (const t of targets) {
  fs.writeFileSync(t, pretty);
  console.log("Wrote", t);
}
