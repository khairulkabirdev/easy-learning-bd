# Class 9–10 English 1st Paper numbering

This is a one-file update for the existing Class 9–10 model question layout.

| Number | Other Reading Questions |
| --- | --- |
| 7 | Table Completion |
| 8 | Rearrange Sentence |
| 9 | Question from Poems |
| 10 | Question from Story |

These four blocks still do not require a passage. Unseen Passage stays unnumbered. The Class 6/7 layout and saved data are unchanged.

Extract this ZIP to a temporary folder and copy class9-10-numbering.patch to the eLesson project root. In PowerShell, run:

```powershell
git apply --check class9-10-numbering.patch
if ($LASTEXITCODE -eq 0) { git apply class9-10-numbering.patch }
```

If you prefer to copy the included source file, compare it with your current lib/model-question-fixed-blocks.ts first. The patch only changes the four number fields. No database changes are needed.
