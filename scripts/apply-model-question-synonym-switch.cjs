#!/usr/bin/env node
"use strict";
/*
 * Non-destructive eLesson source patch. Applies the previous answer-type support
 * when absent and places per-word Synonym/Antonym question switches directly
 * alongside the inputs on the Model Question Import editor.
 * No DB writes are performed by this script.
 */
const fs = require("node:fs");
const path = require("node:path");
const root = fs.realpathSync(process.cwd());
const patchRoot = __dirname;
const manifest = JSON.parse(fs.readFileSync(path.join(patchRoot, "synonym-question-switch-changes.json"), "utf8"));
if (manifest.version !== 2 || !Array.isArray(manifest.changes)) throw new Error("Invalid eLesson patch manifest.");
const planned = [];
const count = (s, part) => part ? s.split(part).length - 1 : 0;
const toUnix = (s) => s.replace(/\r\n/g, "\n");

try {
  for (const item of manifest.changes) {
    const target = path.resolve(root, item.path);
    if (!target.startsWith(root + path.sep)) throw new Error("Invalid source file path: " + item.path);
    if (!fs.existsSync(target)) throw new Error("Missing project source: " + item.path + ". No changes were applied.");
    const raw = fs.readFileSync(target, "utf8");
    let next = toUnix(raw);
    for (let i = 0; i < item.hunks.length; i++) {
      const h = item.hunks[i];
      if (count(next, h.after) === 1) continue;
      if (h.intermediate && count(next, h.intermediate) === 1) {
        next = next.replace(h.intermediate, h.after);
        continue;
      }
      if (count(next, h.before) === 1) {
        next = next.replace(h.before, h.after);
        continue;
      }
      // The November student dashboard update already imports ModelPaperMode
      // in another location. Do not duplicate the import or overwrite its layout.
      if (item.path === "app/user/lessons/student-content.tsx" && i === 1 &&
          next.includes('from "@/components/app/ModelPaperMode";') && next.includes("ModelPaperMode")) {
        continue;
      }
      throw new Error("Source conflict: " + item.path + " (section " + (i + 1) + "). Existing code differs; no files were changed. Please use current source versions.");
    }
    if (next.includes('data-elesson-synonym-question-switch="true"') &&
        !next.includes('answerType: "synonym"')) {
      throw new Error("Question switch state wiring is incomplete in " + item.path);
    }
    if (next !== toUnix(raw)) planned.push({ path: item.path, target, raw, result: raw.includes("\r\n") ? next.replace(/\n/g, "\r\n") : next });
  }
} catch (err) {
  console.error(err.message || String(err));
  process.exit(1);
}
if (!planned.length) {
  console.log("Question switches are already installed; no source changes needed.");
  process.exit(0);
}
const when = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(root, ".elesson-patch-backups", "synonym-question-switch-" + when);
const completed = [];
try {
  for (const f of planned) {
    const backupPath = path.join(backupDir, f.path);
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.writeFileSync(backupPath, f.raw, "utf8");
  }
  for (const f of planned) {
    const tmp = f.target + ".synonym-switch-tmp";
    fs.writeFileSync(tmp, f.result, "utf8");
    fs.renameSync(tmp, f.target);
    completed.push(f);
    console.log("Updated: " + f.path);
  }
  console.log("Source backups: " + backupDir);
  console.log("Next: npm run prepare:sqlite && npm run dev");
} catch (err) {
  for (const f of completed.reverse()) fs.writeFileSync(f.target, f.raw, "utf8");
  console.error("Patch did not complete; changed files restored.", err.message || err);
  process.exit(1);
}
