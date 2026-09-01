"use client";

import Link from "next/link";
import { useActionState } from "react";

import { forgotPasswordAction, type ForgotPasswordActionState } from "@/app/auth/forgot-password/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const initialState: ForgotPasswordActionState = {
  error: "",
  success: "",
};

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>Enter your email and we will send a password reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <Field>
              <FieldContent>
                <FieldLabel>Email</FieldLabel>
                <Input type="email" name="email" placeholder="you@example.com" required />
              </FieldContent>
            </Field>

            {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
            {state.success ? <p className="text-sm text-muted-foreground">{state.success}</p> : null}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Sending..." : "Send reset link"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Remembered your password?{" "}
            <Link href="/auth/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
