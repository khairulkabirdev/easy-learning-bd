import { PagePlaceholder } from "@/components/app/PagePlaceholder";

export default function AdminProfilePage() {
  return (
    <PagePlaceholder
      title="Admin Profile"
      description="This route is reserved for the custom-auth profile surface described in PLAN.md, including account details and session-aware preferences."
      primaryHref="/admin/dashboard"
      primaryLabel="Open Dashboard"
      secondaryHref="/admin/content"
      secondaryLabel="Open Content"
    />
  );
}
