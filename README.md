# eLesson — Model Question Import: choose Synonym or Antonym answer

This is a **surgical source update**, not an old-project replacement.

## Install (from the current eLesson project root)

1. Make a normal backup of your project and SQLite database before changing schema.
2. Extract these ZIP contents into the project root. They are only a patch script and its data; they do not overwrite existing app sources.
3. Run:

   ```powershell
   node apply-model-synonyms-antonyms.cjs
   npm run prepare:sqlite
   npm run dev
   ```

The apply script checks **all eight source files before writing anything**, leaves dated copies in `.elesson-patch-backups/`, and refuses to overwrite an incompatible local edit. It is idempotent.

## Functionality

- In **Admin → Model Question Import → Synonyms / Antonyms**, select **Synonym** or **Antonym** per word.
- Multiple accepted answers are supported (press Enter/comma to make tags).
- The selected answer type is used in the student Model Question test. Answers only appear after Finish Test.
- Existing rows default to the previous **Both** mode. Other synonyms/antonyms text is not deleted when changing type.
- Outside Model Question Import, the existing Synonyms / Antonyms study editor is unchanged.

## Data-safe SQL

Adds one optional-mode column, `SynonymsAntonymsEntry.answerType TEXT NOT NULL DEFAULT 'both'`, through the existing idempotent SQLite schema-repair script. Existing row IDs, words, meanings, synonyms, antonyms, details, and foreign keys are unchanged. No reset, seed or deletion commands.

**Note:** The patched Prisma schema requires the generated Prisma client. `npm run prepare:sqlite` handles `prisma generate` before applying the additive SQLite change. If local files conflict, the script stops before writing; don't force-apply the older source. The patch file in this ZIP is available for inspection/manual merging.
