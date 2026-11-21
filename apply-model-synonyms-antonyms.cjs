#!/usr/bin/env node
"use strict";
// Apply only the Synonyms / Antonyms answer-type change to the CURRENT eLesson source.
// Does not touch database files. Refuses to write if any source has a conflicting edit.
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "model-synonyms-antonyms-changes.json"), "utf8"));
if (manifest.version !== 1 || !Array.isArray(manifest.changes)) throw new Error("Invalid patch manifest.");
const changesToWrite = [];
try {
  for (const file of manifest.changes) {
    const target = path.resolve(root, file.path);
    if (!target.startsWith(root + path.sep)) throw new Error("Invalid patch path: " + file.path);
    if (!fs.existsSync(target)) throw new Error(`File missing: ${file.path}. No changes applied.`);
    const raw = fs.readFileSync(target, "utf8");
    const eol = raw.includes("\r\n") ? "\r\n" : "\n";
    let text = raw.replace(/\r\n/g, "\n");
    for (const [i, hunk] of file.hunks.entries()) {
      const count = text.split(hunk.before).length - 1;
      const applied = text.includes(hunk.after);
      if (count === 1) {
        text = text.replace(hunk.before, hunk.after);
      } else if (count === 0 && applied) {
        // This hunk is already present; safe on repeated runs.
      } else {
        throw new Error(`Patch conflict in ${file.path}, change ${i + 1}. Expected one matching source section (found ${count}). No files changed.`);
      }
    }
    const output = eol === "\r\n" ? text.replace(/\n/g, "\r\n") : text;
    if (output !== raw) changesToWrite.push({ file: file.path, target, raw, output });
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

if (!changesToWrite.length) {
  console.log("Synonyms / Antonyms update is already installed. No changes needed.");
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backup = path.join(root, ".elesson-patch-backups", `synonyms-answer-type-${stamp}`);
const completed = [];
try {
  for (const change of changesToWrite) {
    const backupFile = path.join(backup, change.file);
    fs.mkdirSync(path.dirname(backupFile), { recursive: true });
    fs.copyFileSync(change.target, backupFile);
  }
  for (const change of changesToWrite) {
    const temp = change.target + ".synonyms-update-temp";
    fs.writeFileSync(temp, change.output, "utf8");
    fs.renameSync(temp, change.target);
    completed.push(change);
    console.log("Updated: " + change.file);
  }
  console.log(`\nSource backups saved in ${backup}`);
  console.log("Next: npm run prepare:sqlite && npm run dev");
} catch (err) {
  for (const change of completed) fs.writeFileSync(change.target, change.raw, "utf8");
  console.error("Unable to complete update. Previously changed source files restored.", err);
  process.exit(1);
}
