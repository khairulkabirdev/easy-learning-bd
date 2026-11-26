import { notFound } from "next/navigation";
import { BlockAssignmentManager } from "@/components/admin/BlockAssignmentManager";
import { parseBlockAssignment } from "@/app/admin/content/content-types";
import { parseModelCategories } from "@/lib/model-question-fixed-blocks";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section !== "library" && section !== "classes" && section !== "subjects") notFound();
  const user = await requireAdmin();
  const classes = await prisma.class.findMany({ where: { organizationId: user.organizationId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, code: true, slug: true, blockKindsJson: true, modelCategoryIdsJson: true,
      subjects: { where: { organizationId: user.organizationId }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, code: true, slug: true, blockKindsJson: true, modelCategoryIdsJson: true } } } });
  return <BlockAssignmentManager key={section} section={section} classes={classes.map(({ blockKindsJson, modelCategoryIdsJson, subjects, ...item }) => ({ ...item, kinds: parseBlockAssignment(blockKindsJson), categories: parseModelCategories(modelCategoryIdsJson), subjects: subjects.map(({ blockKindsJson, modelCategoryIdsJson, ...subject }) => ({ ...subject, kinds: parseBlockAssignment(blockKindsJson), categories: parseModelCategories(modelCategoryIdsJson) })) }))} />;
}
