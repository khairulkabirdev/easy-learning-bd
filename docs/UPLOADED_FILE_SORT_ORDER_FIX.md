# eLesson — UploadedFile.sortOrder Prisma runtime repair

## Error

`PrismaClientValidationError: Unknown argument sortOrder` at `app/admin/content/[contentId]/page.tsx` while the `VocabularyEntry.uploadedFiles` relation orders records by `sortOrder` and `createdAt`.

The uploaded project schema has `VocabularyEntry.sortOrder`, but it **does not** have `UploadedFile.sortOrder`. The latter is the source of this specific validation error. This is separate from the earlier missing `VocabularyEntry.partOfSpeech` error.

## Installation (Windows PowerShell)

1. Stop Next.js (`Ctrl+C`) and any other processes connected to the SQLite database. If there are other writers, stop them too.
2. Extract this ZIP into your **existing** eLesson project root. It adds the script and this document; it does **not** replace your schema, database, or uploaded files.
3. In the project root, run:

```powershell
node scripts/repair-uploaded-file-sort-order.cjs
npm run dev
```

4. Refresh the content editing page. Confirm no Prisma validation error.

## Exactly what changes

- Copies the **current** `prisma/schema.prisma` and the existing SQLite database to `backups/uploaded-file-sort-order-<timestamp>-*/`, and compares backup SHA-256 hashes.
- **Adds only if absent** `sortOrder Int @default(0)` to `model UploadedFile` inside your current `prisma/schema.prisma`.
- Regenerates Prisma Client using your installed local Prisma CLI.
- **Adds only if absent** the SQLite column `UploadedFile.sortOrder INTEGER NOT NULL DEFAULT 0` through `ALTER TABLE ... ADD COLUMN`.
- Checks original row counts in every existing SQLite table, checks SQLite integrity before/after, and tests the Prisma Client's `UploadedFile.sortOrder` selection.
- You can run the script again; it checks for existing fields/columns.

Existing uploaded files default to sort order **0**. The query's secondary `createdAt` ordering continues to apply to those rows. No image references or files are removed.

## Safety

- Never run `prisma migrate reset` or `prisma db push --force-reset` to fix this error.
- This repair makes **no** `DROP`, `DELETE`, `UPDATE`, or table-rebuild operation.
- If it finds a non-empty SQLite `-wal` or `-journal` file, it stops. **Do not delete these files**; make a consistent database backup/checkpoint after stopping writers.
- If your project has a different data source or renamed/mapped tables, the script stops rather than guessing.
- Only run on your own verified current project/database. Retain the timestamped backup until you've checked the application.

## Troubleshooting

If the script reports an error, **stop** and share its full terminal output before running other database or migration commands. If the script succeeds but Next.js still shows the old error, fully stop and restart Next.js so it loads the generated Prisma Client. A full Next.js build is not part of this repair.
