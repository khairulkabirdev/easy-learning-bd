import { FirstPaperBlockChapterPage } from "@/components/app/FirstPaperBlockChapterPage";

export default async function UserTableCompletionChapterPage({
  params,
}: {
  params: Promise<{ contentId: string }>;
}) {
  const { contentId } = await params;

  return (
    <FirstPaperBlockChapterPage
      contentId={contentId}
      kind="table-completion"
      title="Table Completion"
    />
  );
}
