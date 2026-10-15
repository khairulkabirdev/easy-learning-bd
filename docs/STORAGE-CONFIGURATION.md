# Storage configuration and private media

The admin interface is available at `/admin/settings/storage` and is also linked from the Admin sidebar under **Storage → Configuration**.

## Providers

- **Local private storage** is created and activated automatically when an organization has no active configuration. Objects are stored under `storage/private/`, outside `public/`.
- **Amazon S3** uses the AWS SDK for JavaScript v3.
- **Cloudflare R2** uses the S3-compatible API endpoint from the Cloudflare dashboard and region `auto`.
- **MinIO** supports custom API endpoints and path-style requests.
- **Custom S3-compatible** supports other S3 API servers with an endpoint, region, bucket, credentials, and optional path-style requests.

All new managed images are validated from their actual bytes, decoded and re-encoded to WebP, resized to at most 2000 × 2000, stripped of source metadata, and limited to a 5 MB input. They are stored outside the public web root (or in a private object bucket) and served through authenticated `/api/media/<fileId>` URLs.

## Required server key

Before saving cloud credentials, set `STORAGE_ENCRYPTION_KEY` in the server environment to a stable random value of at least 32 characters. Generate one with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Keep this key stable and back it up securely. If it is changed or lost, stored cloud credentials cannot be decrypted. Do not commit the real key to Git or expose it to browser code.

## Safe activation and configuration history

The **Test connection** action performs a temporary write/read/delete check. **Save and activate** tests the candidate configuration before switching the active provider. Objects are not given public ACLs by this application. Keep S3/R2/MinIO buckets private and restrict credentials to the intended bucket.

Every `UploadedFile` records the storage configuration ID that originally stored it. Old configuration records must remain available so older files can still be read and deleted after a provider switch. When a configuration already has files that have not been physically deleted, the app prevents changes to its provider, endpoint, bucket, credentials, path, or request style. Create a new named configuration instead. Keep old credentials valid until the objects that reference them are migrated or retired.

## Local storage deployment

Persist the `storage/private/` directory in backups and deployments. It is intentionally ignored by Git. Do not put it under `public/`. The configured local path must remain inside the project's `storage/` directory.

## Database safety

`StorageConfiguration` and `UploadedFile.storageConfigurationId` are added through the non-destructive SQLite repair script. The repair script uses `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ADD COLUMN` only when missing, and `CREATE INDEX IF NOT EXISTS`. It does not reset or replace `prisma/dev.db`.

## Existing uploads

Existing images whose database values still point to legacy `/uploads/...` paths are preserved in place so existing lessons and profiles do not break. All new profile, class/subject/unit/lesson/topic, and Vocabulary image uploads use the active private storage configuration. Legacy images can be migrated with a separate controlled migration after verifying a backup; do not delete the old `public/uploads/` files until that migration has been completed and checked.

## Installing this update

This update adds `@aws-sdk/client-s3`. After extracting the source update, run `npm install` once to install the SDK and update your local `package-lock.json`, then run `npm run dev`. The existing pre-dev script generates Prisma Client and applies the non-destructive SQLite repair. Do not reset or replace `prisma/dev.db`.
