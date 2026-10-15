import "server-only";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import type { ResolvedStorageConfiguration } from "@/lib/storage/types";

const DEFAULT_LOCAL_ROOT = "storage/private";

function normalizeObjectKey(key: string) {
  const segments = key.split("/");
  if (
    !key ||
    key.startsWith("/") ||
    key.includes("\\") ||
    key.includes("\0") ||
    segments.some((segment) => !segment || segment === "." || segment === ".." || !/^[A-Za-z0-9._-]+$/.test(segment))
  ) {
    throw new Error("Invalid storage object key.");
  }
  return segments.join("/");
}

export function validateLocalStorageRoot(localRoot: string) {
  const root = (localRoot || DEFAULT_LOCAL_ROOT).replace(/\\/g, "/");
  const segments = root.split("/");
  if (
    path.isAbsolute(root) ||
    !root.startsWith("storage/") ||
    segments.length < 2 ||
    segments.some((part) => !part || part === ".." || part === ".")
  ) {
    throw new Error("Local storage path must remain inside a subdirectory of the project's storage directory.");
  }

  const storageBase = path.resolve(process.cwd(), "storage");
  const absoluteRoot = path.resolve(process.cwd(), root);
  const relative = path.relative(storageBase, absoluteRoot);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Invalid local storage directory.");
  }
  return absoluteRoot;
}

function resolveLocalObjectPath(config: ResolvedStorageConfiguration, key: string) {
  const safeKey = normalizeObjectKey(key);
  const root = validateLocalStorageRoot(config.localRoot);
  const absolutePath = path.resolve(root, ...safeKey.split("/"));
  const relative = path.relative(root, absolutePath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Invalid local storage object path.");
  }
  return { root, absolutePath };
}

function createS3Client(config: ResolvedStorageConfiguration) {
  if (!config.bucket.trim()) throw new Error("Storage bucket is required.");
  if (!config.accessKeyId.trim() || !config.secretAccessKey) {
    throw new Error("Access key ID and secret access key are required for S3-compatible storage.");
  }

  const endpoint = config.endpoint.trim();
  return new S3Client({
    region: config.region.trim() || (config.provider === "cloudflare-r2" ? "auto" : "us-east-1"),
    ...(endpoint ? { endpoint } : {}),
    forcePathStyle: Boolean(config.forcePathStyle || config.provider === "minio"),
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      ...(config.sessionToken ? { sessionToken: config.sessionToken } : {}),
    },
    maxAttempts: 2,
  });
}

export function createStorageObjectKey(organizationId: string, folder: string, fileId: string, extension = "webp") {
  const organizationHash = crypto.createHash("sha256").update(organizationId).digest("hex").slice(0, 24);
  return `organizations/${organizationHash}/${folder}/${fileId}.${extension}`;
}

export async function putStoredObject(
  config: ResolvedStorageConfiguration,
  key: string,
  body: Buffer,
  contentType: string,
) {
  if (config.provider === "local-private") {
    const { root, absolutePath } = resolveLocalObjectPath(config, key);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true, mode: 0o700 });
    await fs.chmod(root, 0o700).catch(() => undefined);
    await fs.writeFile(absolutePath, body, { flag: "wx", mode: 0o600 });
    return;
  }

  const client = createS3Client(config);
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: normalizeObjectKey(key),
      Body: body,
      ContentType: contentType,
      CacheControl: "private, max-age=300",
      ServerSideEncryption: config.provider === "s3" ? "AES256" : undefined,
    }),
  );
}

export async function getStoredObject(config: ResolvedStorageConfiguration, key: string) {
  if (config.provider === "local-private") {
    const { absolutePath } = resolveLocalObjectPath(config, key);
    const body = await fs.readFile(absolutePath);
    return { body, contentType: "application/octet-stream" };
  }

  const client = createS3Client(config);
  const result = await client.send(
    new GetObjectCommand({ Bucket: config.bucket, Key: normalizeObjectKey(key) }),
  );
  if (!result.Body) throw new Error("Stored object has no response body.");
  const body = Buffer.from(await result.Body.transformToByteArray());
  return { body, contentType: result.ContentType || "application/octet-stream" };
}

export async function deleteStoredObject(config: ResolvedStorageConfiguration, key: string) {
  if (config.provider === "local-private") {
    const { absolutePath } = resolveLocalObjectPath(config, key);
    try {
      await fs.unlink(absolutePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    return;
  }

  const client = createS3Client(config);
  await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: normalizeObjectKey(key) }));
}

export async function testStorageConnection(config: ResolvedStorageConfiguration) {
  if (config.provider === "local-private") {
    const key = `_health/${crypto.randomUUID()}.txt`;
    const payload = Buffer.from("easy-learning-bd-storage-check", "utf8");
    await putStoredObject(config, key, payload, "text/plain; charset=utf-8");
    try {
      const stored = await getStoredObject(config, key);
      if (!stored.body.equals(payload)) throw new Error("Local storage verification failed.");
    } finally {
      await deleteStoredObject(config, key);
    }
    return "Local private storage is writable and readable.";
  }

  const key = `_storage-health/${crypto.randomUUID()}.txt`;
  const payload = Buffer.from("easy-learning-bd-storage-check", "utf8");
  await putStoredObject(config, key, payload, "text/plain; charset=utf-8");
  try {
    const stored = await getStoredObject(config, key);
    if (!stored.body.equals(payload)) throw new Error("Object storage verification failed.");
  } finally {
    await deleteStoredObject(config, key);
  }
  return "Bucket read/write/delete access verified.";
}
