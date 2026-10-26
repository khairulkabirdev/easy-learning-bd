import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/app-auth";
import { prisma } from "@/lib/db";
import { getStoredObjectForUpload, readManagedImageFile } from "@/lib/storage/upload-management";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAFE_INLINE_TYPES = new Set([
  "image/webp",
  "image/jpeg",
  "image/png",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/pdf",
  "text/plain",
  "text/plain; charset=utf-8",
  "text/csv",
  "text/csv; charset=utf-8",
  "model/gltf-binary",
  "model/gltf+json",
  "model/stl",
]);

const SAFE_DOWNLOAD_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/octet-stream",
]);

async function canStudentViewFile(file: {
  ownerType: string;
  ownerId: string;
  vocabularyEntry?: { vocabulary: { classId: string } } | null;
}, organizationId: string) {
  if (file.ownerType === "User" || file.ownerType === "RichTextAsset") return true;

  let classId: string | null = null;
  if (file.ownerType === "VocabularyEntry") {
    classId = file.vocabularyEntry?.vocabulary.classId ?? null;
  } else if (file.ownerType === "Class") {
    classId = file.ownerId;
  } else if (file.ownerType === "Subject") {
    const subject = await prisma.subject.findFirst({ where: { id: file.ownerId, organizationId }, select: { classId: true } });
    classId = subject?.classId ?? null;
  } else if (file.ownerType === "Unit") {
    const unit = await prisma.unit.findFirst({ where: { id: file.ownerId, organizationId }, select: { classId: true } });
    classId = unit?.classId ?? null;
  } else if (file.ownerType === "Lesson") {
    const lesson = await prisma.lesson.findFirst({
      where: { id: file.ownerId, organizationId },
      select: { unit: { select: { classId: true } } },
    });
    classId = lesson?.unit.classId ?? null;
  } else if (file.ownerType === "Topic") {
    const topic = await prisma.topic.findFirst({
      where: { id: file.ownerId, organizationId },
      select: { lesson: { select: { unit: { select: { classId: true } } } } },
    });
    classId = topic?.lesson.unit.classId ?? null;
  }

  if (!classId) return false;
  const publishedClass = await prisma.class.findFirst({
    where: { id: classId, organizationId, status: "published" },
    select: { id: true },
  });
  return Boolean(publishedClass);
}

function safeContentType(value: string) {
  const normalized = value.toLowerCase().trim();
  if (SAFE_INLINE_TYPES.has(normalized) || SAFE_DOWNLOAD_TYPES.has(normalized)) return normalized;
  return "application/octet-stream";
}


function servedFileName(originalName: string, extension: string) {
  const clean = (originalName || "file").replace(/[\\/]/g, "-").trim() || "file";
  if (!extension) return clean;
  const dot = clean.lastIndexOf(".");
  const stem = dot > 0 ? clean.slice(0, dot) : clean;
  return `${stem}.${extension}`;
}

function contentDisposition(fileName: string, inline: boolean) {
  const clean = (fileName || "file")
    .replace(/[\r\n"]/g, "")
    .replace(/[\\/]/g, "-")
    .trim()
    .slice(0, 180) || "file";
  const ascii = clean.replace(/[^\x20-\x7E]/g, "_");
  return `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(clean)}`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ fileId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { fileId } = await context.params;
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(fileId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = await readManagedImageFile(fileId, user.organizationId);
  if (!file) return new NextResponse("Not found", { status: 404 });

  if (file.ownerType === "TempUpload" && file.createdBy !== user.id) {
    return new NextResponse("Not found", { status: 404 });
  }
  const hasPrivilegedContentAccess = user.role === "admin" || user.role === "teacher";
  if (!hasPrivilegedContentAccess && file.ownerType !== "TempUpload" && !(await canStudentViewFile(file, user.organizationId))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const contentType = safeContentType(file.mimeType || "application/octet-stream");
  const inline = SAFE_INLINE_TYPES.has(contentType);
  try {
    const stored = await getStoredObjectForUpload(file);
    const headers = new Headers({
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": contentDisposition(servedFileName(file.originalName, file.extension || "bin"), inline),
      "Cross-Origin-Resource-Policy": "same-site",
      Vary: "Cookie",
      "Cache-Control": "private, no-store",
    });
    return new Response(new Uint8Array(stored.body), { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "Stored file is temporarily unavailable." }, { status: 503 });
  }
}
