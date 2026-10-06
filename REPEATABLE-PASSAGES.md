# Repeatable Seen Composition Passages

Seen Composition now uses two repeatable block kinds:

- `seen-passage-one` -> label is always **Passage**
- `seen-passage-two` -> label is always **Passage 2**

Both kinds are normal `ContentBlock` rows. They can be added multiple times, moved with the normal block ordering controls, and deleted. Moving them never renames the label.

The passage body remains stored in separate SQLite tables (`SeenPassageOne` and `SeenPassageTwo`). Each row is linked to its own `ContentBlock` through `contentBlockId`, so both tables support multiple rows per content.

The SQLite repair is non-destructive: it removes the old one-row-per-content unique index, creates normal content blocks for old fixed Passage records, preserves their body HTML, and converts old synthetic passage links when possible.

Synonyms/Antonyms, Information Transfer, and other existing passage-linked exercises now select the exact passage block ID.
