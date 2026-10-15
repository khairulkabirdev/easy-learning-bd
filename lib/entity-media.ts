import "server-only";

import { z } from "zod";

import { parseExternalImageUrl } from "@/lib/upload";
import { assertOwnedTemporaryImage, finalizeManagedImageChange, isManagedMediaUrl, type UploadActor } from "@/lib/storage/upload-management";

export const entityMediaSchema = z.object({
  iconType: z.string().default("none"),
  iconLibrary: z.string().default(""),
  iconName: z.string().default(""),
  iconColor: z.string().default(""),
  imagePath: z.string().default(""),
  persistedImagePath: z.string().default(""),
});

export type EntityMediaInput = z.infer<typeof entityMediaSchema>;

type EntityMediaOwner = UploadActor & { ownerType: string; ownerId: string };

export async function resolveEntityMedia(params: {
  input: EntityMediaInput;
  domain: "classes" | "subjects" | "units" | "lessons" | "topics";
  previousImagePath?: string | null;
  organizationId: string;
  userId: string;
}) {
  const normalizedIconType = params.input.iconType === "image" || params.input.iconType === "library"
    ? params.input.iconType
    : "none";

  if (normalizedIconType === "image") {
    const requested = params.input.imagePath.trim();
    const previous = params.previousImagePath || "";
    let imagePath = previous;

    if (requested && requested !== previous) {
      if (isManagedMediaUrl(requested)) {
        await assertOwnedTemporaryImage(requested, {
          organizationId: params.organizationId,
          userId: params.userId,
        });
        imagePath = requested;
      } else if (/^https?:\/\//i.test(requested)) {
        imagePath = parseExternalImageUrl(requested);
      } else if (requested.startsWith("/uploads/temp/")) {
        throw new Error("This temporary image is from the old upload system. Please upload it again.");
      } else {
        throw new Error("Choose a valid uploaded image or a valid external image URL.");
      }
    }

    return {
      iconType: "image",
      iconLibrary: "",
      iconName: "",
      iconColor: "",
      imagePath,
    };
  }

  if (normalizedIconType === "library" && params.input.iconName.trim()) {
    return {
      iconType: "library",
      iconLibrary: params.input.iconLibrary.trim() || "lucide",
      iconName: params.input.iconName.trim(),
      iconColor: params.input.iconColor.trim(),
      imagePath: "",
    };
  }

  return {
    iconType: "none",
    iconLibrary: "",
    iconName: "",
    iconColor: "",
    imagePath: "",
  };
}

export async function commitEntityMediaChange(params: {
  previousImagePath?: string | null;
  nextImagePath?: string | null;
  organizationId: string;
  userId: string;
  ownerType: string;
  ownerId: string;
}) {
  await finalizeManagedImageChange({
    previousImagePath: params.previousImagePath,
    nextImagePath: params.nextImagePath,
    organizationId: params.organizationId,
    userId: params.userId,
    ownerType: params.ownerType,
    ownerId: params.ownerId,
    purpose: "entity-image",
  });
}

export type { EntityMediaOwner };
