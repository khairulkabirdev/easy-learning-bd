import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

const publicRoot = path.resolve(process.cwd(), "public");
const vocabularyImageRoot = path.resolve(publicRoot, "uploads", "vocabulary");

export function isManagedVocabularyImageUrl(value: string | null | undefined) {
  return Boolean(value && /^\/uploads\/vocabulary\/[A-Za-z0-9-]+\.webp$/i.test(value));
}

export function isManagedVocabularyImagePath(value: string | null | undefined) {
  return Boolean(value && /^public\/uploads\/vocabulary\/[A-Za-z0-9-]+\.webp$/i.test(value));
}

function resolveLegacyVocabularyImagePath(value: string) {
  if (isManagedVocabularyImagePath(value)) {
    const absolutePath = path.resolve(process.cwd(), value);
    assertInsideVocabularyRoot(absolutePath);
    return absolutePath;
  }

  if (isManagedVocabularyImageUrl(value)) {
    const absolutePath = path.resolve(publicRoot, value.replace(/^\/+/, ""));
    assertInsideVocabularyRoot(absolutePath);
    return absolutePath;
  }

  return null;
}

function assertInsideVocabularyRoot(targetPath: string) {
  const root = path.resolve(vocabularyImageRoot);
  const target = path.resolve(targetPath);
  const relative = path.relative(root, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Invalid vocabulary image path.");
  }
}

/** Deletes only legacy vocabulary images that were stored under public/uploads/vocabulary. */
export async function deleteVocabularyImage(storagePathOrLegacyUrl: string | null | undefined) {
  if (!storagePathOrLegacyUrl) return;
  const absolutePath = resolveLegacyVocabularyImagePath(storagePathOrLegacyUrl);
  if (!absolutePath) return;

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
