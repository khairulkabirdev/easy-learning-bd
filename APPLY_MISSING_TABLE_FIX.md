# eLesson — Repair the missing Parts of Speech table

The Prisma Client already recognizes the Parts of Speech model. The error means the SQLite database used by the running app does not yet contain `SubjectPartsOfSpeechBlock`.

1. Stop the eLesson dev server.
2. Extract the ZIP to a temporary folder. Copy `prisma/add-subject-parts-of-speech.sql` into the matching `prisma` folder of your existing eLesson project.
3. From the project root, with the same database configuration used to start eLesson, run:

```powershell
npx prisma db execute --schema prisma/schema.prisma --file prisma/add-subject-parts-of-speech.sql
```

4. When Prisma reports success, restart the app and create the block again.

If it still reports a missing table, check that the terminal running Prisma and the app use the same `DATABASE_URL`. In particular, a value set in the terminal or in `.env.local` may differ from the value in `.env`. Run the command with the app's database configuration, rather than switching database files. The error shown does not require regenerating the Prisma Client.

## Optional startup setup

To have the existing SQLite startup repair create the table automatically on future setups, copy `parts-of-speech-startup.patch` to the same project root. Run:

```powershell
git apply --check parts-of-speech-startup.patch
if ($LASTEXITCODE -eq 0) { git apply parts-of-speech-startup.patch }
```

If the check fails, keep your current startup script. The one-time SQL step works independently. The patch was checked against both the original startup repair and the version that includes Model Question Import.

Both options only create the table and its indexes if absent. They do not reset, reseed, or rewrite existing rows.
