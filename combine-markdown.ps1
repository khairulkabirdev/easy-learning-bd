# ==========================================================
# COPY .MD FILES FROM SELECTED G:\ FOLDERS
# KEEP EVERY .MD FILE SEPARATE
# ==========================================================

$RootDir   = "G:\"
$OutputDir = "D:\easy-learning-bd\README"


# ==========================================================
# ONLY CHECK THESE FOLDERS
# ==========================================================

$AllowedFolders = @(

    "question-answer-chapter-route-update",
    "question-answer-click-to-show-answer-update",
    "question-answer-mcq-style-chapter-update",
    "question-answer-passage-paragraph-update",
    "question-answer-popup-modal-update",
    "question-answer-row-update",
    "question-answer-row-update (1)",

    "seen-composition-passage2-vocabulary-update",
    "suffix-prefix-word-target-update",
    "table-completion-connected-answers-update",
    "tag-question-dual-mode-update",
    "connector-like-fill-in-the-blanks-update",
    "fill-in-the-blanks-delete-sync-fix",
    "fill-in-the-blanks-sketch-design-update",
    "first-paper-mcq-question-answer-style-redesign",
    "information-transfer-item-update",
    "passage-paragraph-selector-update (1)",
    "seen-composition-passage-block-update",

    "admin-content-english-subject-type-restrictions-update",
    "admin-content-class-subject-unseen-update",
    "passage-paragraph-selector-update",
    "first-paper-mcq-question-style-pages-update",
    "first-paper-all-block-chapter-routes-update",
    "question-answer-multiblock-typescript-fix",
    "all-blocks-per-content-update",
    "grouped-lesson-content-blocks-update",

    "question-answer-reference-style-update",
    "question-answer-independent-accordion-theme-update",
    "question-answer-passage-paragraph-link-update",
    "changing-sentence-per-question-answer-update",
    "substitution-table-builder-update",
    "production-build-typescript-fix",
    "blank-exercise-blocks-update",

    "table-completion-combobox-unique-update",
    "table-completion-typescript-build-fix",
    "table-completion-builder-update",
    "information-transfer-like-fill-blanks-update",
    "fill-in-the-blanks-tiptap-update",
    "fill-in-the-blanks-json-update",
    "rearrange-sentence-layout-fix",
    "rearrange-sentence-item-update",
    "content-editor-typing-performance-fix",
    "question-answer-separate-db-tables-update"
)


# ==========================================================
# CREATE DESTINATION FOLDER
# ==========================================================

if (!(Test-Path $OutputDir)) {

    New-Item `
        -ItemType Directory `
        -Path $OutputDir `
        -Force | Out-Null

    Write-Host "Created: $OutputDir"
}


# ==========================================================
# FIND ALL .MD FILES
# ==========================================================

$MarkdownFiles = @()

$ExistingFolders = 0
$MissingFolders  = 0


foreach ($FolderName in $AllowedFolders) {

    $FolderPath = Join-Path $RootDir $FolderName

    Write-Host ""
    Write-Host "Checking: $FolderPath"

    if (Test-Path $FolderPath -PathType Container) {

        $ExistingFolders++

        $Files = @(
            Get-ChildItem `
                -Path $FolderPath `
                -Filter "*.md" `
                -File `
                -Recurse `
                -ErrorAction SilentlyContinue
        )

        if ($Files.Count -gt 0) {

            $MarkdownFiles += $Files

            Write-Host "   Found: $($Files.Count)"
        }
        else {

            Write-Host "   No .md files"
        }

    }
    else {

        $MissingFolders++

        Write-Warning "Folder not found: $FolderPath"
    }
}


# Remove exact duplicate paths
$MarkdownFiles = @(
    $MarkdownFiles |
        Sort-Object FullName -Unique
)

$TotalFiles = $MarkdownFiles.Count


Write-Host ""
Write-Host "=============================================="
Write-Host "SCAN COMPLETE"
Write-Host "=============================================="
Write-Host "Existing folders : $ExistingFolders"
Write-Host "Missing folders  : $MissingFolders"
Write-Host "Markdown files   : $TotalFiles"
Write-Host ""


# ==========================================================
# COPY EACH .MD FILE SEPARATELY
# ==========================================================

$CopiedCount  = 0
$RenamedCount = 0
$FailedCount  = 0


foreach ($File in $MarkdownFiles) {

    $OriginalName = $File.Name

    $DestinationFile = Join-Path `
        $OutputDir `
        $OriginalName


    # ======================================================
    # IF SAME FILENAME ALREADY EXISTS
    # ADD SOURCE FILE TIMESTAMP
    # ======================================================

    if (Test-Path $DestinationFile) {

        $BaseName = [System.IO.Path]::GetFileNameWithoutExtension(
            $File.Name
        )

        $Extension = $File.Extension

        $Timestamp = $File.LastWriteTime.ToString(
            "yyyy-MM-dd_HH-mm-ss"
        )

        $NewName = "${BaseName}_${Timestamp}${Extension}"

        $DestinationFile = Join-Path `
            $OutputDir `
            $NewName

        $Counter = 1


        # If timestamp filename also exists
        while (Test-Path $DestinationFile) {

            $NewName = "${BaseName}_${Timestamp}_$Counter${Extension}"

            $DestinationFile = Join-Path `
                $OutputDir `
                $NewName

            $Counter++
        }


        $RenamedCount++

        Write-Host ""
        Write-Host "Duplicate filename:"
        Write-Host "   $OriginalName"
        Write-Host "Renamed copy to:"
        Write-Host "   $NewName"
    }


    # ======================================================
    # COPY FILE
    # ======================================================

    try {

        Copy-Item `
            -LiteralPath $File.FullName `
            -Destination $DestinationFile `
            -ErrorAction Stop

        $CopiedCount++

        Write-Host "[$CopiedCount/$TotalFiles] Copied:"
        Write-Host "   $($File.FullName)"
        Write-Host "      -> $DestinationFile"
    }
    catch {

        $FailedCount++

        Write-Warning "Failed to copy:"
        Write-Warning $File.FullName
    }
}


# ==========================================================
# RESULT
# ==========================================================

Write-Host ""
Write-Host "=============================================="
Write-Host "DONE"
Write-Host "=============================================="

Write-Host ""
Write-Host "Folders checked : $ExistingFolders"
Write-Host "MD files found  : $TotalFiles"
Write-Host "Files copied    : $CopiedCount"
Write-Host "Files renamed   : $RenamedCount"
Write-Host "Failed          : $FailedCount"

Write-Host ""
Write-Host "Destination:"
Write-Host $OutputDir
Write-Host ""