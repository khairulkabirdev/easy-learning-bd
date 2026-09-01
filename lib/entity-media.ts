import { z } from "zod";

import { deleteLocalImage, replaceDomainImage } from "@/lib/upload";

export const entityMediaSchema = z.object({
  iconType: z.string().default("none"),
  iconLibrary: z.string().default(""),
  iconName: z.string().default(""),
  iconColor: z.string().default(""),
  imagePath: z.string().default(""),
  persistedImagePath: z.string().default(""),
});

export type EntityMediaInput = z.infer<typeof entityMediaSchema>;

export async function resolveEntityMedia(params: {
  input: EntityMediaInput;
  domain: "classes" | "subjects" | "units" | "lessons" | "topics";
}) {
  const normalizedIconType = params.input.iconType === "image" || params.input.iconType === "library"
    ? params.input.iconType
    : "none";

  if (normalizedIconType === "image") {
    const finalImagePath = await replaceDomainImage({
      domain: params.domain,
      previousImagePath: params.input.persistedImagePath || "",
      nextExternalUrl: /^https?:\/\//i.test(params.input.imagePath) ? params.input.imagePath : "",
      nextTempPublicPath: params.input.imagePath.startsWith("/uploads/temp/") ? params.input.imagePath : "",
    });

    return {
      iconType: "image",
      iconLibrary: "",
      iconName: "",
      iconColor: "",
      imagePath: finalImagePath,
    };
  }

  if (params.input.persistedImagePath) {
    await deleteLocalImage(params.input.persistedImagePath);
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
