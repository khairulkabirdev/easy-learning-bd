import { FirstPaperBlockChapterPage } from "@/components/app/FirstPaperBlockChapterPage";

export default async function UserParagraphChapterPage({
  params,
}: {
  params: Promise<{ contentId: string }>;
}) {
  const { contentId } = await params;

  return (
    <FirstPaperBlockChapterPage
      contentId={contentId}
      kind="paragraph"
      title="Paragraph"
    />
  );
}
