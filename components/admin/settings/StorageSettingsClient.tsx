"use client";

import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Cloud, HardDrive, LoaderCircle, Plus, RefreshCw, ShieldCheck, TestTube2 } from "lucide-react";

import {
  activateStorageConfigurationAction,
  saveStorageConfigurationAction,
  testStorageConfigurationAction,
  type StorageActionState,
} from "@/app/admin/settings/storage/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import type { StorageConfigurationClientView } from "@/lib/storage/types";

const initialState: StorageActionState = { error: "", success: "" };

const providerLabels: Record<string, string> = {
  "local-private": "Local private storage",
  s3: "Amazon S3",
  "cloudflare-r2": "Cloudflare R2",
  minio: "MinIO",
  "s3-compatible": "Custom S3-compatible server",
};

function providerIcon(provider: string) {
  return provider === "local-private" ? <HardDrive className="size-4" /> : <Cloud className="size-4" />;
}

export function StorageSettingsClient({
  configurations,
  hasDedicatedEncryptionKey,
}: {
  configurations: StorageConfigurationClientView[];
  hasDedicatedEncryptionKey: boolean;
}) {
  const router = useRouter();
  const active = configurations.find((item) => item.isActive) ?? configurations[0];
  const [selectedId, setSelectedId] = useState(active?.id ?? "");
  const [isNew, setIsNew] = useState(false);
  const [activationState, setActivationState] = useState<StorageActionState>(initialState);
  const [isActivating, startActivation] = useTransition();
  const selected = configurations.find((item) => item.id === selectedId) ?? null;

  const handleSaved = useCallback((id: string) => {
    setSelectedId(id);
    setIsNew(false);
    router.refresh();
  }, [router]);

  function selectConfiguration(id: string) {
    setSelectedId(id);
    setIsNew(false);
    setActivationState(initialState);
  }

  function handleActivate(id: string) {
    startActivation(async () => {
      const result = await activateStorageConfigurationAction(id);
      setActivationState(result);
      if (!result.error) router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight">Storage configuration</h2>
          {active ? <Badge variant="secondary">Active: {providerLabels[active.provider] ?? active.provider}</Badge> : null}
        </div>
        <p className="text-sm text-muted-foreground">
          Configure where managed images and uploads are stored. New uploads use the active configuration; existing files stay linked to the configuration where they were saved.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-muted/20 p-3 text-sm">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="font-medium">Private by default</p>
            <p className="text-muted-foreground">
              Local files are kept outside <code>public/</code>. S3/R2/MinIO objects are uploaded without public ACLs and are served through authenticated media routes. Use a bucket policy that blocks public access.
            </p>
          </div>
        </div>
      </div>

      {!hasDedicatedEncryptionKey ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-muted-foreground">
          Set a stable <code>STORAGE_ENCRYPTION_KEY</code> in the server environment before saving cloud credentials. Generate a random key once and keep it backed up; if it changes, saved cloud credentials cannot be decrypted. Local private storage works without this key.
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Saved configurations</CardTitle>
            <CardDescription>Choose a configuration to edit or activate.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {configurations.map((configuration) => {
              const selectedItem = !isNew && configuration.id === selectedId;
              return (
                <div key={configuration.id} className={`rounded-lg border p-3 ${selectedItem ? "border-primary bg-accent/40" : ""}`}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-2 text-left"
                    onClick={() => selectConfiguration(configuration.id)}
                  >
                    <span className="mt-0.5 text-muted-foreground">{providerIcon(configuration.provider)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-sm font-medium">{configuration.name}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{providerLabels[configuration.provider] ?? configuration.provider}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{configuration.uploadedFileCount} managed file{configuration.uploadedFileCount === 1 ? "" : "s"}</span>
                    </span>
                    {configuration.isActive ? <Badge variant="secondary">Active</Badge> : null}
                  </button>
                  {!configuration.isActive ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full"
                      disabled={isActivating}
                      onClick={() => handleActivate(configuration.id)}
                    >
                      {isActivating ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />}
                      Activate and test
                    </Button>
                  ) : null}
                </div>
              );
            })}
            <Separator className="my-3" />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setIsNew(true);
                setSelectedId("");
                setActivationState(initialState);
              }}
            >
              <Plus /> New configuration
            </Button>
            {activationState.error ? <p className="text-sm text-destructive">{activationState.error}</p> : null}
            {activationState.success ? <p className="text-sm text-emerald-700 dark:text-emerald-400">{activationState.success}</p> : null}
          </CardContent>
        </Card>

        <StorageConfigurationEditor
          key={isNew ? "new-storage-config" : selected?.id ?? "new-storage-config-empty"}
          configuration={isNew ? null : selected}
          onSaved={handleSaved}
        />
      </div>
    </div>
  );
}

function StorageConfigurationEditor({
  configuration,
  onSaved,
}: {
  configuration: StorageConfigurationClientView | null;
  onSaved: (id: string) => void;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, formAction, isSaving] = useActionState(saveStorageConfigurationAction, initialState);
  const [provider, setProvider] = useState(configuration?.provider ?? "local-private");
  const [forcePathStyle, setForcePathStyle] = useState(
    configuration?.forcePathStyle ?? ["minio", "s3-compatible"].includes(provider),
  );
  const [testState, setTestState] = useState<StorageActionState>(initialState);
  const [isTesting, startTest] = useTransition();

  const wasSaving = useRef(false);
  useEffect(() => {
    if (isSaving) {
      wasSaving.current = true;
      return;
    }
    if (!wasSaving.current) return;
    wasSaving.current = false;
    if (state.success && !state.error) {
      if (state.configurationId) onSaved(state.configurationId);
    }
  }, [isSaving, state.success, state.error, state.configurationId, onSaved]);

  function testConnection() {
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    data.set("intent", "test");
    setTestState(initialState);
    startTest(async () => {
      const result = await testStorageConfigurationAction(data);
      setTestState(result);
    });
  }

  const isLocal = provider === "local-private";
  const isR2 = provider === "cloudflare-r2";
  const isS3 = provider === "s3";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{configuration ? "Edit configuration" : "Add storage configuration"}</CardTitle>
        <CardDescription>
          Credentials are encrypted before they are saved. Saved secrets are never sent back to this form.
          {configuration && configuration.isLocked ? " This configuration is locked for storage-detail changes because it has been activated or has stored files; create a new configuration to change providers, buckets, endpoints, paths, or credentials." : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-5">
          <input type="hidden" name="configurationId" value={configuration?.id ?? ""} />
          <input type="hidden" name="forcePathStyle" value={forcePathStyle ? "true" : "false"} />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="storage-name">Configuration name</Label>
              <Input id="storage-name" name="name" required minLength={2} maxLength={80} defaultValue={configuration?.name ?? "New storage configuration"} placeholder="Production uploads" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storage-provider">Storage provider</Label>
              <NativeSelect
                id="storage-provider"
                name="provider"
                value={provider}
                onChange={(event) => {
                  const nextProvider = event.target.value;
                  setProvider(nextProvider);
                  if (nextProvider === "minio" || nextProvider === "s3-compatible") setForcePathStyle(true);
                  else if (nextProvider === "s3" || nextProvider === "cloudflare-r2") setForcePathStyle(false);
                }}
                className="w-full"
              >
                <NativeSelectOption value="local-private">Local private storage</NativeSelectOption>
                <NativeSelectOption value="s3">Amazon S3</NativeSelectOption>
                <NativeSelectOption value="cloudflare-r2">Cloudflare R2</NativeSelectOption>
                <NativeSelectOption value="minio">MinIO</NativeSelectOption>
                <NativeSelectOption value="s3-compatible">Custom S3-compatible server</NativeSelectOption>
              </NativeSelect>
            </div>
          </div>

          {isLocal ? (
            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-medium"><HardDrive className="size-4" /> Private local disk</div>
              <div className="space-y-2">
                <Label htmlFor="storage-local-root">Storage directory (relative to project root)</Label>
                <Input id="storage-local-root" name="localRoot" defaultValue={configuration?.localRoot ?? "storage/private"} placeholder="storage/private" pattern="storage(/[A-Za-z0-9._-]+)+" required />
                <p className="text-xs text-muted-foreground">Must remain inside the project's <code>storage/</code> directory. The directory is not web-accessible.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="storage-endpoint">Endpoint URL {isS3 ? "(optional for standard AWS S3)" : ""}</Label>
                  <Input
                    id="storage-endpoint"
                    name="endpoint"
                    type="url"
                    defaultValue={configuration?.endpoint ?? (isR2 ? "https://ACCOUNT_ID.r2.cloudflarestorage.com" : "")}
                    placeholder={isS3 ? "https://s3.us-east-1.amazonaws.com" : isR2 ? "https://ACCOUNT_ID.r2.cloudflarestorage.com" : provider === "minio" ? "http://localhost:9000" : "https://s3.example.com"}
                    required={!isS3}
                  />
                  {isR2 ? <p className="text-xs text-muted-foreground">Use the S3 API endpoint from Cloudflare R2, not a public bucket URL.</p> : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storage-region">Region</Label>
                  <Input id="storage-region" name="region" defaultValue={configuration?.region ?? (isR2 ? "auto" : "us-east-1")} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storage-bucket">Bucket name</Label>
                  <Input id="storage-bucket" name="bucket" defaultValue={configuration?.bucket ?? ""} required autoComplete="off" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storage-access-key">Access key ID</Label>
                  <Input id="storage-access-key" name="accessKeyId" defaultValue={configuration?.accessKeyId ?? ""} required autoComplete="off" spellCheck={false} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storage-secret-key">Secret access key</Label>
                  <Input id="storage-secret-key" name="secretAccessKey" type="password" defaultValue="" required={!configuration?.hasSecretAccessKey} autoComplete="new-password" placeholder={configuration?.hasSecretAccessKey ? "Saved securely — leave blank to keep" : "Enter secret access key"} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="storage-session-token">Session token (optional)</Label>
                  <Input id="storage-session-token" name="sessionToken" type="password" defaultValue="" autoComplete="new-password" placeholder={configuration?.hasSessionToken ? "Saved securely — leave blank to keep" : "Temporary AWS session token, if used"} />
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm">
                <input
                  type="checkbox"
                  checked={forcePathStyle}
                  onChange={(event) => setForcePathStyle(event.target.checked)}
                  className="mt-0.5 size-4 accent-primary"
                />
                <span>
                  <span className="block font-medium">Use path-style requests</span>
                  <span className="mt-1 block text-xs text-muted-foreground">Usually needed for MinIO and some custom S3-compatible servers.</span>
                </span>
              </label>
            </div>
          )}

          <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Provider notes</p>
            {isLocal ? <p className="mt-1">No cloud credentials are needed. The active storage directory must be persistent and backed up with your app deployment.</p> : null}
            {isS3 ? <p className="mt-1">Use a dedicated IAM access key with only the required bucket object permissions. Keep the bucket private and enable server-side encryption.</p> : null}
            {isR2 ? <p className="mt-1">Use an R2 API token scoped to this bucket with object read/write permissions. Region should be <code>auto</code>.</p> : null}
            {provider === "minio" ? <p className="mt-1">Use the MinIO S3 API endpoint and a dedicated access key. For production, use HTTPS or a trusted private network.</p> : null}
            {provider === "s3-compatible" ? <p className="mt-1">Enter your S3-compatible server's API endpoint, region, bucket, and access keys. The endpoint must be reachable from the Next.js server.</p> : null}
          </div>

          {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
          {state.success ? <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{state.success}</p> : null}
          {testState.error ? <p role="alert" className="text-sm text-destructive">{testState.error}</p> : null}
          {testState.success ? <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{testState.success}</p> : null}

          {configuration?.lastTestedAt ? (
            <p className="text-xs text-muted-foreground">Last test: {new Date(configuration.lastTestedAt).toLocaleString()} · {configuration.lastTestStatus === "success" ? "passed" : configuration.lastTestStatus}</p>
          ) : null}

          <Separator />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={isTesting || isSaving} onClick={testConnection}>
              {isTesting ? <LoaderCircle className="animate-spin" /> : <TestTube2 />}
              Test connection
            </Button>
            <Button type="submit" name="intent" value="save" variant="outline" disabled={isSaving || isTesting}>
              {isSaving ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
              Save configuration
            </Button>
            <Button type="submit" name="intent" value="activate" disabled={isSaving || isTesting}>
              {isSaving ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />}
              Save and activate
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
