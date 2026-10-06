# Seen Composition Prisma runtime fix

Seen Composition now stores repeatable passage rows in two dedicated Prisma models:

- `SeenPassageOne` for blocks labeled **Passage**
- `SeenPassageTwo` for blocks labeled **Passage 2**

Each passage row belongs to its own `ContentBlock` through `contentBlockId`. This allows multiple Passage and Passage 2 blocks in the same content while keeping their labels stable when reordered.

A Prisma Client generated before this schema exists can throw validation errors at runtime. This package prevents that stale-client mismatch by running the following preparation automatically before development, build, and production start:

1. `prisma generate`
2. `node scripts/repair-sqlite-schema.cjs`
3. the requested Next.js command

The SQLite repair is idempotent and non-destructive. It preserves existing passage HTML, removes the old one-row-per-content unique restriction, attaches old fixed passage rows to normal content blocks, and keeps existing curriculum data.

After replacing an older project copy, stop any already-running Next.js dev server and start again with `npm run dev` so the pre-start preparation can run.
