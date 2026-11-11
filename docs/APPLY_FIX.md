# eLesson: Fix HTTP 404 — Open existing question blocks

## What this package fixes

The UI posts to:

`/api/admin/model-question-sets/<setId>/native-editor`

When Next.js cannot find the corresponding App Router file, it returns an HTML 404 page. The UI then reports:

`Open existing question blocks failed: API route not found (HTTP 404).`

This package restores the exact `native-editor/route.ts` endpoint from the earlier eLesson Native Categorized Blocks implementation; it does not replace your content editor or previous imported-question APIs.

## Included code file

`app/api/admin/model-question-sets/[setId]/native-editor/route.ts`

The brackets `[setId]` are part of the folder name. Do not rename this folder.

## Apply (Windows PowerShell)

1. Stop Next.js (`Ctrl+C`).
2. From the eLesson project root, confirm you are in the correct project:

   `Test-Path -LiteralPath '.\app\admin\model-question-import\[classId]\[subjectId]\[setId]\page.tsx'`

3. Back up any existing native editor route file before replacing it. If the file already exists and has your own changes, compare/merge it instead of overwriting.
4. Extract this ZIP at the **project root** (the folder containing `package.json`), retaining the folders shown above.
5. Verify the installed file path:

   `Test-Path -LiteralPath '.\app\api\admin\model-question-sets\[setId]\native-editor\route.ts'`

   This must print `True`.
6. Start your application:

   `npm run dev`

7. Refresh the Model Question Set page and click **Add block** / **Open existing question blocks** again. The first successful click creates or opens a **draft** content workspace used by the native block editor.

## Read-only checks if another API 404 appears

Check these routes if TXT/JSON import or previous-block saving still reports 404:

- `app/api/admin/model-question-sets/[setId]/blocks/route.ts`
- `app/api/admin/model-question-sets/[setId]/blocks/import/route.ts`
- `app/api/admin/model-question-sets/[setId]/blocks/[blockId]/route.ts`
- `app/api/admin/model-question-sets/route.ts`

Only install missing routes from a matching version of the project; do not blindly overwrite working custom routes.

## If you get another error after installation

- `Unknown field editorContentId`: your Prisma schema/client must match the earlier *additive* `editorContentId String? @unique` repair. Do **not** reset the database.
- HTTP 409: the endpoint exists, but the native workspace could not be initialized; check the detailed error and Next.js terminal.
- HTTP 500: check the Next.js terminal for Prisma / auth errors.
- Still HTTP 404: verify the `Test-Path` check is `True` in the same project directory from which you launch Next.js. Inspect DevTools > Network for the exact requested URL. If the route exists but Next.js still serves an outdated route tree, stop the server, remove only `.next`, and restart.

## Data safety

This ZIP includes **no** database, migrations, Prisma schema, uploads, or settings files.
The restored route uses an admin-checked transaction. It will link the ModelQuestionSet to a draft curriculum Content workspace if one is not linked already. It does **not** delete or replace previously stored ModelQuestionSetBlock rows. The route does create a new draft Unit/Lesson/Content on first initialization, so it is not read-only.

**Never run** `prisma migrate reset`, `prisma db push --force-reset`, or destructive reseeding to fix this HTTP 404.

The route has passed a syntax-level check against the uploaded source; the full Next.js build and your localhost integration are unverified in this environment.
