# eLesson: Class 6/7 English 1st Paper — Unseen Passage + passage links

## Result

- Seen — Passage 1: #1 Passage 1 -> #2 MCQ and #3 Answering Questions.
- Seen — Passage 2: #4 Passage 2 -> #5 Fill in the Gaps and #6 Synonyms / Antonyms.
- Unseen: **Unseen Passage** (unnumbered source, reused native Paragraph editor) -> #7 Information Transfer, #8 True / False, #9 Summary.
- Other Reading Questions: #10 Table Completion, #11 Rearrange Sentence, #12 Question from Poems.
- Only one of each fixed block may be added; the source must exist before adding dependent question blocks. The parent source and its question sections appear in the fixed paper order and cannot be dragged, reordered or deleted.
- New MCQ, Answering Questions, Fill in the Gaps, Synonyms / Antonyms and Information Transfer blocks save their passage reference using the existing `passageSource` and `paragraphBlockId` fields (Answering Questions stores this in its existing `documentJson`).
- New True / False and Summary blocks store source-reference metadata in their existing `documentJson`. Their editor shows the current parent passage preview. This does not add database columns or create new editors.
- Previous blocks (including older duplicates) remain visible and editable. Earlier manual passage fields remain in database; no automatic destructive conversion is performed. For old linked question sections the editor derives the fixed parent and persists that link when the content is edited and saved.

## Safe installation on Windows PowerShell

1. Stop `npm run dev` using `Ctrl+C` and save/commit your local changes. You can back up your SQLite file and upload directory as extra safety.
2. Extract this ZIP to a **temporary folder**. Do **not** blindly overwrite `app/admin/content/actions.ts`, which may contain additional local changes.
3. Copy only `changes.patch` to the project root (same folder as `package.json`). Copy `scripts/apply-unseen-passage-link-update.cjs` to your project's `scripts/` folder.
4. From the project root, run:

```powershell
node scripts/apply-unseen-passage-link-update.cjs
npm run dev
```

The script runs `git apply --check` first; any mismatch stops **without changing your project**. It backs up the four affected source files in `backups/unseen-passage-source-*` and then applies the patch. It never touches SQLite, Prisma schema, uploads, `.env`, or content records.

If it says `Git is required`, install Git for Windows or manually merge `changes.patch`. If it says the patch does not match current files, stop and review differences instead of replacing the working files.

## Verification

1. Open the Model Question set for Class 6, English 1st Paper.
2. Open Add Content Block > Unseen. Create Unseen Passage; the new editor is the existing Paragraph rich-text editor.
3. Before creating Unseen Passage, the three dependent question blocks are disabled. Afterwards they become available.
4. Add Information Transfer, True / False, Summary. They appear in paper order and show a linked Unseen Passage preview.
5. Edit the Unseen Passage; the preview should follow in the same page. Verify that the existing question data remains.
6. Check passage 1 and 2 with their question blocks. Earlier saved blocks still appear; no database migration is needed.

**Limitations:** Full Next.js build and live browser/database integration have not been run in this environment. True / False and Summary store reference metadata and show the linked passage in the admin editor; their older standalone stored passage text is not rewritten automatically. Downstream student rendering must resolve the source reference to display the live passage, when that feature is implemented.
