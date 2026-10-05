import { FirstPaperBlockChapterPage } from "@/components/app/FirstPaperBlockChapterPage";

export default async function UserInformationTransferChapterPage({
  params,
}: {
  params: Promise<{ contentId: string }>;
}) {
  const { contentId } = await params;

  return (
    <FirstPaperBlockChapterPage
      contentId={contentId}
      kind="information-transfer"
      title="Information Transfer"
    />
  );
}
