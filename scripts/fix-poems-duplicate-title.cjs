#!/usr/bin/env node
"use strict";
// Remove the duplicate inner Title input for Question from Poems in Model Question Import.
// The shared ContentBlock Title field remains the single editable model-paper title.
// Ordinary content and Question from Story retain their existing Title fields.
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const rel = path.join("app", "admin", "content", "[contentId]", "ContentBlocksEditorClient.tsx");
const target = path.join(root, rel);
if (!fs.existsSync(target)) {
  console.error(`Not found: ${target}\nRun this from the eLesson project root.`);
  process.exit(1);
}
const source = fs.readFileSync(target, "utf8");
const marker = '(block.kind === "question-from-poems" || block.kind === "question-from-story") && block.questionAnswerExercise ? (';
const start = source.indexOf(marker);
if (start < 0 || source.indexOf(marker, start + marker.length) >= 0) {
  console.error("The Question from Poems/Story editor could not be located uniquely. No changes made.");
  process.exit(1);
}
if (!source.includes('id={`block-paper-title-${block.id}`}')) {
  console.error("The shared Model Question Title field is absent. No changes made so that the only Title input is not removed.");
  process.exit(1);
}
const endMarker = '<div className="flex items-center justify-between gap-4 border-t pt-5">';
const end = source.indexOf(endMarker, start);
if (end < 0 || end - start > 4000) {
  console.error("The poem editor layout differs from the expected version. No changes made.");
  process.exit(1);
}
const before = source.slice(start,end);
const already = 'chooserGroupMode !== "model-question" || block.kind === "question-from-story"';
if (before.includes(already)) {
  console.log("Already updated: Question from Poems has only the shared Title field in Model Question Import.");
  process.exit(0);
}
const open = '                  <FieldGroup className="gap-5">';
const close = '                  </FieldGroup>';
if (before.split(open).length !== 2 || before.split(close).length !== 2) {
  console.error("The legacy poem Title field could not be matched safely. No changes made.");
  process.exit(1);
}
const updated = before
  .replace(open, '                  {chooserGroupMode !== "model-question" || block.kind === "question-from-story" ? (\n                    <FieldGroup className="gap-5">')
  .replace(close, '                    </FieldGroup>\n                  ) : null}');
const next = source.slice(0,start) + updated + source.slice(end);
if (next === source) {
  console.error("No changes produced."); process.exit(1);
}
const backupDir = path.join(root,".safe-code-backups");
fs.mkdirSync(backupDir,{recursive:true});
const stamp = new Date().toISOString().replace(/[:.]/g,"-");
const backup = path.join(backupDir,`ContentBlocksEditorClient.poems-title.${stamp}.bak`);
fs.copyFileSync(target,backup);
fs.writeFileSync(target,next,"utf8");
console.log(`Updated: ${rel}`);
console.log("Only the shared model-paper Title input is visible for Question from Poems.");
console.log(`Backup: ${backup}`);
console.log("No saved content or database was changed.");
