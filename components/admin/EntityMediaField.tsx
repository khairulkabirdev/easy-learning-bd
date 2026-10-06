"use client";

import { Loader2, Upload, X } from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";

import { uploadEntityImageTemp } from "@/app/admin/shared/entity-media-actions";
import { EntityVisual, ENTITY_ICON_OPTIONS } from "@/components/app/EntityVisual";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type EntityMediaValue = {
  iconType: string;
  iconLibrary: string;
  iconName: string;
  iconColor: string;
  imagePath: string;
  persistedImagePath?: string;
};

type EntityMediaFieldProps = {
  label?: string;
  description?: string;
  domain: "classes" | "subjects" | "units" | "lessons" | "topics";
  titlePreview: string;
  value: EntityMediaValue;
  onChange: (value: EntityMediaValue) => void;
  error?: string | null;
};

export function EntityMediaField({
  label = "Visual",
  description = "Choose one icon from the library or upload one image.",
  domain,
  titlePreview,
  value,
  onChange,
  error,
}: EntityMediaFieldProps) {
  const [isUploading, startUploadTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [iconQuery, setIconQuery] = useState("");
  const selectedTab = value.iconType === "image" ? "image" : "icon";
  const filteredIcons = useMemo(() => {
    const query = iconQuery.trim().toLowerCase();
    if (!query) return ENTITY_ICON_OPTIONS;

    return ENTITY_ICON_OPTIONS.filter((option) =>
      `${option.label} ${option.value}`.toLowerCase().includes(query),
    );
  }, [iconQuery]);

  function applyPatch(patch: Partial<EntityMediaValue>) {
    onChange({
      ...value,
      ...patch,
    });
  }

  function handleUpload(file: File | null) {
    if (!file) return;

    startUploadTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("domain", domain);
        formData.set("file", file);
        if (value.imagePath.startsWith("/uploads/temp/")) {
          formData.set("previousTempPath", value.imagePath);
        }
        const uploaded = await uploadEntityImageTemp(formData);

        onChange({
          ...value,
          iconType: "image",
          iconLibrary: "",
          iconName: "",
          imagePath: uploaded.tempPublicPath,
        });
      } catch (uploadError) {
        const message = uploadError instanceof Error ? uploadError.message : "Failed to upload image.";
        onChange({ ...value });
        window.alert(message);
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    });
  }

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="rounded-2xl border bg-muted/20 p-4">
        <div className="grid gap-4 lg:grid-cols-[120px_1fr]">
          <div className="flex flex-col items-center gap-3">
            <EntityVisual
              title={titlePreview || "Preview"}
              iconType={value.iconType}
              iconName={value.iconName}
              iconColor={value.iconColor}
              imagePath={value.imagePath}
              className="h-24 w-24 rounded-3xl"
            />
            <Badge variant="outline">
              {value.iconType === "image" && value.imagePath
                ? "Image"
                : value.iconType === "library" && value.iconName
                  ? "Icon"
                  : "Default"}
            </Badge>
          </div>

          <Tabs
            value={selectedTab}
            onValueChange={(nextTab) => {
              if (nextTab === "image") {
                applyPatch({
                  iconType: "image",
                  iconLibrary: "",
                  iconName: "",
                });
              } else {
                applyPatch({
                  iconType: "library",
                });
              }
            }}
            className="space-y-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="icon">Icon Library</TabsTrigger>
              <TabsTrigger value="image">Upload Image</TabsTrigger>
            </TabsList>

            <TabsContent value="icon" className="space-y-4">
              <FieldGroup>
                <Field>
                  <FieldLabel>Search icon</FieldLabel>
                  <Input
                    value={iconQuery}
                    onChange={(event) => setIconQuery(event.target.value)}
                    placeholder="Search icons..."
                  />
                </Field>
                <Field>
                  <FieldLabel>Icon color</FieldLabel>
                  <div className="flex items-center gap-3">
                    <Input
                      type="color"
                      value={value.iconColor || "#0f766e"}
                      onChange={(event) =>
                        applyPatch({
                          iconType: "library",
                          iconLibrary: "lucide",
                          iconColor: event.target.value,
                        })
                      }
                      className="h-11 w-16 p-1"
                    />
                    <Input
                      value={value.iconColor || "#0f766e"}
                      onChange={(event) =>
                        applyPatch({
                          iconType: "library",
                          iconLibrary: "lucide",
                          iconColor: event.target.value,
                        })
                      }
                      placeholder="#0f766e"
                    />
                  </div>
                </Field>
                <Field>
                  <FieldLabel>Select icon</FieldLabel>
                  <ScrollArea className="h-64 rounded-2xl border bg-background p-3">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {filteredIcons.map((option) => {
                        const isActive = value.iconName === option.value && value.iconType === "library";
                        const Icon = option.icon;

                        return (
                          <Button
                            key={option.value}
                            type="button"
                            variant={isActive ? "default" : "outline"}
                            className="h-auto cursor-pointer justify-start gap-3 px-3 py-3"
                            onClick={() =>
                              applyPatch({
                                iconType: "library",
                                iconLibrary: "lucide",
                                iconName: option.value,
                              })
                            }
                          >
                            <span
                              className="flex h-9 w-9 items-center justify-center rounded-xl border"
                              style={{
                                color: value.iconColor || "#0f766e",
                                borderColor: "color-mix(in srgb, var(--border) 70%, transparent)",
                              }}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="text-sm">{option.label}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                  {filteredIcons.length === 0 ? <div className="text-sm text-muted-foreground">No icons matched the search.</div> : null}
                </Field>
              </FieldGroup>
            </TabsContent>

            <TabsContent value="image" className="space-y-4">
              <FieldGroup>
                <Field>
                  <FieldLabel>Upload image</FieldLabel>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(event) => handleUpload(event.target.files?.[0] ?? null)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      {isUploading ? "Uploading..." : "Choose image"}
                    </Button>
                    {value.imagePath ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="cursor-pointer"
                        onClick={() =>
                          applyPatch({
                            imagePath: "",
                            iconType: "none",
                          })
                        }
                      >
                        <X className="mr-2 h-4 w-4" />
                        Remove image
                      </Button>
                    ) : null}
                  </div>
                </Field>
                <Field>
                  <FieldLabel>Or use image URL</FieldLabel>
                  <Input
                    value={value.imagePath}
                    onChange={(event) =>
                      applyPatch({
                        iconType: event.target.value.trim() ? "image" : "none",
                        iconLibrary: "",
                        iconName: "",
                        imagePath: event.target.value,
                      })
                    }
                    placeholder="https://example.com/cover.png"
                  />
                </Field>
              </FieldGroup>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <FieldDescription>{description}</FieldDescription>
      {error ? <div className="text-sm font-medium text-destructive">{error}</div> : null}
    </Field>
  );
}
