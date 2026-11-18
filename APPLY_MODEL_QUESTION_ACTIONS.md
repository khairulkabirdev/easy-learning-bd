# eLesson Model Question Import breadcrumbs and delete actions

## What changes

- The existing breadcrumb shows Model Question Import → class name → subject name → model-question set name.
- The **Created model question sets** table has row checkboxes, select-all for the current page, a row Delete action, and **Delete selected**.
- The confirmation dialog lists the exact sets that will be removed. Cancel does not delete anything.
- Confirming removes the selected sets, their native editor content and its blocks, and any older TXT/JSON blocks saved in those sets. The database transaction succeeds or rolls back as a batch.
- The separate **Uploaded source files & earlier imported questions** section, other sets, and ordinary curriculum are unchanged.

## Apply the patch

This update assumes the existing Model Question Import and native editor already work in your project. In particular, the existing Prisma Client must already know about `ModelQuestionSet.editorContentId`. The ZIP does not contain a database, a migration, or a replacement Prisma schema.

1. Extract the ZIP to a temporary folder. Stop the development server.
2. Copy `model-question-breadcrumbs-and-delete.patch` into the eLesson project root next to `package.json`.
3. In PowerShell, from the project root, run:

```powershell
git apply --check model-question-breadcrumbs-and-delete.patch
if ($LASTEXITCODE -eq 0) { git apply model-question-breadcrumbs-and-delete.patch }
```

4. If the check fails, compare the included four source files and merge only the changed sections. Do not overwrite files that have additional local edits. The patch does not replace any of the earlier Class 6/7 or Class 9/10 editor files.
5. Restart your development server and reload the subject page. Select disposable test sets to check Cancel and Delete. The list refreshes after a successful deletion.

## Verification

The route handlers were type-checked against the project's generated Prisma types. Tests against a disposable SQLite database verified that both kinds of saved blocks are removed, that invalid or out-of-scope selections do not delete any records, and that other sets, content, and source files are preserved. Component tests exercised selection, confirmation, cancellation, failure, and refresh. No deletion was performed on your live site.
