"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertTrustedMutationOrigin, requireUser } from "@/lib/app-auth";
import { prisma } from "@/lib/db";
import { saveImageToTemp } from "@/lib/upload";

const bdPhoneSchema = z
  .string()
  .trim()
  .regex(/^(?:\+?88)?01[3-9]\d{8}$/, "Enter a valid Bangladesh mobile number.");

const profileSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters."),
  phone: z.string().optional().refine((value) => !value || bdPhoneSchema.safeParse(value).success, {
    message: "Enter a valid Bangladesh mobile number.",
  }),
  profileImage: z.string().optional(),
  district: z.string().optional(),
  institutionName: z.string().optional(),
  instituteType: z.enum(["School", "College", "Madrasa", "University"]).optional(),
  academicYear: z.string().optional(),
  rollNumber: z.string().optional(),
  section: z.string().optional(),
  groupName: z.string().optional(),
  designation: z.string().optional(),
  subject: z.string().optional(),
  experience: z.string().optional(),
  classId: z.string().optional(),
});

export type ProfileActionState = {
  error: string;
  success: string;
};

export async function uploadProfileImageTemp(formData: FormData) {
  await assertTrustedMutationOrigin();
  await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Image file is required.");
  }

  if (file.size > 4.8 * 1024 * 1024) {
    throw new Error("Image must be 4.8 MB or smaller.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }

  const saved = await saveImageToTemp(file);

  return { imageUrl: saved.publicPath };
}

export async function updateProfileAction(_: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  await assertTrustedMutationOrigin();
  const user = await requireUser();

  const rawPhone = formData.get("phone");
  const rawClassId = formData.get("classId");
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: rawPhone === null ? undefined : String(rawPhone).trim() || undefined,
    profileImage: formData.get("profileImage") || undefined,
    district: formData.get("district") || undefined,
    institutionName: formData.get("institutionName") || undefined,
    instituteType: formData.get("instituteType") || undefined,
    academicYear: formData.get("academicYear") || undefined,
    rollNumber: formData.get("rollNumber") || undefined,
    section: formData.get("section") || undefined,
    groupName: formData.get("groupName") || undefined,
    designation: formData.get("designation") || undefined,
    subject: formData.get("subject") || undefined,
    experience: formData.get("experience") || undefined,
    classId: rawClassId === null ? undefined : String(rawClassId).trim() || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Profile update failed.", success: "" };
  }

  const normalizedPhone = parsed.data.phone?.trim() ? parsed.data.phone.trim().replace(/^88(?=01)/, "+88") : null;

  if (user.role === "student") {
    if (!parsed.data.classId) {
      return { error: "Please choose your class.", success: "" };
    }

    const classItem = await prisma.class.findFirst({
      where: {
        id: parsed.data.classId,
        organizationId: user.organizationId,
        status: "published",
      },
      select: { id: true },
    });

    if (!classItem) {
      return { error: "Selected class is not available.", success: "" };
    }
  }

  if (user.role === "teacher" && !parsed.data.designation?.trim()) {
    return { error: "Designation is required for teachers.", success: "" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name.trim(),
      phone: normalizedPhone,
      profileImage: parsed.data.profileImage?.trim() || null,
      district: parsed.data.district?.trim() || null,
      institutionName: parsed.data.institutionName?.trim() || null,
      instituteType: parsed.data.instituteType || null,
      academicYear: parsed.data.academicYear?.trim() || null,
      rollNumber: parsed.data.rollNumber?.trim() || null,
      section: parsed.data.section?.trim() || null,
      groupName: parsed.data.groupName?.trim() || null,
      designation: parsed.data.designation?.trim() || null,
      subject: parsed.data.subject?.trim() || null,
      experience: parsed.data.experience?.trim() || null,
      classId: user.role === "student" ? parsed.data.classId : user.classId,
    },
  });

  revalidatePath("/admin/profile");
  revalidatePath("/user/profile");
  revalidatePath("/teacher/profile");
  revalidatePath("/admin", "layout");
  revalidatePath("/user", "layout");
  revalidatePath("/teacher", "layout");

  return { error: "", success: "Profile updated." };
}
