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

`npm install` runs `prisma generate` automatically for the current operating system. The repaired package intentionally does not include the stale pre-fix `package-lock.json`; the first successful install regenerates a clean lockfile using the compatible Next.js 16 / ESLint 9 dependency graph. Commit that generated lockfile afterward.

3. Repair/verify the bundled SQLite schema and indexes:

```bash
npm run db:repair:sqlite
```

4. Start development:

```bash
npm run dev
```

Open `http://localhost:3000`.

### Windows clean-install helper

If you previously hit `ERESOLVE`, from PowerShell you can run:

```powershell
.\scripts\clean-install.ps1
```

This removes old install artifacts, installs the repaired dependency set, then runs lint and build.

## Dependency compatibility

The project keeps `next@16.4.0`, `eslint@9.39.5`, and `eslint-config-next@16.4.0` aligned. Keep `eslint-config-next` on the same Next.js release line when upgrading. Prisma CLI and `@prisma/client` are both pinned to `6.19.3`. See `docs/DEPENDENCY-FIX-2026-10-19.md` for the repair details and Windows clean-install commands.

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
