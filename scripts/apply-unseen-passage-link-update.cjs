"use strict";
// Applies only the reviewed four-file diff. Never touches SQLite, Prisma, uploads, or config.
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const root = process.cwd();
const paths = [
  "lib/model-question-fixed-blocks.ts",
  "app/admin/content/[contentId]/page.tsx",
  "app/admin/content/[contentId]/ContentBlocksEditorClient.tsx",
  "app/admin/content/actions.ts",
];
const patch = path.join(root, "changes.patch");
function fail(message) { console.error("STOP:", message); process.exit(1); }
if (!fs.existsSync(path.join(root, "package.json"))) fail("Run from the project root containing package.json.");
if (!fs.existsSync(patch)) fail("Copy changes.patch to the project root first.");
for (const target of paths) if (!fs.existsSync(path.join(root, target))) fail(`Missing ${target}; no files were changed.`);
const check = cp.spawnSync("git", ["apply", "--check", patch], { cwd: root, encoding: "utf8" });
if (check.error) fail(`Git is required: ${check.error.message}. No files changed.`);
if (check.status !== 0) fail(`This patch does not match your current files; merge it manually rather than overwriting changes.\n${check.stderr}`);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backups = path.join(root, "backups", `unseen-passage-source-${stamp}`);
for (const target of paths) {
 const dest = path.join(backups, target);
 fs.mkdirSync(path.dirname(dest), { recursive: true });
 fs.copyFileSync(path.join(root,target),dest);
}
const applied = cp.spawnSync("git", ["apply", patch], { cwd: root, encoding: "utf8" });
if (applied.status !== 0) fail(`Patch not applied. Original source files are in ${backups}. ${applied.stderr}`);
const kinds = fs.readFileSync(path.join(root, paths[0]), "utf8");
const actions = fs.readFileSync(path.join(root, paths[3]), "utf8");
if (!kinds.includes('"paragraph", // Reuse native Paragraph as the Unseen Passage source.') || !actions.includes("export async function bulkDeleteContent")) {
 fail("Post-apply verification failed. Restore source files from backups before proceeding.");
}
console.log("SUCCESS: Unseen Passage linked section update applied.");
console.log("Source backups:", backups);
console.log("Existing database and uploaded files were not changed. Restart Next.js and test.");
