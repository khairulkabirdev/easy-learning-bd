"use client";

import { useActionState } from "react";

import { saveEmailSettingsAction, type EmailSettingsActionState } from "@/app/admin/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type SettingsFormProps = {
  settings: {
    senderName: string;
    senderEmail: string;
    appBaseUrl: string;
    resetEmailEnabled: boolean;
  };
  hasApiKey: boolean;
};

const initialState: EmailSettingsActionState = {
  error: "",
  success: "",
};

export function SettingsForm({ settings, hasApiKey }: SettingsFormProps) {
  const [state, formAction, pending] = useActionState(saveEmailSettingsAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password reset email</CardTitle>
        <CardDescription>Configure the sender used for password reset links.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <Field>
            <FieldContent>
              <FieldLabel>Sender name</FieldLabel>
              <Input name="senderName" defaultValue={settings.senderName} placeholder="EasyLearningBD" />
            </FieldContent>
          </Field>

          <Field>
            <FieldContent>
              <FieldLabel>Sender email</FieldLabel>
              <Input name="senderEmail" type="email" defaultValue={settings.senderEmail} placeholder="noreply@example.com" />
            </FieldContent>
          </Field>

          <Field>
            <FieldContent>
              <FieldLabel>App base URL</FieldLabel>
              <Input name="appBaseUrl" type="url" defaultValue={settings.appBaseUrl} placeholder="http://localhost:3000" />
            </FieldContent>
          </Field>

          <label className="flex items-center gap-2 rounded-lg border p-3 text-sm">
            <input name="resetEmailEnabled" type="checkbox" defaultChecked={settings.resetEmailEnabled} />
            Enable password reset emails
          </label>

          {!hasApiKey ? <p className="text-sm text-destructive">RESEND_API_KEY is not configured in the environment.</p> : null}
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-muted-foreground">{state.success}</p> : null}

          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save settings"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
