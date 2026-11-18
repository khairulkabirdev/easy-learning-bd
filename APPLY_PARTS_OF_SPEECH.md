# eLesson Parts of Speech

## Where to find it

Admin → Content → Class → English 2nd Paper → Parts of Speech.

The list uses the same Add, Edit, move and delete workflow as Suffix and Prefix. In the editor, write a question and underline the words to classify, or use **Insert target word**. Enter the part of speech in each answer field. For example, in “She walks quickly”, underline “quickly” and enter “adverb”. Removing a target removes its underline and answer field while leaving the word in the question.

Exercises and their answers are stored in their own `SubjectPartsOfSpeechBlock` SQLite table. Existing Suffix and Prefix records and other question types do not move or change. This adds the standalone admin section, not a new Model Question Import or student practice block.

## Install

1. Stop the development server and extract the ZIP to a temporary folder.
2. Copy `parts-of-speech.patch` to the eLesson project root, next to `package.json`. This patch is based on the existing English 2nd Paper sections and the previously delivered Model Question Breadcrumbs and Bulk Delete update.
3. Check the patch before applying it. In PowerShell:

```powershell
git apply --check parts-of-speech.patch
if ($LASTEXITCODE -eq 0) { git apply parts-of-speech.patch }
```

If the check fails, merge the changed sections shown in the patch. Do not replace the full Prisma schema or shared breadcrumb files with the reference copies in this ZIP. If you do not have the Model Question breadcrumb update, retain your existing navigation code and merge only the Parts of Speech hunks.

4. With your existing SQLite `DATABASE_URL` configured, run this additive setup from the project root:

```powershell
npx prisma db execute --schema prisma/schema.prisma --file prisma/add-subject-parts-of-speech.sql
if ($LASTEXITCODE -eq 0) { npx prisma generate }
```

The SQL only creates the new table and its indexes. It is safe to run again. It does not reset, reseed, or rewrite existing records.

5. Restart the app and open the Parts of Speech tile under an English 2nd Paper subject. Create a test exercise, reopen it, and verify the saved target words and answers.

## Checks run

- Generated Prisma Client and ran the additive SQL twice against a disposable SQLite database.
- Tested creation, editing, validation, reordering, deletion, and organization/subject scoping on disposable data. Confirmed Suffix and Prefix records stayed unchanged.
- Tested target-word and answer controls using the shared editor component. Checked the changed TypeScript for syntax and the server files against generated Prisma types.
- Verified patch application. A full Next.js build and the live site were not tested.
