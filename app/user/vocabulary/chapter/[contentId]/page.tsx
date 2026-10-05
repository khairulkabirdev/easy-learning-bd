import { FirstPaperBlockChapterPage } from "@/components/app/FirstPaperBlockChapterPage";

export default async function UserVocabularyChapterPage({
  params,
}: {
  params: Promise<{ contentId: string }>;
}) {
  const { contentId } = await params;

  return (
    <FirstPaperBlockChapterPage
      contentId={contentId}
      kind="vocabulary"
      title="Vocabulary"
    />
  );
}
