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
const CUSTOM_BACKEND_TIMEOUT_MS = 20_000;

function validateCustomHeaderName(value: string) {
  const name = value.trim();
  if (!name || !/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(name)) {
    throw new Error("Custom backend auth header name is invalid.");
  }
  const blocked = new Set(["host", "content-length", "transfer-encoding", "connection", "content-type", "x-storage-namespace"]);
  if (blocked.has(name.toLowerCase())) {
    throw new Error("Choose a different custom backend auth header name.");
  }
  return name;
}

function buildCustomBackendObjectUrl(config: ResolvedStorageConfiguration, key: string) {
  const endpoint = config.endpoint.trim().replace(/\/+$/, "");
  if (!endpoint) throw new Error("Custom backend API URL is required.");
  const safeKey = normalizeObjectKey(key);
  const encodedKey = safeKey.split("/").map(encodeURIComponent).join("/");
  return `${endpoint}/objects/${encodedKey}`;
}

function buildCustomBackendHeaders(
  config: ResolvedStorageConfiguration,
  contentType?: string,
) {
  const headerName = validateCustomHeaderName(config.accessKeyId);
  const headerValue = config.secretAccessKey;
  if (!headerValue || /[\r\n]/.test(headerValue)) {
    throw new Error("Custom backend auth header value is required and must be a single line.");
  }

  const headers = new Headers({
    [headerName]: headerValue,
    "X-Storage-Namespace": config.bucket,
    Accept: "application/octet-stream, */*",
  });
  if (contentType) headers.set("Content-Type", contentType);
  return headers;
}

async function customBackendRequest(
  config: ResolvedStorageConfiguration,
  key: string,
  method: "PUT" | "GET" | "DELETE",
  options: { body?: Buffer; contentType?: string; allowNotFound?: boolean } = {},
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CUSTOM_BACKEND_TIMEOUT_MS);
  try {
    const response = await fetch(buildCustomBackendObjectUrl(config, key), {
      method,
      headers: buildCustomBackendHeaders(config, options.contentType),
      body: options.body ? new Uint8Array(options.body) : undefined,
      redirect: "error",
      cache: "no-store",
      signal: controller.signal,
    });
    if (options.allowNotFound && response.status === 404) return response;
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).trim().replace(/\s+/g, " ").slice(0, 240);
      throw new Error(`Custom backend ${method} failed (${response.status})${detail ? `: ${detail}` : "."}`);
    }
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Custom backend request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

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

function normalizePathPrefix(value: string | null | undefined) {
  const trimmed = (value || "").trim().replace(/^\/+|\/+$/g, "");
  if (!trimmed) return "";
  const segments = trimmed.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === ".." || !/^[A-Za-z0-9._-]+$/.test(segment))) {
    throw new Error("Invalid storage path prefix.");
  }
  return segments.join("/");
}

export function createStorageObjectKey(
  organizationId: string,
  folder: string,
  fileId: string,
  extension = "webp",
  pathPrefix = "",
) {
  const organizationHash = crypto.createHash("sha256").update(organizationId).digest("hex").slice(0, 24);
  const baseKey = `organizations/${organizationHash}/${folder}/${fileId}.${extension}`;
  const prefix = normalizePathPrefix(pathPrefix);
  return prefix ? `${prefix}/${baseKey}` : baseKey;
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

  if (config.provider === "custom-backend") {
    await customBackendRequest(config, key, "PUT", { body, contentType });
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

  if (config.provider === "custom-backend") {
    const response = await customBackendRequest(config, key, "GET");
    const body = Buffer.from(await response.arrayBuffer());
    return { body, contentType: response.headers.get("content-type") || "application/octet-stream" };
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

  if (config.provider === "custom-backend") {
    await customBackendRequest(config, key, "DELETE", { allowNotFound: true });
    return;
  }

  const client = createS3Client(config);
  await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: normalizeObjectKey(key) }));
}

export async function testStorageConnection(
  config: ResolvedStorageConfiguration,
  options: { bucket?: string } = {},
) {
  const target = options.bucket && config.provider !== "local-private"
    ? { ...config, bucket: options.bucket }
    : config;

  if (target.provider === "local-private") {
    const key = `_health/${crypto.randomUUID()}.txt`;
    const payload = Buffer.from("easy-learning-bd-storage-check", "utf8");
    await putStoredObject(target, key, payload, "text/plain; charset=utf-8");
    try {
      const stored = await getStoredObject(target, key);
      if (!stored.body.equals(payload)) throw new Error("Local storage verification failed.");
    } finally {
      await deleteStoredObject(target, key);
    }
    return "Local private storage is writable and readable.";
  }

  const key = `_storage-health/${crypto.randomUUID()}.txt`;
  const payload = Buffer.from("easy-learning-bd-storage-check", "utf8");
  await putStoredObject(target, key, payload, "text/plain; charset=utf-8");
  try {
    const stored = await getStoredObject(target, key);
    if (!stored.body.equals(payload)) throw new Error("Object storage verification failed.");
  } finally {
    await deleteStoredObject(target, key);
  }
  if (target.provider === "custom-backend") {
    return "Custom backend read/write/delete access verified.";
  }
  return "Bucket read/write/delete access verified.";
}
