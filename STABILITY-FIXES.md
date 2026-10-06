# SQLite Stability & Security Pass

This project intentionally remains on **SQLite** for now. The goal of this pass is to make the existing architecture safer and more predictable without breaking old lesson/exercise records.

## First run

```bash
npm install
npm run db:repair:sqlite
npm run dev
```

`npm install` runs `prisma generate` automatically. `db:repair:sqlite` is idempotent and only accepts a local `file:` SQLite datasource.

## What this pass changes

- Aligns the bundled SQLite schema with `prisma/schema.prisma`, including Vocabulary passage-link fields and useful indexes.
- Keeps legacy exercise data compatible while protecting structured JSON payload sizes and ownership checks.
- Scopes curriculum/content mutations to the current organization and prevents parent moves that would orphan existing child/content data.
- Preserves passage-dependent exercises when a Paragraph/Passage block is removed by converting them back to manual passage text first.
- Sanitizes stored rich HTML before student rendering.
- Hardens session parsing, reset-token consumption, proxy-aware login/reset throttling, and reset-email privacy.
- Validates real image bytes, confines local file operations to upload roots, and promotes profile photos out of temporary storage.
- Restricts profile persistence by role so forged hidden Student/Teacher fields cannot pollute another role's profile data.
- Synchronizes duplicated hierarchy IDs in exercise tables whenever Content moves.
- Removes stale generated Prisma output from source control; Prisma is regenerated for the active operating system after install.
- Adds baseline response security headers without introducing a strict CSP that could break the current editor/runtime.

## Before changing database provider later

When moving from SQLite to MySQL/PostgreSQL, first create a backup and test the migration against a copy. Keep the Prisma model names/relations and structured JSON compatibility intact; do not translate the current SQLite file by hand as the primary migration strategy.

## Validation performed for this package

- SQLite `PRAGMA integrity_check`: `ok`
- SQLite foreign-key check: no violations
- Prisma-model/table/column comparison: no missing/extra model columns in the bundled DB
- Content/exercise hierarchy consistency check: no detected mismatches
- Passage-link consistency check: no detected invalid links
- TypeScript/TSX syntax parse: no syntax errors
- Local import-resolution scan: no unexpected missing project imports
- Rich-text sanitizer security cases: passed

A complete `npm ci` / Next production build could not be executed in the packaging environment because the npm registry was unreachable there. Run `npm run check` after installing dependencies on a machine with registry access.

## Seen Composition fixed Passage / Passage 2 update

- Replaced repeatable Seen Composition paragraph behavior with two fixed passage slots: **Passage** and **Passage 2**.
- Added separate SQLite/Prisma tables `SeenPassageOne` and `SeenPassageTwo`, one record per content path.
- Existing first/second Paragraph data is copied into the new passage tables by the SQLite repair/migration logic; legacy Paragraph records are retained for backward compatibility.
- Passage blocks are no longer offered in the Seen Composition "Add block" chooser, so `Passage 3` cannot be created there.
- Added **Information Transfer** to the Seen Composition block set.
- Synonyms / Antonyms and Information Transfer can link directly to either fixed Passage or Passage 2.
- Existing passage-linked blocks remain backward compatible with legacy paragraph links.
- Information Transfer now stores passage, passage source, and passage link metadata and renders the resolved passage on the student side.

## 2026-10-06 — Prisma client refresh for fixed Seen Composition passages

- Fixed the runtime `PrismaClientValidationError: Unknown field seenPassageOne` caused by running an older generated Prisma client after the `SeenPassageOne` / `SeenPassageTwo` schema update.
- `npm run dev` and `npm run build` now automatically run `prisma generate` and the idempotent SQLite repair before Next.js starts.
- `npm start` now regenerates the Prisma client before starting production mode.
- This keeps the generated client synchronized with `prisma/schema.prisma` and ensures the two fixed passage tables exist before application queries execute.


## Repeatable Seen Composition passages

- Passage and Passage 2 are now normal repeatable content-block kinds.
- Both can be added unlimited times, moved, and deleted.
- Their labels are kind-based and do not change when reordered.
- Existing fixed passage data is migrated in place without resetting SQLite.
- Seen Composition movement now operates on visible blocks instead of hidden filtered blocks.
- Passage-linked exercise selectors use exact block IDs.
