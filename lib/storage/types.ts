export const STORAGE_PROVIDERS = [
  "local-private",
  "s3",
  "cloudflare-r2",
  "minio",
  "s3-compatible",
  "custom-backend",
] as const;

export type StorageProvider = (typeof STORAGE_PROVIDERS)[number];

export type StorageConfigurationRecord = {
  id: string;
  name: string;
  provider: string;
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKeyEncrypted: string;
  sessionTokenEncrypted: string;
  localRoot: string;
  forcePathStyle: boolean;
  publicBaseUrl: string;
  privateBucket: string;
  maxImageSizeMb: number;
  maxVideoSizeMb: number;
  maxModelSizeMb: number;
  pathPrefix: string;
  isActive: boolean;
  everActivated: boolean;
  lastTestStatus: string;
  lastTestMessage: string;
  lastTestedAt: Date | null;
  organizationId: string;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ResolvedStorageConfiguration = Omit<
  StorageConfigurationRecord,
  "secretAccessKeyEncrypted" | "sessionTokenEncrypted"
> & {
  secretAccessKey: string;
  sessionToken: string;
};

export type StorageConfigurationView = Omit<
  StorageConfigurationRecord,
  "secretAccessKeyEncrypted" | "sessionTokenEncrypted" | "accessKeyId" | "createdBy" | "updatedBy"
> & {
  accessKeyId: string;
  hasSecretAccessKey: boolean;
  hasSessionToken: boolean;
};

export type StorageConfigurationClientView = {
  id: string;
  name: string;
  provider: string;
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  hasSecretAccessKey: boolean;
  hasSessionToken: boolean;
  localRoot: string;
  forcePathStyle: boolean;
  publicBaseUrl: string;
  privateBucket: string;
  maxImageSizeMb: number;
  maxVideoSizeMb: number;
  maxModelSizeMb: number;
  pathPrefix: string;
  isActive: boolean;
  isLocked: boolean;
  lastTestStatus: string;
  lastTestMessage: string;
  lastTestedAt: string | null;
  uploadedFileCount: number;
};
