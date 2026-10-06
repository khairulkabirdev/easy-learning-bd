# Safe update instructions

This update ZIP intentionally excludes `prisma/dev.db` and `public/uploads/`.

1. Stop the running Next.js dev server.
2. Back up your current `prisma/dev.db` once.
3. Copy/extract this update over your existing project source.
4. Keep your existing `prisma/dev.db` in place.
5. Run `npm install` if dependencies are not already installed.
6. Run `npm run dev`.

`npm run dev` executes `prisma generate` and the idempotent SQLite repair before Next.js starts. The repair converts old fixed Seen Composition Passage records into repeatable content blocks without resetting curriculum data.
