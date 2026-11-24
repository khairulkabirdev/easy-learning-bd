#!/usr/bin/env node
// eLesson: non-destructive model-paper title + instructions patch installer.
// Keeps pre-patch copies of each file; never writes to databases or uploads.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = process.cwd();
const patch = path.join(__dirname, 'model-block-title-description.patch');
const files = ["app/admin/content/[contentId]/ContentBlocksEditorClient.tsx", "app/admin/content/[contentId]/page.tsx", "app/admin/content/actions.ts", "app/admin/content/content-types.ts", "app/user/lessons/data.ts", "app/user/model-questions/[subjectId]/[setId]/ModelPaperTest.tsx", "lib/model-paper-types.ts", "lib/model-question-papers.ts", "prisma/init.sql", "prisma/schema.prisma", "scripts/repair-sqlite-schema.cjs"];
if (!fs.existsSync(path.join(root, 'prisma', 'schema.prisma')) ||
    !fs.existsSync(path.join(root, 'app', 'admin', 'content', 'actions.ts'))) {
  console.error('Run this command from the eLesson project root. No files were changed.');
  process.exit(1);
}
function git(args) {
  return cp.spawnSync('git', ['-c', 'core.safecrlf=false', 'apply', ...args, patch], {
    cwd: root, encoding: 'utf8', shell: false,
  });
}
const already = git(['--reverse','--check']);
if (already.status === 0) {
  console.log('The block Title / Short Description patch is already installed.');
  process.exit(0);
}
const check = git(['--check']);
if (check.status !== 0) {
  console.error('Cannot safely merge this patch with the current source files.');
  console.error('No project files were changed.');
  console.error((check.stderr || check.error?.message || '').slice(0, 2500));
  console.error('Please merge the precise changes manually instead of overwriting newer code.');
  process.exit(1);
}
// Backup after verification and before writing, preserving newer source files.
const stamp = new Date().toISOString().replace(/[:.]/g,'-');
const backup = path.join(root, '.elesson-source-backups', `paper-headings-${stamp}`);
for (const file of files) {
  const source = path.join(root, file);
  if (!fs.existsSync(source)) {
    console.error('Missing file: '+file+'; no files were changed.'); process.exit(1);
  }
}
for (const file of files) {
  const from = path.join(root, file);
  const to = path.join(backup, file);
  fs.mkdirSync(path.dirname(to), {recursive: true});
  fs.copyFileSync(from,to);
}
const installed = git([]);
if (installed.status !== 0) {
  console.error('Patch failed unexpectedly; your source backups are at:', backup);
  console.error((installed.stderr || '').slice(0, 2000));
  process.exit(1);
}
console.log('Source patch installed. Source backup:',backup);
console.log('Next: npm run prepare:sqlite  (additive columns only)');
console.log('Then: npm run dev');
