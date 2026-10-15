"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertTrustedMutationOrigin, requireAdmin } from "@/lib/app-auth";
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/db";
import { decryptStorageSecret, encryptStorageSecret } from "@/lib/storage/secrets";
import { findStorageConfigurationForOrganization, resolveStorageConfiguration } from "@/lib/storage/configurations";
import { testStorageConnection, validateLocalStorageRoot } from "@/lib/storage/object-store";
import type { ResolvedStorageConfiguration, StorageProvider } from "@/lib/storage/types";

const formSchema = z.object({
  configurationId: z.string().trim().max(100).default(""),
  name: z.string().trim().min(2, "Configuration name must be at least 2 characters.").max(80, "Configuration name is too long."),
  provider: z.enum(["local-private", "s3", "cloudflare-r2", "minio", "s3-compatible"]),
  endpoint: z.string().trim().max(500).default(""),
  region: z.string().trim().max(100).default("auto"),
  bucket: z.string().trim().max(255).default(""),
  accessKeyId: z.string().trim().max(256).default(""),
  secretAccessKey: z.string().max(2048).default(""),
  sessionToken: z.string().max(4096).default(""),
  localRoot: z.string().trim().max(300).default("storage/private"),
  forcePathStyle: z.boolean().default(false),
  intent: z.enum(["save", "activate", "test"]).default("save"),
});

export type StorageActionState = {
  error: string;
  success: string;
  configurationId?: string;
};

function parseForm(formData: FormData) {
  const raw = formSchema.safeParse({
    configurationId: String(formData.get("configurationId") || ""),
    name: String(formData.get("name") || ""),
    provider: String(formData.get("provider") || "local-private"),
    endpoint: String(formData.get("endpoint") || ""),
    region: String(formData.get("region") || "auto"),
    bucket: String(formData.get("bucket") || ""),
    accessKeyId: String(formData.get("accessKeyId") || ""),
    secretAccessKey: String(formData.get("secretAccessKey") || ""),
    sessionToken: String(formData.get("sessionToken") || ""),
    localRoot: String(formData.get("localRoot") || "storage/private"),
    forcePathStyle: formData.get("forcePathStyle") === "on" || formData.get("forcePathStyle") === "true",
    intent: String(formData.get("intent") || "save"),
  });
  if (!raw.success) throw new Error(raw.error.issues[0]?.message || "Check the storage configuration fields.");
  return raw.data;
}

function validateEndpoint(provider: StorageProvider, endpoint: string) {
  if (provider === "local-private") return "";
  if (provider === "s3" && !endpoint) return "";
  if (!endpoint) throw new Error("Endpoint URL is required for this storage provider.");

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error("Enter a valid storage endpoint URL.");
  }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("Endpoint must be an http(s) URL without embedded credentials, query strings, or fragments.");
  }
  const hostname = url.hostname.toLowerCase();
  const normalizedHostname = hostname.replace(/^\[|\]$/g, "");
  if (["metadata", "metadata.google.internal", "metadata.azure.internal", "instance-data", "169.254.169.254", "169.254.170.2"].includes(normalizedHostname)) {
    throw new Error("This endpoint hostname is reserved and cannot be used as an object-storage endpoint.");
  }
  const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(normalizedHostname);
  const ipv4 = normalizedHostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)?.slice(1).map(Number);
  const isPrivateIpv4 = Boolean(ipv4 && ipv4.every((part) => part >= 0 && part <= 255) && (
    ipv4[0] === 10 || ipv4[0] === 127 ||
    (ipv4[0] === 172 && ipv4[1] >= 16 && ipv4[1] <= 31) ||
    (ipv4[0] === 192 && ipv4[1] === 168)
  ));
  const isDockerServiceName = /^[a-z0-9-]+$/.test(normalizedHostname) && !normalizedHostname.includes(".");
  const isPrivateIpv6 = normalizedHostname.startsWith("fc") || normalizedHostname.startsWith("fd") || normalizedHostname.startsWith("fe80:");
  const isPrivateEndpoint = isLoopback || isPrivateIpv4 || isDockerServiceName || isPrivateIpv6;
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:" && !isPrivateEndpoint) {
    throw new Error("Remote storage endpoints must use HTTPS in production; plain HTTP is only allowed for loopback/private network endpoints.");
  }
  if (provider === "cloudflare-r2" && !url.hostname.toLowerCase().endsWith(".r2.cloudflarestorage.com")) {
    throw new Error("Use the Cloudflare R2 S3 API endpoint shown in the Cloudflare dashboard.");
  }
  return url.toString().replace(/\/$/, "");
}

function validateBucketName(value: string) {
  const bucket = value.trim();
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket) || bucket.includes("..") || bucket.includes(".-") || bucket.includes("-.") ) {
    throw new Error("Enter a valid bucket name (3–63 lowercase letters, numbers, dots, or hyphens).");
  }
  return bucket;
}

async function buildCandidate(form: ReturnType<typeof parseForm>, organizationId: string) {
  const existing = form.configurationId
    ? await findStorageConfigurationForOrganization(form.configurationId, organizationId)
    : null;
  if (form.configurationId && !existing) throw new Error("Storage configuration not found.");

  const provider = form.provider as StorageProvider;
  const endpoint = validateEndpoint(provider, form.endpoint);
  const requestedRegion = form.region.trim();
  const region = provider === "cloudflare-r2"
    ? "auto"
    : !requestedRegion || requestedRegion === "auto"
      ? "us-east-1"
      : requestedRegion;
  let bucket = "";
  let accessKeyId = "";
  let secretAccessKey = "";
  let sessionToken = "";
  let localRoot = "storage/private";
  let forcePathStyle = false;

  if (provider === "local-private") {
    localRoot = form.localRoot || "storage/private";
    validateLocalStorageRoot(localRoot);
  } else {
    bucket = validateBucketName(form.bucket);
    accessKeyId = form.accessKeyId.trim() || existing?.accessKeyId || "";
    secretAccessKey = form.secretAccessKey || (existing?.secretAccessKeyEncrypted ? decryptStorageSecret(existing.secretAccessKeyEncrypted) : "");
    sessionToken = form.sessionToken || (existing?.sessionTokenEncrypted ? decryptStorageSecret(existing.sessionTokenEncrypted) : "");
    if (!accessKeyId || !secretAccessKey) {
      throw new Error("Access key ID and secret access key are required. Leave the secret blank only when keeping a previously saved secret.");
    }
    forcePathStyle = form.forcePathStyle || provider === "minio";
  }

  const candidate = {
    id: existing?.id || "pending-storage-configuration",
    name: form.name,
    provider,
    endpoint,
    region,
    bucket,
    accessKeyId,
    secretAccessKeyEncrypted: existing?.secretAccessKeyEncrypted || "",
    sessionTokenEncrypted: existing?.sessionTokenEncrypted || "",
    localRoot,
    forcePathStyle,
    isActive: existing?.isActive || false,
    everActivated: existing?.everActivated || false,
    lastTestStatus: existing?.lastTestStatus || "unknown",
    lastTestMessage: existing?.lastTestMessage || "",
    lastTestedAt: existing?.lastTestedAt || null,
    organizationId,
    createdBy: existing?.createdBy || "",
    updatedBy: existing?.updatedBy || "",
    createdAt: existing?.createdAt || new Date(),
    updatedAt: existing?.updatedAt || new Date(),
    sessionToken,
  } as const;

  const resolved: ResolvedStorageConfiguration = {
    ...candidate,
    secretAccessKey,
    sessionToken,
  };

  return { existing, candidate: resolved, provider, endpoint, region, bucket, accessKeyId, secretAccessKey, sessionToken, localRoot, forcePathStyle };
}

function safeStorageError(error: unknown) {
  if (error instanceof Error && /STORAGE_ENCRYPTION_KEY|SESSION_SECRET|encryption is not configured/i.test(error.message)) {
    return "Storage credential encryption is unavailable. Configure a stable STORAGE_ENCRYPTION_KEY on the server before saving cloud credentials.";
  }
  return "Storage connection failed. Check the endpoint, bucket, credentials, region, and bucket permissions.";
}

export async function testStorageConfigurationAction(formData: FormData): Promise<StorageActionState> {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  try {
    const form = parseForm(formData);
    const { candidate } = await buildCandidate(form, user.organizationId);
    const success = await testStorageConnection(candidate);
    return { error: "", success };
  } catch (error) {
    const message = error instanceof Error && /required|valid|HTTPS|endpoint|bucket|path|name|credentials|not found|encryption/i.test(error.message)
      ? error.message
      : safeStorageError(error);
    return { error: message, success: "" };
  }
}

export async function saveStorageConfigurationAction(
  _previousState: StorageActionState,
  formData: FormData,
): Promise<StorageActionState> {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  try {
    const form = parseForm(formData);
    const { existing, candidate, provider, endpoint, region, bucket, accessKeyId, secretAccessKey, sessionToken, localRoot, forcePathStyle } = await buildCandidate(form, user.organizationId);
    if (existing) {
      const usedFileCount = await prisma.uploadedFile.count({ where: { storageConfigurationId: existing.id, storageDeletedAt: null } });
      const storageDetailsChanged =
        provider !== existing.provider ||
        endpoint !== existing.endpoint ||
        region !== existing.region ||
        bucket !== existing.bucket ||
        accessKeyId !== existing.accessKeyId ||
        localRoot !== existing.localRoot ||
        forcePathStyle !== existing.forcePathStyle ||
        Boolean(form.secretAccessKey) ||
        Boolean(form.sessionToken);
      if ((existing.everActivated || usedFileCount > 0) && storageDetailsChanged) {
        throw new Error("This configuration has been activated or used by uploads. Create a new configuration for changed endpoints, buckets, paths, or credentials so existing files remain accessible.");
      }
    }
    const shouldActivate = form.intent === "activate" || Boolean(existing?.isActive);
    let testMessage = existing?.lastTestMessage || "";
    let testStatus = existing?.lastTestStatus || "unknown";
    let testedAt = existing?.lastTestedAt || null;

    if (shouldActivate) {
      testMessage = await testStorageConnection(candidate);
      testStatus = "success";
      testedAt = new Date();
    }

    const encryptedSecret = provider === "local-private"
      ? ""
      : form.secretAccessKey
        ? encryptStorageSecret(secretAccessKey)
        : existing?.secretAccessKeyEncrypted || encryptStorageSecret(secretAccessKey);
    const encryptedSessionToken = provider === "local-private"
      ? ""
      : form.sessionToken
        ? encryptStorageSecret(sessionToken)
        : existing?.sessionTokenEncrypted || (sessionToken ? encryptStorageSecret(sessionToken) : "");

    const saved = await prisma.$transaction(async (tx) => {
      if (shouldActivate) {
        await tx.storageConfiguration.updateMany({
          where: { organizationId: user.organizationId },
          data: { isActive: false },
        });
      }

      const data = {
        name: form.name,
        provider,
        endpoint,
        region,
        bucket,
        accessKeyId,
        secretAccessKeyEncrypted: encryptedSecret,
        sessionTokenEncrypted: encryptedSessionToken,
        localRoot,
        forcePathStyle,
        isActive: shouldActivate,
        everActivated: Boolean(existing?.everActivated || shouldActivate),
        lastTestStatus: testStatus,
        lastTestMessage: testMessage,
        lastTestedAt: testedAt,
        updatedBy: user.id,
      };

      let record;
      if (existing) {
        record = await tx.storageConfiguration.update({ where: { id: existing.id }, data });
      } else {
        record = await tx.storageConfiguration.create({
          data: {
            ...data,
            organizationId: user.organizationId,
            createdBy: user.id,
          },
        });
      }

      if (shouldActivate) {
        await tx.storageConfiguration.updateMany({
          where: { organizationId: user.organizationId, id: { not: record.id } },
          data: { isActive: false },
        });
        await tx.storageConfiguration.update({ where: { id: record.id }, data: { isActive: true } });
      }
      return record;
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: existing ? "UPDATE" : "CREATE",
      entityName: "StorageConfiguration",
      entityId: saved.id,
      changes: {
        name: saved.name,
        provider: saved.provider,
        bucket: saved.bucket,
        endpoint: saved.endpoint,
        isActive: saved.isActive,
      },
      organizationId: user.organizationId,
    });

    revalidatePath("/admin/settings/storage");
    revalidatePath("/admin/settings");
    return {
      error: "",
      success: shouldActivate ? "Configuration saved and activated." : "Configuration saved.",
      configurationId: saved.id,
    };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") {
      return { error: "A storage configuration with this name already exists.", success: "" };
    }
    return { error: error instanceof Error && /required|valid|HTTPS|endpoint|bucket|path|name|credentials|not found|encryption|activated|referenced|existing uploads/i.test(error.message) ? error.message : safeStorageError(error), success: "" };
  }
}

export async function activateStorageConfigurationAction(configurationId: string): Promise<StorageActionState> {
  await assertTrustedMutationOrigin();
  const user = await requireAdmin();
  try {
    const id = z.string().min(8).max(100).parse(configurationId);
    const record = await findStorageConfigurationForOrganization(id, user.organizationId);
    if (!record) return { error: "Storage configuration not found.", success: "" };

    const resolved = resolveStorageConfiguration(record);
    const testMessage = await testStorageConnection(resolved);
    await prisma.$transaction(async (tx) => {
      await tx.storageConfiguration.updateMany({
        where: { organizationId: user.organizationId },
        data: { isActive: false },
      });
      await tx.storageConfiguration.update({
        where: { id: record.id },
        data: {
          isActive: true,
          everActivated: true,
          lastTestStatus: "success",
          lastTestMessage: testMessage,
          lastTestedAt: new Date(),
          updatedBy: user.id,
        },
      });
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: "ACTIVATE",
      entityName: "StorageConfiguration",
      entityId: record.id,
      changes: { provider: record.provider, name: record.name, isActive: true },
      organizationId: user.organizationId,
    });

    revalidatePath("/admin/settings/storage");
    revalidatePath("/admin/settings");
    return { error: "", success: "Storage configuration activated." };
  } catch (error) {
    return { error: safeStorageError(error), success: "" };
  }
}

