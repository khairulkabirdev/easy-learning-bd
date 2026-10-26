"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ComponentType,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRightLeft,
  BookOpen,
  Check,
  CheckCircle2,
  Cloud,
  Database,
  Droplets,
  Globe2,
  HardDrive,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Plus,
  RefreshCw,
  Save,
  Server,
  Settings2,
  TestTube2,
  Upload,
  UserRound,
} from "lucide-react";

import {
  migrateStorageFilesAction,
  saveStorageConfigurationAction,
  testStorageConfigurationAction,
  type StorageActionState,
} from "@/app/admin/settings/storage/actions";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import type { StorageConfigurationClientView } from "@/lib/storage/types";
import { cn } from "@/lib/utils";

const initialState: StorageActionState = { error: "", success: "" };

type ProviderKey = "cloudflare-r2" | "s3" | "minio" | "s3-compatible" | "custom-backend" | "local-private";

type ProviderDefinition = {
  value: ProviderKey;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

const storageProviders: ProviderDefinition[] = [
  {
    value: "cloudflare-r2",
    label: "Cloudflare R2",
    description: "S3-compatible storage with no egress fees",
    icon: Cloud,
  },
  {
    value: "s3",
    label: "AWS S3",
    description: "Amazon S3 object storage",
    icon: Server,
  },
  {
    value: "minio",
    label: "MinIO",
    description: "Self-hosted S3 on your own server",
    icon: Database,
  },
  {
    value: "s3-compatible",
    label: "DigitalOcean Spaces",
    description: "Spaces object storage with a built-in CDN",
    icon: Droplets,
  },
  {
    value: "custom-backend",
    label: "Custom Backend Server",
    description: "Connect your own authenticated storage API",
    icon: Globe2,
  },
  {
    value: "local-private",
    label: "Local Storage",
    description: "Store files securely on this application server",
    icon: HardDrive,
  },
];

const providerLabels: Record<string, string> = {
  "local-private": "Local Storage",
  s3: "AWS S3",
  "cloudflare-r2": "Cloudflare R2",
  minio: "MinIO",
  "s3-compatible": "DigitalOcean Spaces",
  "custom-backend": "Custom Backend Server",
};

function configurationForProvider(configurations: StorageConfigurationClientView[], provider: string) {
  return configurations.find((item) => item.provider === provider && item.isActive)
    ?? configurations.find((item) => item.provider === provider)
    ?? null;
}

function accountIdFromR2Endpoint(endpoint: string) {
  try {
    const hostname = new URL(endpoint).hostname;
    return hostname.endsWith(".r2.cloudflarestorage.com") ? hostname.split(".")[0] ?? "" : "";
  } catch {
    return "";
  }
}

function defaultEndpoint(provider: ProviderKey) {
  if (provider === "minio") return "http://localhost:9000";
  if (provider === "s3-compatible") return "https://nyc3.digitaloceanspaces.com";
  if (provider === "custom-backend") return "https://storage.example.com/api/storage";
  return "";
}

function defaultRegion(provider: ProviderKey) {
  if (provider === "cloudflare-r2") return "auto";
  if (provider === "s3-compatible") return "nyc3";
  if (provider === "custom-backend") return "custom";
  return "us-east-1";
}

function defaultName(provider: ProviderKey, number: number) {
  const base = providerLabels[provider] ?? "Storage";
  return number <= 1 ? base : `${base} ${number}`;
}

export function StorageSettingsClient({
  configurations,
  hasDedicatedEncryptionKey,
}: {
  configurations: StorageConfigurationClientView[];
  hasDedicatedEncryptionKey: boolean;
}) {
  const router = useRouter();
  const active = configurations.find((item) => item.isActive) ?? configurations[0] ?? null;
  const initialProvider = (active?.provider || "cloudflare-r2") as ProviderKey;
  const [provider, setProvider] = useState<ProviderKey>(initialProvider);
  const initialSelected = configurationForProvider(configurations, initialProvider);
  const [selectedId, setSelectedId] = useState(initialSelected?.id ?? "");
  const [isNew, setIsNew] = useState(!initialSelected);

  const selected = !isNew ? configurations.find((item) => item.id === selectedId) ?? null : null;
  const providerConfigurations = configurations.filter((item) => item.provider === provider);
  const nextSuggestedName = defaultName(provider, providerConfigurations.length + 1);

  const chooseProvider = useCallback((nextProvider: ProviderKey) => {
    const next = configurationForProvider(configurations, nextProvider);
    setProvider(nextProvider);
    setSelectedId(next?.id ?? "");
    setIsNew(!next);
  }, [configurations]);

  const newConnection = useCallback(() => {
    setSelectedId("");
    setIsNew(true);
  }, []);

  const handleSaved = useCallback((id: string) => {
    setSelectedId(id);
    setIsNew(false);
    router.refresh();
  }, [router]);

  const connected = Boolean(active);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border bg-card px-5 py-5 shadow-sm sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold tracking-tight">Storage Settings</h1>
            <p className="text-sm text-muted-foreground">Configure file storage provider for media uploads</p>
          </div>
          <Badge
            variant="secondary"
            className={cn(
              "h-8 w-fit gap-1.5 rounded-full px-3 text-xs font-medium",
              connected && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
            )}
          >
            <CheckCircle2 className="size-3.5" />
            {connected ? "Connected" : "Not connected"}
          </Badge>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {storageProviders.map((item) => {
            const Icon = item.icon;
            const isSelected = provider === item.value;
            const saved = configurationForProvider(configurations, item.value);
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => chooseProvider(item.value)}
                className={cn(
                  "relative min-h-36 rounded-2xl border bg-background p-4 text-left transition-all hover:border-primary/45 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                  isSelected && "border-primary bg-primary/[0.035] ring-1 ring-primary/60",
                )}
              >
                <span className="mb-4 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Icon className={cn("size-5", isSelected && "text-primary")} />
                </span>
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="mt-1 block max-w-44 text-xs leading-5 text-muted-foreground">{item.description}</span>
                {isSelected ? (
                  <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" />
                  </span>
                ) : saved?.isActive ? (
                  <span className="absolute right-3 top-3 size-2 rounded-full bg-emerald-500" aria-label="Active" />
                ) : null}
              </button>
            );
          })}
        </div>


        {!hasDedicatedEncryptionKey && provider !== "local-private" ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/35 bg-amber-500/[0.06] p-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p className="text-muted-foreground">
              Configure a stable <code>STORAGE_ENCRYPTION_KEY</code> before saving cloud credentials. Saved access secrets are encrypted with this key.
            </p>
          </div>
        ) : null}

        <StorageConfigurationEditor
          key={`${provider}:${isNew ? "new" : selected?.id ?? "empty"}`}
          provider={provider}
          configuration={selected}
          configurations={configurations}
          providerConfigurations={providerConfigurations}
          suggestedName={nextSuggestedName}
          onChooseConfiguration={(id) => {
            setSelectedId(id);
            setIsNew(false);
          }}
          onNewConnection={newConnection}
          onSaved={handleSaved}
        />
      </section>
    </div>
  );
}

function StorageConfigurationEditor({
  provider,
  configuration,
  configurations,
  providerConfigurations,
  suggestedName,
  onChooseConfiguration,
  onNewConnection,
  onSaved,
}: {
  provider: ProviderKey;
  configuration: StorageConfigurationClientView | null;
  configurations: StorageConfigurationClientView[];
  providerConfigurations: StorageConfigurationClientView[];
  suggestedName: string;
  onChooseConfiguration: (id: string) => void;
  onNewConnection: () => void;
  onSaved: (id: string) => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, formAction, isSaving] = useActionState(saveStorageConfigurationAction, initialState);
  const [testState, setTestState] = useState<StorageActionState>(initialState);
  const [migrationState, setMigrationState] = useState<StorageActionState>(initialState);
  const [isTesting, startTest] = useTransition();
  const [isMigrating, startMigration] = useTransition();

  const [accountId, setAccountId] = useState(() => accountIdFromR2Endpoint(configuration?.endpoint ?? ""));
  const [endpoint, setEndpoint] = useState(configuration?.endpoint || defaultEndpoint(provider));
  const [region, setRegion] = useState(configuration?.region || defaultRegion(provider));
  const [privateBucket, setPrivateBucket] = useState(configuration?.privateBucket ?? "");

  const wasSaving = useRef(false);
  useEffect(() => {
    if (isSaving) {
      wasSaving.current = true;
      return;
    }
    if (!wasSaving.current) return;
    wasSaving.current = false;
    if (state.success && !state.error && state.configurationId) onSaved(state.configurationId);
  }, [isSaving, onSaved, state.configurationId, state.error, state.success]);

  const isLocal = provider === "local-private";
  const isR2 = provider === "cloudflare-r2";
  const isS3 = provider === "s3";
  const isMinio = provider === "minio";
  const isSpaces = provider === "s3-compatible";
  const isCustom = provider === "custom-backend";
  const providerLabel = providerLabels[provider] ?? provider;
  const immutableLocked = Boolean(configuration?.isLocked);
  const configurationName = configuration?.name ?? suggestedName;
  const r2Endpoint = accountId.trim() ? `https://${accountId.trim()}.r2.cloudflarestorage.com` : "";
  const effectiveEndpoint = isR2 ? r2Endpoint : endpoint.trim();
  const forcePathStyle = configuration?.forcePathStyle ?? isMinio;
  const otherFileCount = useMemo(
    () => configurations.filter((item) => item.id !== configuration?.id).reduce((sum, item) => sum + item.uploadedFileCount, 0),
    [configuration?.id, configurations],
  );

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

  function refreshPage() {
    setTestState(initialState);
    setMigrationState(initialState);
    router.refresh();
  }

  function moveFiles() {
    if (!configuration?.id) return;
    if (!window.confirm(`Move up to 25 active managed files to ${configuration.name}? Files are copied first, then the old object is removed.`)) return;
    setMigrationState(initialState);
    startMigration(async () => {
      const result = await migrateStorageFilesAction(configuration.id);
      setMigrationState(result);
      if (!result.error) router.refresh();
    });
  }

  return (
    <form ref={formRef} action={formAction} className="mt-6 space-y-5">
      <input type="hidden" name="configurationId" value={configuration?.id ?? ""} />
      <input type="hidden" name="name" value={configurationName} />
      <input type="hidden" name="provider" value={provider} />
      <input type="hidden" name="endpoint" value={effectiveEndpoint} />
      <input type="hidden" name="region" value={isR2 ? "auto" : isCustom ? "custom" : region || "us-east-1"} />
      <input type="hidden" name="forcePathStyle" value={forcePathStyle ? "true" : "false"} />
      <input type="hidden" name="sessionToken" value="" />

      <section className="rounded-2xl border bg-background p-4 sm:p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <Settings2 className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold">{providerLabel} Configuration</h2>
              {configuration ? (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{configuration.name}</p>
              ) : (
                <p className="mt-0.5 text-xs text-muted-foreground">Create a new {providerLabel} connection</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {providerConfigurations.length > 1 ? (
              <NativeSelect
                aria-label="Saved connection"
                value={configuration?.id ?? ""}
                onChange={(event) => event.target.value && onChooseConfiguration(event.target.value)}
                className="h-9 min-w-44"
              >
                {providerConfigurations.map((item) => (
                  <NativeSelectOption key={item.id} value={item.id}>{item.name}</NativeSelectOption>
                ))}
              </NativeSelect>
            ) : null}
            {configuration ? (
              <Button type="button" variant="outline" size="sm" className="min-h-9" onClick={onNewConnection}>
                <Plus /> New connection
              </Button>
            ) : null}
          </div>
        </div>

        {immutableLocked && !isLocal ? (
          <div className="mb-5 flex items-start gap-2 rounded-xl bg-muted/45 p-3 text-xs text-muted-foreground">
            <LockKeyhole className="mt-0.5 size-4 shrink-0" />
            <p>
              This connection already stores files. Provider, bucket, endpoint and credential fields are protected from changes. Use <strong>New connection</strong> to replace those values safely. CDN URL, private bucket and upload settings remain editable.
            </p>
          </div>
        ) : null}

        {isLocal ? (
          <div className="grid gap-5 md:grid-cols-2">
            <SettingField label="Storage directory" icon={HardDrive} hint="Relative to the project root and kept outside public/." className="md:col-span-2">
              <Input
                name="localRoot"
                defaultValue={configuration?.localRoot ?? "storage/private"}
                placeholder="storage/private"
                pattern="storage(/[A-Za-z0-9._-]+)+"
                required
                readOnly={immutableLocked}
                className="h-10"
              />
            </SettingField>
          </div>
        ) : (
          <div className="space-y-0">
            <div className="grid gap-4 pb-5 md:grid-cols-2">
              {isR2 ? (
                <SettingField label="R2 Account ID" icon={UserRound} hint="Find this in Cloudflare Dashboard → R2 → Overview">
                  <Input
                    value={accountId}
                    onChange={(event) => setAccountId(event.target.value)}
                    placeholder="1234567890abcdef"
                    required
                    readOnly={immutableLocked}
                    className="h-10"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </SettingField>
              ) : isCustom ? (
                <SettingField
                  label="Backend API URL"
                  icon={Globe2}
                  hint="Base URL of your storage API. EasyLearningBD calls PUT, GET and DELETE on /objects/{key}."
                >
                  <Input
                    value={endpoint}
                    onChange={(event) => setEndpoint(event.target.value)}
                    type="url"
                    required
                    readOnly={immutableLocked}
                    className="h-10"
                    placeholder="https://storage.example.com/api/storage"
                  />
                </SettingField>
              ) : isMinio || isSpaces ? (
                <SettingField label="Endpoint URL" icon={Globe2} hint={isSpaces ? "Example: https://nyc3.digitaloceanspaces.com" : "The S3 API endpoint reachable from your Next.js server."}>
                  <Input
                    value={endpoint}
                    onChange={(event) => setEndpoint(event.target.value)}
                    type="url"
                    required
                    readOnly={immutableLocked}
                    className="h-10"
                    placeholder={defaultEndpoint(provider)}
                  />
                </SettingField>
              ) : (
                <SettingField label="AWS Region" icon={Globe2} hint="Use the bucket region, for example us-east-1.">
                  <Input
                    value={region}
                    onChange={(event) => setRegion(event.target.value)}
                    required
                    readOnly={immutableLocked}
                    className="h-10"
                    placeholder="us-east-1"
                  />
                </SettingField>
              )}

              <SettingField
                label={isCustom ? "Storage Namespace" : "Bucket Name"}
                icon={HardDrive}
                hint={isCustom ? "Sent to your backend as the X-Storage-Namespace header." : undefined}
              >
                <Input
                  name="bucket"
                  defaultValue={configuration?.bucket ?? (isCustom ? "media" : "")}
                  placeholder={isCustom ? "media" : isR2 ? "easy-learning-media" : isSpaces ? "easy-learning-space" : "media-bucket"}
                  required
                  readOnly={immutableLocked}
                  className="h-10"
                  autoComplete="off"
                />
              </SettingField>

              {(isMinio || isSpaces) ? (
                <SettingField label="Region" icon={Globe2} hint={isSpaces ? "Example: nyc3, ams3, sgp1" : "Use us-east-1 if your MinIO deployment does not require a region."}>
                  <Input
                    value={region}
                    onChange={(event) => setRegion(event.target.value)}
                    required
                    readOnly={immutableLocked}
                    className="h-10"
                  />
                </SettingField>
              ) : null}
            </div>

            <Separator />

            <div className="grid gap-4 py-5 md:grid-cols-2">
              <SettingField
                label={isCustom ? "Auth Header Name" : "Access Key ID"}
                icon={KeyRound}
                hint={isCustom ? "Usually Authorization or X-API-Key." : undefined}
              >
                <Input
                  name="accessKeyId"
                  defaultValue={configuration?.accessKeyId ?? (isCustom ? "Authorization" : "")}
                  placeholder={isCustom ? "Authorization" : "Access Key ID"}
                  required
                  readOnly={immutableLocked}
                  className="h-10"
                  autoComplete="off"
                  spellCheck={false}
                />
              </SettingField>
              <SettingField
                label={isCustom ? "Auth Header Value" : "Secret Access Key"}
                icon={KeyRound}
                hint={isCustom ? "Example: Bearer eyJ... or your API key. Stored encrypted." : undefined}
              >
                <Input
                  name="secretAccessKey"
                  type="password"
                  defaultValue=""
                  required={!configuration?.hasSecretAccessKey}
                  readOnly={immutableLocked}
                  placeholder={configuration?.hasSecretAccessKey ? "Saved securely — leave blank to keep" : isCustom ? "Bearer token or API key" : "Your secret access key"}
                  className="h-10"
                  autoComplete="new-password"
                />
              </SettingField>
            </div>

            <Separator />

            <div className="py-5">
              <SettingField
                label="Public URL / CDN"
                icon={Globe2}
                hint={isCustom
                  ? "Optional. Enter the public object base URL only if your backend exposes stored keys directly. Otherwise files are served safely through /api/media/."
                  : "Optional. When set, new Media Library files receive direct public URLs; otherwise EasyLearningBD serves them through /api/media/."}
              >
                <Input
                  name="publicBaseUrl"
                  type="url"
                  defaultValue={configuration?.publicBaseUrl ?? ""}
                  placeholder={isCustom ? "https://files.example.com" : isR2 ? "https://cdn.example.com" : isSpaces ? "https://your-space.nyc3.cdn.digitaloceanspaces.com" : "https://cdn.example.com"}
                  className="h-10"
                />
              </SettingField>
            </div>

            <Separator />

            <div className="py-5">
              <SettingField
                label={isCustom ? "Private Namespace" : "Private Bucket"}
                icon={LockKeyhole}
                hint={isCustom
                  ? "Optional secondary namespace. Test Connection verifies it using the same backend API and credentials."
                  : "Optional secondary private bucket. Test Connection verifies it with the same credentials when provided."}
              >
                <Input
                  name="privateBucket"
                  value={privateBucket}
                  onChange={(event) => setPrivateBucket(event.target.value)}
                  placeholder={isCustom ? "private" : "easy-learning-private"}
                  className="h-10"
                  autoComplete="off"
                />
              </SettingField>

              {!privateBucket.trim() ? (
                <div className="mt-3 flex items-start gap-3 rounded-xl border border-amber-400/60 bg-amber-400/[0.07] p-3.5 text-sm">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <p className="leading-6 text-muted-foreground">
                    {isCustom
                      ? "No private namespace is configured. The primary namespace continues to store managed media. Add one if your custom backend separates private assets."
                      : "No private bucket is configured. The primary bucket continues to store managed media. Add a private bucket if you want a separately verified private storage location for sensitive assets."}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {state.error || state.success || testState.error || testState.success ? (
          <div className="space-y-2 pb-4">
            {state.error ? <StatusMessage tone="error">{state.error}</StatusMessage> : null}
            {state.success ? <StatusMessage tone="success">{state.success}</StatusMessage> : null}
            {testState.error ? <StatusMessage tone="error">{testState.error}</StatusMessage> : null}
            {testState.success ? <StatusMessage tone="success">{testState.success}</StatusMessage> : null}
          </div>
        ) : null}

        {configuration?.lastTestedAt ? (
          <p className="mb-4 text-xs text-muted-foreground">
            Last tested {new Date(configuration.lastTestedAt).toLocaleString()} · {configuration.lastTestStatus === "success" ? "connection passed" : configuration.lastTestStatus}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="min-h-10" disabled={isTesting || isSaving} onClick={testConnection}>
              {isTesting ? <LoaderCircle className="animate-spin" /> : <TestTube2 />}
              Test Connection
            </Button>
            <Button type="button" variant="ghost" className="min-h-10" disabled={isTesting || isSaving} onClick={refreshPage}>
              <RefreshCw /> Refresh
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" name="intent" value="save" variant="outline" className="min-h-10" disabled={isSaving || isTesting}>
              {isSaving ? <LoaderCircle className="animate-spin" /> : <Save />}
              Save settings
            </Button>
            {!configuration?.isActive ? (
              <Button type="submit" name="intent" value="activate" className="min-h-10" disabled={isSaving || isTesting}>
                {isSaving ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />}
                Save & Connect
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <Accordion className="rounded-2xl border bg-background px-5">
        <AccordionItem value="setup-guide">
          <AccordionTrigger type="button" className="min-h-12 hover:no-underline">
            <span className="flex items-center gap-2"><BookOpen className="size-4 text-muted-foreground" /> {providerLabel} setup guide</span>
          </AccordionTrigger>
          <AccordionContent className="pb-4 text-muted-foreground">
            <ProviderGuide provider={provider} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="move-files">
          <AccordionTrigger type="button" className="min-h-12 hover:no-underline">
            <span className="flex items-center gap-2"><ArrowRightLeft className="size-4 text-muted-foreground" /> Move the files you already have</span>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-3 text-muted-foreground">
              <p>
                Existing files stay linked to the storage configuration where they were uploaded. You can safely copy active managed files to this saved configuration in batches of 25.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-10"
                  disabled={!configuration?.id || isMigrating || otherFileCount === 0}
                  onClick={moveFiles}
                >
                  {isMigrating ? <LoaderCircle className="animate-spin" /> : <ArrowRightLeft />}
                  Move files to this storage
                </Button>
                <span className="text-xs">{otherFileCount} managed file{otherFileCount === 1 ? "" : "s"} currently linked elsewhere</span>
              </div>
              {migrationState.error ? <StatusMessage tone="error">{migrationState.error}</StatusMessage> : null}
              {migrationState.success ? <StatusMessage tone="success">{migrationState.success}</StatusMessage> : null}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <section className="rounded-2xl border bg-background p-4 sm:p-5">
        <div className="mb-5 flex items-center gap-2">
          <Upload className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Upload Settings</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <SettingField label="Max image size (MB)">
            <Input
              name="maxImageSizeMb"
              type="number"
              min={1}
              max={512}
              defaultValue={configuration?.maxImageSizeMb ?? 20}
              className="h-10"
              required
            />
          </SettingField>
          <SettingField label="Max video size (MB)">
            <Input
              name="maxVideoSizeMb"
              type="number"
              min={1}
              max={1024}
              defaultValue={configuration?.maxVideoSizeMb ?? 1024}
              className="h-10"
              required
            />
          </SettingField>
          <SettingField label="Max 3D model size (MB)">
            <Input
              name="maxModelSizeMb"
              type="number"
              min={1}
              max={1024}
              defaultValue={configuration?.maxModelSizeMb ?? 500}
              className="h-10"
              required
            />
          </SettingField>
          <SettingField
            label="Path prefix"
            hint="Applied to new managed object keys. Existing uploaded paths are not renamed."
            className="md:col-span-2"
          >
            <Input
              name="pathPrefix"
              defaultValue={configuration?.pathPrefix ?? "uploads"}
              placeholder="uploads/"
              className="h-10"
              required
            />
          </SettingField>
        </div>
        <p className="mt-4 rounded-xl bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
          Media Library enforces these image, video and 3D model limits. Document uploads have a separate 100 MB safety limit, and a single multi-file request is capped at 1 GB.
        </p>
      </section>
    </form>
  );
}

function SettingField({
  label,
  icon: Icon,
  hint,
  className,
  children,
}: {
  label: string;
  icon?: ComponentType<{ className?: string }>;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {Icon ? <Icon className="size-3.5" /> : null}
        {label}
      </Label>
      {children}
      {hint ? <p className="text-[11px] leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function StatusMessage({ tone, children }: { tone: "success" | "error"; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl border px-3 py-2.5 text-sm",
        tone === "success"
          ? "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-400"
          : "border-destructive/25 bg-destructive/[0.05] text-destructive",
      )}
    >
      {children}
    </div>
  );
}

function ProviderGuide({ provider }: { provider: ProviderKey }) {
  if (provider === "local-private") {
    return (
      <ol className="list-decimal space-y-2 pl-5">
        <li>Choose a persistent directory inside the project&apos;s <code>storage/</code> folder.</li>
        <li>Make sure the application process can read and write this directory.</li>
        <li>Back up the directory with your database because uploaded files are not stored in SQLite.</li>
      </ol>
    );
  }

  if (provider === "cloudflare-r2") {
    return (
      <ol className="list-decimal space-y-2 pl-5">
        <li>Create an R2 bucket and copy the R2 Account ID.</li>
        <li>Create an R2 API token with object read/write permissions for the bucket.</li>
        <li>Enter the Access Key ID and Secret Access Key generated for that token.</li>
        <li>Optionally connect an R2.dev or custom domain and enter it as the Public URL / CDN.</li>
        <li>Use Test Connection, then Save & Connect.</li>
      </ol>
    );
  }

  if (provider === "s3") {
    return (
      <ol className="list-decimal space-y-2 pl-5">
        <li>Create an S3 bucket and note its AWS region.</li>
        <li>Create a dedicated IAM access key with only the object permissions required by this bucket.</li>
        <li>Keep Block Public Access enabled unless you deliberately use a public/CDN media bucket.</li>
        <li>Enter an optional CloudFront/custom-domain URL if Media Library files should have direct public links.</li>
        <li>Use Test Connection, then Save & Connect.</li>
      </ol>
    );
  }

  if (provider === "minio") {
    return (
      <ol className="list-decimal space-y-2 pl-5">
        <li>Create a bucket in MinIO and a dedicated access key.</li>
        <li>Enter the S3 API endpoint, such as <code>https://minio.example.com</code>.</li>
        <li>Use HTTPS in production, or keep MinIO on a trusted private network.</li>
        <li>Test the connection before activating it.</li>
      </ol>
    );
  }

  if (provider === "custom-backend") {
    return (
      <div className="space-y-3">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Expose an authenticated HTTP API base URL, for example <code>https://storage.example.com/api/storage</code>.</li>
          <li>Your server must accept <code>PUT /objects/&lt;key&gt;</code> with the raw file body and return any 2xx status.</li>
          <li>It must return the raw file from <code>GET /objects/&lt;key&gt;</code> and accept <code>DELETE /objects/&lt;key&gt;</code>.</li>
          <li>EasyLearningBD sends the selected namespace in <code>X-Storage-Namespace</code> and your configured authentication header on every request.</li>
          <li>Use HTTPS for internet-facing servers. Then run Test Connection before Save &amp; Connect.</li>
        </ol>
        <p className="rounded-xl bg-muted/45 p-3 text-xs leading-5">
          The custom backend must preserve object keys exactly. Redirects are rejected and requests time out after 20 seconds to reduce SSRF and hanging-request risk.
        </p>
      </div>
    );
  }

  return (
    <ol className="list-decimal space-y-2 pl-5">
      <li>Create a DigitalOcean Space and note its region, such as <code>nyc3</code>.</li>
      <li>Create a Spaces access key and enter the key ID and secret.</li>
      <li>Use the regional S3 endpoint, for example <code>https://nyc3.digitaloceanspaces.com</code>.</li>
      <li>If the Spaces CDN is enabled, enter the CDN endpoint as the Public URL / CDN.</li>
      <li>Use Test Connection, then Save & Connect.</li>
    </ol>
  );
}
