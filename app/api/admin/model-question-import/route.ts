import crypto from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";

import { assertTrustedMutationOrigin, requireAdmin } from "@/lib/app-auth";
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/db";
import { MODEL_QUESTION_TEXT_LIMIT, parseModelQuestions } from "@/lib/model-question-parser";
import { getActiveStorageConfiguration, resolveStorageConfiguration } from "@/lib/storage/configurations";
import { createStorageObjectKey, deleteStoredObject, putStoredObject } from "@/lib/storage/object-store";
import { prunePendingStorageDeletes } from "@/lib/storage/upload-management";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILES = 5;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  txt: "text/plain; charset=utf-8",
  json: "application/json",
};

function respondError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

function safeName(original: string) {
  return path.posix.basename((original || "question-file").replace(/\\/g, "/"))
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim().slice(0, 180) || "question-file";
}

function isValidSignature(ext: string, buffer: Buffer) {
  if (ext === "pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (ext === "png") return buffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
  if (["jpg", "jpeg"].includes(ext)) return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (ext === "webp") return buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  if (ext === "doc") return buffer.subarray(0, 8).equals(Buffer.from("d0cf11e0a1b11ae1", "hex"));
  if (ext === "docx") return buffer.subarray(0, 2).toString("ascii") === "PK";
  if (ext === "txt" || ext === "json") return !buffer.includes(0);
  return false;
}

export async function POST(request: Request) {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  const form = await request.formData();
  const classId = String(form.get("classId") || "");
  const subjectId = String(form.get("subjectId") || "");
  const boardId = String(form.get("boardId") || "");
  const academicYearId = String(form.get("academicYearId") || "");
  const inputTitle = String(form.get("title") || "").trim().slice(0, 180);
  const mode = form.get("mode") === "questions" ? "questions" : "files";
  const suppliedText = String(form.get("questionsText") || "");
  if (suppliedText.length > MODEL_QUESTION_TEXT_LIMIT) return respondError("Question text must be 250,000 characters or shorter.", 413);
  const files = form.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);

  if (!classId || !subjectId || !boardId || !academicYearId) return respondError("Class, Subject, Board, and Year are required.", 400);
  if (mode === "files" && (!files.length || files.length > MAX_FILES)) return respondError("Choose 1 to 5 source files.", 400);
  if (mode === "questions" && (files.length > 1 || (!files.length && !suppliedText.trim()))) {
    return respondError("Import one TXT/JSON file, attach one source file with pasted questions, or paste the questions directly.", 400);
  }
  if (files.some((file) => file.size > MAX_FILE_BYTES) || files.reduce((sum, item) => sum + item.size, 0) > MAX_TOTAL_BYTES) {
    return respondError("Each file must be 25 MB or smaller; the batch must be 100 MB or smaller.", 413);
  }
  const [subject, board, academicYear] = await Promise.all([
    prisma.subject.findFirst({ where: { id: subjectId, classId, organizationId: user.organizationId }, select: { id: true } }),
    prisma.board.findFirst({ where: { id: boardId, organizationId: user.organizationId, isActive: true }, select: { id: true } }),
    prisma.academicYear.findFirst({ where: { id: academicYearId, organizationId: user.organizationId, isActive: true }, select: { id: true } }),
  ]);
  if (!subject || !board || !academicYear) return respondError("Invalid Class, Subject, Board or Year selection.", 400);

  const prepared: Array<{ buffer: Buffer; filename: string; extension: string; mimeType: string; declaredType: string; sha: string }> = [];
  for (const file of files) {
    const filename = safeName(file.name);
    const extension = path.extname(filename).slice(1).toLowerCase();
    const mimeType = EXTENSIONS[extension];
    if (!mimeType) return respondError(`${filename} is unsupported. Use PDF, Word, image or TXT.`, 400);
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!isValidSignature(extension, buffer)) return respondError(`${filename} does not match the expected file format.`, 400);
    prepared.push({ buffer, filename, extension, mimeType, declaredType: file.type || mimeType, sha: crypto.createHash("sha256").update(buffer).digest("hex") });
  }

  const questionSource = mode === "questions" ? (
    suppliedText.trim() || (["txt", "json"].includes(prepared[0]?.extension || "")
      ? prepared[0].buffer.toString("utf8") : "")
  ) : "";
  const parsed = mode === "questions" ? parseModelQuestions(questionSource) : { questions: [], errors: [] };
  if (mode === "questions" && (parsed.errors.length || !parsed.questions.length)) {
    return respondError(parsed.errors.slice(0, 3).join(" ") ||
      "No questions found. For PDF, Word and image files, paste the questions into the text box; automatic OCR is not included.", 400);
  }
  if (mode === "questions" && prepared.length === 0) {
    const filename = `${safeName(inputTitle || "model-questions").replace(/\.[^.]+$/, "")}.txt`;
    const buffer = Buffer.from(questionSource, "utf8");
    prepared.push({ buffer, filename, extension: "txt", mimeType: EXTENSIONS.txt, declaredType: EXTENSIONS.txt, sha: crypto.createHash("sha256").update(buffer).digest("hex") });
  }

  await prunePendingStorageDeletes(user.organizationId, user.id);
  const configRecord = await getActiveStorageConfiguration(user.organizationId, user.id);
  const config = resolveStorageConfiguration(configRecord);
  let uploaded = 0;
  for (const item of prepared) {
    const id = crypto.randomUUID();
    const fileId = crypto.randomUUID();
    const key = createStorageObjectKey(user.organizationId, "model-question-sources", fileId, item.extension, config.pathPrefix);
    try {
      await putStoredObject(config, key, item.buffer, item.mimeType);
      try {
        await prisma.$transaction(async (tx) => {
          await tx.uploadedFile.create({
            data: {
              id: fileId,
              storageConfigurationId: configRecord.id,
              purpose: "model-question-source",
              ownerType: "ModelQuestionImport",
              ownerId: id,
              path: key,
              url: `/api/media/${fileId}`,
              originalName: item.filename,
              sourceMimeType: item.declaredType,
              mimeType: item.mimeType,
              extension: item.extension,
              sizeBytes: item.buffer.length,
              checksumSha256: item.sha,
              status: "active",
              isCurrent: true,
              organizationId: user.organizationId,
              createdBy: user.id,
              updatedBy: user.id,
            },
          });
          await tx.modelQuestionImport.create({
            data: {
              id, classId, subjectId, boardId, academicYearId, fileId,
              title: prepared.length === 1 && inputTitle ? inputTitle : item.filename.replace(/\.[^.]+$/, ""),
              status: mode === "questions" ? "questions_imported" : "file_uploaded",
              questionCount: parsed.questions.length,
              questionsJson: mode === "questions" ? JSON.stringify(parsed.questions) : "[]",
              organizationId: user.organizationId,
              createdBy: user.id,
              updatedBy: user.id,
            },
          });
        });
      } catch (error) {
        await deleteStoredObject(config, key).catch(() => undefined);
        throw error;
      }
      uploaded += 1;
      await logAudit({
        userId: user.id, userName: user.name, organizationId: user.organizationId,
        action: "UPLOAD", entityName: "ModelQuestionImport", entityId: id,
        changes: { classId, subjectId, boardId, academicYearId, fileId, originalName: item.filename, questionCount: parsed.questions.length },
      }).catch(() => undefined);
    } catch {
      return respondError(`${uploaded} of ${prepared.length} files uploaded; a later file failed. Refresh the table before retrying.`, 500);
    }
  }

  return NextResponse.json({ success: true, uploaded, questionCount: parsed.questions.length }, { headers: { "Cache-Control": "no-store" } });
}
