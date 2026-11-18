# eLesson — Class 6/7 English 1st Paper: revised Seen/Unseen sections

## Target page
`/admin/model-question-import/[classId]/[subjectId]/[setId]`

## New fixed paper layout (11 unique slots)
1. Seen — Passage 1: Passage 1, MCQ, Answering Questions
2. Seen — Passage 2: Passage 2, Fill in the Gaps, Synonyms / Antonyms
3. Other Reading Questions: Table Completion, Rearrange Sentence
4. Unseen: Information Transfer, True / False, Summary

Old Information Transfer and True/False records remain attached to the same model question set; their DISPLAY order changes to the Unseen group. Old duplicate records remain intact. No block records or sortOrder fields are rewritten.

## Summary editor
The existing `WritingSummaryEditor` from `UnseenCompositionEditorClient` is exported and reused. For the model question detail page, the summary record uses the existing `ContentBlock` + `QuestionFromStory` schema as an adapter, storing the instruction and model answer in fields already present (`instruction`, `answer`). It uses the distinct `writing-summary` kind, so it cannot collide with Answering Questions or Question from Story. This does not modify the separate Unseen Composition database records.

## Safe installation
1. Stop Next.js (`Ctrl+C`). Back up the current project code and live SQLite database in a separate location before making any changes.
2. **Merge the changes, rather than replacing local code blindly.** This ZIP is based on the earlier **Class67-Fixed-Ordered-SingleUse** package for four files, and the uploaded project snapshot for `content-types.ts` and `UnseenCompositionEditorClient.tsx`. Your local copies may have newer fixes. `changes.patch` shows exactly what changed.
3. For a project matching those source snapshots, copy the six source files to their corresponding paths. Otherwise use `changes.patch` to review/merge changes, keeping your newer code intact.
4. On Windows, from the project root, run `.\node_modules\.bin\next.cmd build` and then `.\node_modules\.bin\next.cmd dev` to check the Next.js build without invoking custom `prebuild`/`predev` hooks. Only run project-specific Prisma scripts after reviewing what they do.
5. Confirm you can add *Summary*, edit and save its instruction/model answer, and refresh without losing it; verify the fixed order and disabled buttons.

## Never run
- `prisma migrate reset`
- `prisma db push --force-reset`
- Destructive seeds or other database reinitialization commands

No `.env`, Prisma schema, database, or upload files are included. No Prisma migration is required.

## Verification
- All six modified TypeScript/TSX files passed TypeScript syntax/transpilation checks.
- The 11 kinds and the 4 menu groups were checked against the shared fixed-order list and server guards.
- `QuestionFromStory` persisted fields match the existing Prisma model in the uploaded snapshot.
- A complete local Next.js build and live database/browser integration test have **not** been performed.
