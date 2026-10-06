# Easy Learning BD

Next.js 16 education CMS and student learning platform using Prisma and SQLite.

## Current database

This package intentionally remains on **SQLite**. Do not change the Prisma datasource provider yet.

## First run

1. Copy `.env.example` to `.env` and set a strong `SESSION_SECRET` (32+ characters).
2. Install dependencies:

```bash
npm install
```

`npm install` runs `prisma generate` automatically for the current operating system.

3. Repair/verify the bundled SQLite schema and indexes:

```bash
npm run db:repair:sqlite
```

4. Start development:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Validation commands

```bash
npm run lint
npm run build
```

Or run both:

```bash
npm run check
```

## Important notes

- Keep `prisma/dev.db` backed up before database work.
- Uploaded images are stored under `public/uploads/` and therefore require persistent server storage.
- Do not commit `.env` or production credentials.
- The generated Prisma client is intentionally not stored in the repository; it is recreated by `npm install` / `npm run prisma:generate`.
- See `STABILITY-FIXES.md` for the security, data-integrity, upload, and compatibility work included in this package.

## Later database migration

When you are ready to move from SQLite to MySQL or PostgreSQL, migrate from a backup using Prisma/database migration tooling and verify all structured exercise JSON and relationships. Do not hand-edit the SQLite file into another provider.
