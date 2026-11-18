/**
 * eLesson: Class 6/7 English 1st Paper chooser + missing bulkDeleteContent export.
 * NON-DESTRUCTIVE PATCH: only edits 3 local source files, not any DB or upload file.
 * Existing local source is preserved using timestamped backups.
 * Re-running is idempotent and does not overwrite previously saved edits.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const FILES = [
  'lib/model-question-fixed-blocks.ts',
  'app/admin/content/[contentId]/ContentBlocksEditorClient.tsx',
  'app/admin/content/actions.ts',
];

const FIXED_KINDS = [
  'seen-passage-one', 'mcq', 'question-answer',
  'seen-passage-two', 'gap-fill-first-paper', 'synonyms-antonyms',
  'information-transfer', 'true-false', 'writing-summary',
  'table-completion', 'rearrange-sentence', 'question-from-poems',
];

const FIXED_GROUPS = `const MODEL_QUESTION_CLASS_6_7_GROUPS: typeof MODEL_QUESTION_BLOCK_GROUPS = [
  {
    title: "Seen — Passage 1",
    description: "Passage 1, MCQ, and Answering Questions.",
    sections: [{ title: "", kinds: ["seen-passage-one", "mcq", "question-answer"] }],
  },
  {
    title: "Seen — Passage 2",
    description: "Passage 2, Fill in the Gaps, and Synonyms / Antonyms.",
    sections: [{ title: "", kinds: ["seen-passage-two", "gap-fill-first-paper", "synonyms-antonyms"] }],
  },
  {
    title: "Unseen",
    description: "Information Transfer, True / False, and Summary.",
    sections: [{ title: "", kinds: ["information-transfer", "true-false", "writing-summary"] }],
  },
  {
    title: "Other Reading Questions",
    description: "Table Completion, Rearrange Sentence, and Question from Poems.",
    sections: [{ title: "", kinds: ["table-completion", "rearrange-sentence", "question-from-poems"] }],
  },
];`;

const BULK_ACTION = `/**
 * Existing AdminCurriculumContentManager bulk-delete action.
 * Uses the existing deleteContent() cleanup (including vocabulary assets/audit).
 * Explicitly protects model-question editor records from accidental bulk deletion.
 */
export async function bulkDeleteContent(input: unknown) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const parsed = z.object({
    ids: z.array(z.string().trim().min(1)).min(1).max(100).refine(
      (ids) => new Set(ids).size === ids.length,
      "Duplicate content ids are not allowed.",
    ),
  }).parse(input);

  // Check the full selection BEFORE modifying any record.
  const contents = await prisma.content.findMany({
    where: { id: { in: parsed.ids }, organizationId: user.organizationId },
    select: { id: true },
  });
  if (contents.length !== parsed.ids.length) {
    throw new Error("Some selected content records no longer exist or are not accessible.");
  }

  // Model Question editor content must be managed from its own set editor.
  const linkedSets = await prisma.modelQuestionSet.findMany({
    where: {
      organizationId: user.organizationId,
      editorContentId: { in: parsed.ids },
    },
    select: { id: true },
  });
  if (linkedSets.length > 0) {
    throw new Error("Cannot bulk-delete content linked to a model-question set.");
  }

  // deleteContent already validates ownership and deletes each content and
  // its dependent blocks transactionally, updates storage, and logs audits.
  for (const id of parsed.ids) {
    await deleteContent(id);
  }
  return { deletedCount: parsed.ids.length };
}
`;

function requireReplace(source, pattern, replacement, label) {
  if (!pattern.test(source)) throw new Error(`Cannot find safe patch location: ${label}. No files were written.`);
  return source.replace(pattern, replacement);
}

function patchKinds(source) {
  const kindList = FIXED_KINDS.map((kind) => `  "${kind}",`).join('\n');
  const pattern = /(export const CLASS_6_7_MODEL_QUESTION_KINDS = \[)[\s\S]*?(\] as const;)/;
  const before = source.match(pattern);
  if (!before || !before[0].includes('seen-passage-one') || !before[0].includes('rearrange-sentence')) {
    throw new Error('Unexpected fixed-kind registry; refusing to replace it.');
  }
  return requireReplace(source, pattern, `$1\n${kindList}\n$2`, 'fixed-kind registry');
}

function patchEditor(source) {
  if (!source.includes('kind: "question-from-poems"') || !source.includes('CLASS_6_7_BLOCK_SEQUENCE')) {
    throw new Error('Editor does not match the known native block editor; refusing to patch.');
  }
  const groups = /const MODEL_QUESTION_CLASS_6_7_GROUPS: typeof MODEL_QUESTION_BLOCK_GROUPS = \[[\s\S]*?\n\];(?=\s*const CLASS_6_7_BLOCK_SEQUENCE)/;
  source = requireReplace(source, groups, FIXED_GROUPS, 'class 6/7 grouped chooser');
  source = source
    .replace(/Only these eleven choices/i, 'Only these twelve choices')
    .replace(/Eleven fixed block types/g, 'Twelve fixed block types')
    .replace(/eleven fixed block types/g, 'twelve fixed block types')
    .replace(/All 11 sections added/g, 'All 12 sections added');
  if (!source.includes('"question-from-poems"') || !source.includes('All 12 sections added')) {
    throw new Error('Editor post-patch verification failed; no files were written.');
  }
  return source;
}

function patchActions(source) {
  if (!source.includes('export async function createContentBlock(input: unknown)') ||
      !source.includes('export async function deleteContent(id: string)') ||
      !source.includes('CLASS_6_7_MODEL_QUESTION_KINDS')) {
    throw new Error('Server actions do not match the expected project; refusing to patch.');
  }
  source = source.replace(/Only the (?:nine|eleven) fixed English 1st Paper question types/g,
    'Only the twelve fixed English 1st Paper question types');
  if (!/export\s+(?:async\s+function\s+bulkDeleteContent\s*\(|(?:const|let)\s+bulkDeleteContent\s*=)/.test(source)) {
    source = source.replace(
      /(?=export async function createContentBlock\(input: unknown\))/, `${BULK_ACTION}\n`,
    );
  }
  if (!/export\s+(?:async\s+function\s+bulkDeleteContent\s*\(|(?:const|let)\s+bulkDeleteContent\s*=)/.test(source)) {
    throw new Error('bulkDeleteContent export not found after patch.');
  }
  return source;
}

function main() {
  const entries = FILES.map((rel) => {
    const target = path.join(ROOT, rel);
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      throw new Error(`Missing source file: ${rel}. Nothing was changed.`);
    }
    return { rel, target, original: fs.readFileSync(target, 'utf8') };
  });
  const patched = entries.map((entry) => ({
    ...entry,
    next: entry.rel.startsWith('lib/') ? patchKinds(entry.original)
      : entry.rel.endsWith('actions.ts') ? patchActions(entry.original)
      : patchEditor(entry.original),
  }));
  const edited = patched.filter((x) => x.original !== x.next);
  if (!edited.length) {
    process.stdout.write('Already up to date. No files changed.\n');
    return;
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = path.join(ROOT, 'backups', `model-question-ui-bulk-export-${timestamp}`);
  // Save all backups first. Do not write any changed sources until this succeeds.
  for (const entry of edited) {
    const destination = path.join(backup, entry.rel);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, entry.original);
  }
  for (const entry of edited) {
    const temporary = `${entry.target}.eLesson-patch-tmp`;
    fs.writeFileSync(temporary, entry.next);
    fs.renameSync(temporary, entry.target);
    process.stdout.write(`Updated: ${entry.rel}\n`);
  }
  process.stdout.write(`Original source backups: ${backup}\n`);
  process.stdout.write('Only source files were changed. No database or upload files accessed.\n');
}
try { main(); } catch (error) { process.stderr.write(`Safe patch stopped: ${error.message}\n`); process.exitCode = 1; }
