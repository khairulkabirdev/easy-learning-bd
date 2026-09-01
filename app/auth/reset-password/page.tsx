"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";

import { resetPasswordAction, type ResetPasswordActionState } from "@/app/auth/reset-password/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const initialState: ResetPasswordActionState = {
  error: "",
};

function ResetPasswordForm() {
  const token = useSearchParams().get("token") || "";
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>Enter a new password for your EasyLearningBD account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="token" value={token} />

            <Field>
              <FieldContent>
                <FieldLabel>New password</FieldLabel>
                <Input type="password" name="password" placeholder="At least 8 characters" required minLength={8} />
              </FieldContent>
            </Field>

            <Field>
              <FieldContent>
                <FieldLabel>Confirm password</FieldLabel>
                <Input type="password" name="confirmPassword" placeholder="Repeat your password" required minLength={8} />
              </FieldContent>
            </Field>

            {!token ? <p className="text-sm text-destructive">Reset token is missing.</p> : null}
            {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

            <Button type="submit" className="w-full" disabled={pending || !token}>
              {pending ? "Updating..." : "Update password"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Back to{" "}
            <Link href="/auth/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
