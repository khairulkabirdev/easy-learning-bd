# eLesson · Model Question Import

The Admin → **Model Question Import** page supports two distinct actions. Both actions are private to admins and do **not** publish a student-facing model test.

## Workflow

1. Open `/admin/model-question-import` → choose **Class → Subject**.
2. Click **Upload / Import Model Questions**.
3. Choose an active **Board** and **Academic Year**, and optionally enter a title.
4. Choose a mode:
   - **Upload Source Files** — store 1–5 PDF, DOC, DOCX, JPG, PNG, WebP, TXT, or JSON reference files, up to 25 MB/file and 100 MB/batch. These are **not** parsed into questions.
   - **Import Questions** — choose one structured `.txt` or `.json` question file, or paste question text. Optionally attach **one** PDF/Word/image reference file along with pasted questions. The server validates and saves up to 250 parsed questions within the model-question record. You can preview the questions before saving.
5. Search/filter the 15-record-per-page table by title, filename, Board, and Year. Click **View Questions** to see imported MCQs and short questions; **Open** to access the stored source; or **Delete** to remove the record and its source file.

### Numbered text format

```text
1. Which word is a noun?
A) Happy
B) Teacher
C) Quickly
D) Beautiful
Answer: B

2. Change into indirect speech: He said, "I am happy."
Answer: He said that he was happy.
```

- Supports numbered English and Bangla questions, A–F / ক–চ option labels, `Answer:` / `Ans:` / `উত্তর:`, and optional `Explanation:` / `ব্যাখ্যা:`.
- An answer is optional (for question papers without answer keys). If provided for an MCQ, it must match an option label or exact option text.
- Plain-text questions may be short-answer questions without options.
- Separate unnumbered questions with a blank line; numbered questions are recommended.

### JSON format

```json
{
  "questions": [
    { "question": "What is 2 + 2?", "options": ["3", "4", "5", "6"], "answer": "B", "explanation": "2 + 2 = 4." },
    { "question": "Explain photosynthesis.", "answer": "Plants use light to make food." }
  ]
}
```

A top-level question array is also accepted. Numeric JSON answers refer to **zero-based option indexes**. Maximum total input is 250,000 characters with a limit of 250 questions and 10,000 characters per field. Invalid entries are rejected; partial question import is not permitted. No new npm dependency is required.

## Limitations

**No automatic PDF/Word/image OCR or AI parsing.** Upload these documents for safekeeping and paste their extracted question text into **Import Questions** if you want structured records. A saved import is an **admin-only draft** and not a published model test. Additional student-facing test/publishing workflows require separate implementation. The file uploader and source library remain intact.

## Install / database update

Copy only changed files into the existing eLesson project root, preserving directory paths. Back up `prisma/dev.db`, then run:

```powershell
npm run prepare:sqlite
npm run build
npm run dev
```

The existing idempotent SQLite repair adds `questionsJson` and `questionCount` columns to `ModelQuestionImport` without deleting existing records. Existing uploaded files remain tagged `file_uploaded` with zero imported questions. `prisma generate` runs before repair through `prepare:sqlite`.

## Security and validation

Upload/delete routes require a trusted mutation origin and authenticated admin. Class/Subject/Board/Year ownership is checked against the admin organization. Question imports are parsed and validated **again on the server**, not trusted from the client preview. Files remain associated with the active Storage Setting provider at upload time and use private `/api/media/:fileId` access. Teachers and students cannot retrieve model question source files through that endpoint. The GET question-preview route is admin-only and organization-scoped. File extensions and magic bytes are validated. Storage failures and partial file-upload batches are reported.
