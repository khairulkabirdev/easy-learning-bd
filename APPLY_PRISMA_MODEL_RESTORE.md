# eLesson Prisma model restore

This repairs the runtime error where `prisma.modelQuestionSet` is undefined. The earlier Parts of Speech ZIP contained a full schema reference based on the original project snapshot. If that reference replaced your current schema, it omitted the Model Question Import models. Alternatively, the client may just be out of date.

The script preserves your current schema, adds missing Model Question Import, Model Question Set, Model Question Set Block and Parts of Speech models and relations, keeps the nullable unique `editorContentId`, validates the schema, and regenerates the client used by the app. It backs up the existing schema before making any changes. It does not connect to or write to the SQLite database.

## Apply

1. Stop the eLesson dev server.
2. Extract this ZIP. Copy `scripts/restore-elesson-prisma-models.cjs` to the `scripts` folder in the actual eLesson project. Leave your existing `prisma/schema.prisma` and database in place.
3. From the project root, run in PowerShell:

```powershell
node scripts/restore-elesson-prisma-models.cjs
```

4. After it reports all four models available, run `npx next dev` to verify the repair without running any database setup hooks, then reopen the Model Question Set page.

If the next error says a database table or column is missing, that is a separate SQLite schema issue. Check that the app is using your original database before changing anything. Do not run a reset or overwrite the database.

Tested with Prisma 6.19.3 against a separate SQLite database. The repaired client returned an existing question set, its editor link, its blocks, and an existing Parts of Speech exercise. The database file was unchanged.
