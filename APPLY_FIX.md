# eLesson – ModelQuestionSet.editorContentId Safe Repair

## Why this is needed

Your Model Question detail page uses a nullable `editorContentId` to connect each question set to the **existing** Content Blocks editor. An earlier UI package introduced the query, but the Prisma schema and/or the generated Prisma Client were not upgraded. Prisma then throws:

`Unknown field editorContentId for select statement on model ModelQuestionSet`.

## Windows installation

1. **Stop `npm run dev` with Ctrl+C**, and close any SQLite editing tools.
2. Make an independent copy of your current database and uploaded assets.
3. Extract this ZIP at the **root of your actual eLesson project** (where `package.json` and `prisma/` are located). It only adds `scripts/repair-model-question-editor-content-id.cjs`; it does **not** replace `schema.prisma` or `dev.db`.
4. In PowerShell, from the project root, run:

   ```powershell
   node scripts/repair-model-question-editor-content-id.cjs
   npm run dev
   ```

5. Open the Model Question detail page again. Test an existing set, and confirm existing blocks are still there.

The script backs up your active SQLite database and original Prisma schema to a timestamped `backups/model-question-editor-content-id-*` folder. It refuses to create a database if the configured database/table is missing or if an active SQLite journal is present. It only adds an optional `editorContentId String? @unique` scalar to the existing `ModelQuestionSet` model, a nullable SQLite column if missing, and its unique index; then regenerates Prisma Client from **your current schema**. Existing data stays untouched.

### If it reports success but the Next.js page still uses an old client

Stop the server, and regenerate the client:

```powershell
npx prisma generate
npm run dev
```

If Turbopack still serves stale code after a clean regeneration, stop the server and remove **only** the generated `.next` directory, then rerun `npm run dev`. Do **not** remove `prisma/dev.db`, `generated/prisma`, or uploaded files.

### Important

- Never run `prisma migrate reset`, `prisma db push --force-reset`, or a destructive reseed.
- Do not replace `prisma/schema.prisma` from an older project ZIP; the repair edits the **current** file additively.
- This repair assumes SQLite with `DATABASE_URL=file:...` and a locally installed Prisma CLI and generated Client. A different database provider needs a separately planned migration.
- If the script reports that `ModelQuestionSet` is missing, stop. Your current `DATABASE_URL` might point to a different or older database.
