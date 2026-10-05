import { FirstPaperBlockChapterPage } from "@/components/app/FirstPaperBlockChapterPage";

export default async function UserSynonymsAntonymsChapterPage({
  params,
}: {
  params: Promise<{ contentId: string }>;
}) {
  const { contentId } = await params;

  return (
    <FirstPaperBlockChapterPage
      contentId={contentId}
      kind="synonyms-antonyms"
      title="Synonyms / Antonyms"
    />
  );
}
