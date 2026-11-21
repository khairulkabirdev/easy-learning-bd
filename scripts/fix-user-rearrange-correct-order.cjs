#!/usr/bin/env node
/**
 * eLesson Rearrange Sentence: defensive student-viewer hotfix.
 * Run once from the eLesson project root:
 *   node scripts/fix-user-rearrange-correct-order.cjs
 *
 * Patches only the student viewer. Existing questions, the SQLite database,
 * images/uploads, and the admin editor are never modified.
 */
const fs = require('node:fs');
const path = require('node:path');

const target = path.resolve(process.cwd(), 'components/app/UserRearrangeSentenceViewer.tsx');
if (!fs.existsSync(target)) {
  console.error('Cannot find components/app/UserRearrangeSentenceViewer.tsx. Run this command from your eLesson project root.');
  process.exit(1);
}

let source = fs.readFileSync(target, 'utf8');
const guardMarker = 'eLesson: safe rearrange answer-key guard';
if (source.includes(guardMarker)) {
  console.log('The student viewer already contains the safe rearrange answer-key guard. No changes made.');
  process.exit(0);
}

if (!source.includes('document.correctOrder') || !/\bconst\s+completeAnswerKey\s*=/.test(source)) {
  console.error('Unexpected student viewer version. No files were changed.');
  process.exit(1);
}

// Preserve ALL other editor and practice logic, including existing buttons,
// validations and drag/drop interaction. Only replace raw answer-key access.
source = source.replace(/\bdocument\.correctOrder\b/g, 'safeCorrectOrder');

const guard = String.raw`  // eLesson: safe rearrange answer-key guard
  // Works with legacy row-ID keys and new per-letter answer sequences.
  // Incomplete/invalid keys must never be accepted as correct answers.
  const safeCorrectOrder = useMemo((): string[] => {
    const rows = Array.isArray(document.rows) ? document.rows : [];
    const ids = rows.map((row) => row.id);
    const idSet = new Set(ids);

    const letterAt = (index: number): string => {
      let value = index + 1;
      let label = "";
      while (value > 0) {
        value -= 1;
        label = String.fromCharCode(97 + (value % 26)) + label;
        value = Math.floor(value / 26);
      }
      return label;
    };
    const labelToId = new Map(rows.map((row, index) => [letterAt(index), row.id]));
    const rawDocument = document as typeof document & {
      correctOrder?: unknown;
      answerSequence?: unknown;
    };

    const normalizeOrder = (values: unknown[]): string[] => {
      if (values.length !== ids.length || ids.length < 2) return [];
      const resolved = values.map((value) => {
        if (typeof value !== "string") return "";
        const key = value.trim();
        return idSet.has(key) ? key : labelToId.get(key.toLowerCase()) ?? "";
      });
      return resolved.every((id) => idSet.has(id)) && new Set(resolved).size === ids.length
        ? resolved
        : [];
    };

    if (Array.isArray(rawDocument.correctOrder)) {
      const order = normalizeOrder(rawDocument.correctOrder);
      if (order.length > 0) return order;
    } else if (typeof rawDocument.correctOrder === "string") {
      const order = normalizeOrder(rawDocument.correctOrder.trim().split(/[\s,;>→-]+/u).filter(Boolean));
      if (order.length > 0) return order;
    }

    if (typeof rawDocument.answerSequence === "string") {
      return normalizeOrder(rawDocument.answerSequence.trim().split(/[\s,;>→-]+/u).filter(Boolean));
    }

    // No usable answer key: show the exercise, but disable 'correct' grading.
    // Never guess that book order is the correct order for a mixed-up question.
    return [];
  }, [document]);

`;

const anchor = /^(\s*)const completeAnswerKey\s*=/m;
const match = source.match(anchor);
if (!match) {
  console.error('Could not locate the answer-key check. No files were changed.');
  process.exit(1);
}
const start = match.index;
// Preserve the original assignment and indentation.
const lineStart = source.lastIndexOf('\n', start) + 1;
if (source.indexOf('safeCorrectOrder') < lineStart) {
  console.error('This viewer uses the answer key before the expected location. No changes were made.');
  process.exit(1);
}
source = source.slice(0, lineStart) + guard + source.slice(lineStart);

// Fail closed if the normalization was not inserted correctly.
if (source.includes('document.correctOrder.length') || !source.includes(guardMarker)) {
  console.error('Could not verify the correction. No files were changed.');
  process.exit(1);
}

const backup = target + '.rearrange-pre-fix.bak';
if (!fs.existsSync(backup)) fs.copyFileSync(target, backup);
fs.writeFileSync(target, source, 'utf8');
console.log('Fixed: components/app/UserRearrangeSentenceViewer.tsx');
console.log('Backup: ' + path.relative(process.cwd(), backup));
console.log('Restart Next.js to pick up the update.');
