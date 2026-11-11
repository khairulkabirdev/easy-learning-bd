# eLesson — Safe Prisma VocabularyEntry repair

## Error
`PrismaClientValidationError: Unknown field partOfSpeech for select statement on model VocabularyEntry`.

The uploaded eLesson archive and the more recent Model Question update ZIPs include a Prisma schema that lacks `VocabularyEntry.partOfSpeech`, `pronunciation`, `synonyms`, and `antonyms`. Your current content page selects these fields. The likely issue is a schema and generated-client mismatch; this does **not** establish that vocabulary records were deleted.

## Install and run (Windows PowerShell)

1. **Stop the development server** and any process writing to the SQLite database.
2. Extract the ZIP into the existing project root. It adds only `scripts/restore-vocabulary-entry-fields.cjs`; it does not replace your existing Prisma schema or SQLite database.
3. From the project root:

```powershell
node scripts/restore-vocabulary-entry-fields.cjs
npm run dev
```

The script automatically:
- Reads your current `prisma/schema.prisma` and `.env` `DATABASE_URL`.
- Creates timestamped copies of your **existing** schema and SQLite DB under `backups/vocabulary-entry-*/` before edits.
- Adds only the four absent fields to your **current** `VocabularyEntry` Prisma model (does not replace the whole schema).
- Runs your installed Prisma CLI's `generate` command.
- Adds only missing SQLite columns using `ALTER TABLE ... ADD COLUMN`, preserving existing rows and values.
- Checks vocabulary row counts and SQLite integrity afterward.

It is safe to rerun: fields and columns that already exist are kept. If a non-empty SQLite WAL file is detected, the script stops rather than copying an incomplete backup. **Do not delete WAL files** to bypass this check; use a proper SQLite backup/checkpoint after fully shutting down writers.

## Important

- No `prisma migrate reset`, `prisma db push --force-reset`, `DROP TABLE`, `DELETE`, or `UPDATE` commands are used by this repair script.
- **Do not overwrite** your current `prisma/schema.prisma` with older versions contained in previous update ZIPs.
- If the error remains, stop the server, verify that `DATABASE_URL` points to the expected database, then rerun this repair and start Next.js. Check for any other missing fields caused by a different version mismatch.
- This repair is specifically for SQLite and the four missing vocabulary fields shown by the uploaded error. A full application build still needs to be tested on your local project.
