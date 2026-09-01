import { SettingsForm } from "@/app/admin/settings/SettingsForm";
import { requireAdmin } from "@/lib/app-auth";
import { prisma } from "@/lib/db";

export default async function AdminSettingsPage() {
  const user = await requireAdmin();
  const settings = await prisma.authEmailSetting.findUnique({
    where: { organizationId: user.organizationId },
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-4 lg:px-6">
      <SettingsForm
        hasApiKey={Boolean(process.env.RESEND_API_KEY)}
        settings={{
          senderName: settings?.senderName || "",
          senderEmail: settings?.senderEmail || "",
          appBaseUrl: settings?.appBaseUrl || "",
          resetEmailEnabled: settings?.resetEmailEnabled || false,
        }}
      />
    </div>
  );
}
