import { PagePlaceholder } from "@/components/app/PagePlaceholder";

export default function AdminAuditLogsPage() {
  return (
    <PagePlaceholder
      title="Audit Logs"
      description="Audit logs should become a server-rendered admin activity view backed by Prisma. This route exists now so the final shell and navigation can point to it safely."
      primaryHref="/admin/content"
      primaryLabel="Open Content"
    />
  );
}
