# eLesson target-word underline fix

Parts of Speech and Suffix and Prefix use underlines to identify target words. The underline on a target should stop before the space and should not continue into the rest of the sentence.

This update enables that behavior only for the relevant question fields. Other rich-text fields retain ordinary underline behavior. The fix covers the standalone English 2nd Paper section editor and the Suffix and Prefix block in the shared content editor, including Model Question Import. It does not add Parts of Speech to Model Question Import.

## Apply

1. Extract the ZIP to a temporary folder and copy `target-word-underline-fix.patch` to the eLesson project root.
2. Run these PowerShell commands from the project root:

```powershell
git apply --check target-word-underline-fix.patch
if ($LASTEXITCODE -eq 0) { git apply target-word-underline-fix.patch }
```

3. If the patch check reports a mismatch, merge the affected lines using the reference files included in the ZIP. The English 2nd Paper editor baseline includes the previous Parts of Speech update, and the shared content editor baseline includes the previous Class 9–10 update. Don't replace those files wholesale if you have local changes.
4. Restart or reload eLesson. Insert or underline a target word and then press Space and type the next word. Only the target should stay underlined.

The patch does not alter any saved exercise or database data. If a space or a word was already saved with an unintended underline, select that part in the editor and turn off underline manually.

Verified with the project's Tiptap version. Tests reproduced the old carryover and checked the new target insertion, Space key and text input, and preservation of other formatting. No full app build or live-site test was run.
