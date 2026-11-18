# eLesson Class 9–10 English 1st Paper

This patch extends the existing native Model Question Import editor. It is based on the previously delivered **Class 6/7 Unseen Passage Linked Sections** update and leaves the Class 6/7 paper layout intact.

| Category | Passage | Question blocks |
| --- | --- | --- |
| Seen — Passage 1 | 1. Passage 1 | 2. MCQ, 3. Answering Questions, 4. Fill in the Gaps |
| Unseen | Unseen Passage (unnumbered) | 5. Information Transfer, 6. Summary |
| Other Reading Questions | No passage required | Table Completion, Rearrange Sentence, Question from Poems, Question from Story |

Passage-linked options become available once their source has been added to the same set. Blocks can be added once and stay in fixed paper order. Existing saved blocks, including those outside the new layout, remain visible and editable. No new editor, database column, or migration is included.

## Apply to the project on Windows

1. Extract this ZIP to a temporary folder. Stop the eLesson development server with Ctrl+C.
2. Open PowerShell in the eLesson project folder containing `package.json`. Copy only `class9-10-model-question.patch` from the extracted folder into that project folder.
3. Check and apply the source patch. The second command runs only if the check succeeds.

```powershell
git apply --check class9-10-model-question.patch
if ($LASTEXITCODE -eq 0) { git apply class9-10-model-question.patch }
```

4. If the check fails, stop. This patch expects the **Class 6/7 Unseen Passage Linked Sections** update to be installed. A mismatch can also mean that you have local edits in the same areas. Keep those edits and merge the patch instead of overwriting files.
5. After the patch applies, restart the development server. If you already have a working database and generated Prisma client, `npx next dev` starts Next.js directly without running npm's predev database-repair hook.

The patch changes only four source files. It does not touch your database, uploaded files, environment settings, or saved records. Do not run a reset or reseed for this update.

## Check the result

1. Open **Admin → Model Question Import → Class 9 or Class 10 → English 1st Paper**, then open a model-question set.
2. Click **Add block**. Check that the groups and numbers match the table above.
3. Add Passage 1 and confirm that MCQ, Answering Questions, and Fill in the Gaps unlock. Add Unseen Passage and confirm that Information Transfer and Summary unlock.
4. Check that each question previews its linked passage and that already-added blocks are disabled. The four independent blocks can be added without either passage.
5. Reopen the set and check that existing records are still present. Class 6/7 should retain its separate layout.

Verified against the previous patch using a clean patch-apply check, TypeScript layout checks, and tests of creation, ordering, duplicate prevention, and passage links with mocked database calls. The provided full project snapshot predates the Model Question Import implementation, so this package was not tested in a full Next.js build or against your live database.
