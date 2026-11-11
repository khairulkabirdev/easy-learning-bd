# eLesson — Model Question Import → Upload / Add

## Where

`/admin/model-question-import/<classId>/<subjectId>`

The modal has **two tabs**:

- **Upload** — existing source-file workflow. Board and Academic Year remain required here, matching the previous upload behavior. Files are kept in the existing `ModelQuestionImport` table and private configured storage.
- **Add** — create a new editable model-question set. **Name is required**. **Board and Academic Year are both optional**, selected only from admin-defined active dropdown entries. You can choose **All Boards / Not specified** or **All Years / Not specified**.

After **Create & Open**, the UI redirects directly to:

`/admin/model-question-import/<classId>/<subjectId>/<setId>`

The new detail page displays its saved name, class, subject, optional board/year, block count, and total marks. Add/edit blocks there. No automatic publishing to student model tests.

## Subject-aware question blocks

- **English / English 1st Paper:** Seen Passage, Unseen Passage, Information Transfer, Matching Sentences, Rearrange Sentences, Summary, Poem, Story, Completing Story, Paragraph, Email/Letter, Dialogue.
- **English 2nd Paper:** Gap Filling, Substitution Table, Right Form of Verb, Narration, Changing Sentence, Punctuation and Capitalization, Preposition, Suffix and Prefix, Tag Question, Connector, Composition, Application.
- **All subjects:** MCQ, Short Answer, Creative/Written Question.

Each block has a required **block name** and **question/prompt**, and optional instructions, passage/context, and answer; marks are required (1–100). MCQ blocks support 2–6 answer options. The first version uses a flexible rich-text-free prompt form; specialty structured matching-table builders and student-facing test publication are not included in this update.

**Import TXT / JSON** on the detail page preserves the old deterministic question-import functionality: paste numbered questions or JSON, or pick a TXT/JSON file, preview validity, and append up to 250 parsed MCQ/short-answer blocks. Existing blocks are never replaced by this action. PDF/Word/image OCR is not included.

The list page displays separate sections for **Created model question sets** and **Uploaded source files & earlier imported questions**. Both support Board/Year/search filtering; sets have their own `setPage` pagination.

## Safe database upgrade

**The new feature creates two entirely new tables**:

- `ModelQuestionSet`
- `ModelQuestionSetBlock`

No old table is rebuilt. No existing `ModelQuestionImport`, `UploadedFile`, student, teacher, or question data is updated or deleted by these new-table DDL statements.

The existing SQLite repair script has been adjusted for preservation: it now retains the legacy `SentenceOrderingExercise` table after copying (instead of dropping it). Auth-session cleanup and temporary-profile-image migration have become opt-in only with `ELESSON_ALLOW_LEGACY_DATA_MAINTENANCE=1`; do **not** set this variable unless specifically intended.

### Installation in Windows PowerShell

1. **Stop your running Next.js server first.** Ensure no other process is writing to the database.
2. **Back up your live database and uploads**, wherever `DATABASE_URL` and your storage provider actually point. If using project-local SQLite:

   ```powershell
   Copy-Item .\prisma\dev.db .\prisma\dev.db.pre-model-add-backup
   ```

   If SQLite WAL/SHM files are in use, stop all writers before taking a file-system copy, or use SQLite's online backup API. Also back up `public/uploads/` and any configured custom storage.
3. Copy the changed/new files from this package into your **existing project root**. **Never copy an old `dev.db` or an entire project ZIP over your live project.**
4. Generate the Prisma client and apply only the existing idempotent repair (which now creates the two new tables):

   ```powershell
   npm run prisma:generate
   npm run db:repair:sqlite
   npm run build
   npm run dev
   ```

5. Verify your existing uploaded papers and questions are still visible and test **Add → Create & Open → Add question block**.

**Never run** `prisma migrate reset`, `prisma db push --force-reset`, or delete `prisma/dev.db` as part of this update.

## What was tested

- TypeScript/TSX source transpilation (syntax) for the changed application files.
- Subject-specific presets and validation; required name / prompt and MCQ rules.
- Existing parser behavior for pasted numbered questions.
- SQL upgrade on a separate SQLite copy: 50 pre-existing table counts unchanged, additive tables created, idempotent re-run, and `PRAGMA integrity_check` returned `ok`.

A **complete Next.js production build was not verified** because package dependencies could not be installed in the execution environment. Run `npm run build` in your configured local environment after backing up data.
