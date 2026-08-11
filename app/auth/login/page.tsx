"use client";

import { useActionState } from "react";

import { loginAction, type LoginActionState } from "@/app/auth/login/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const initialState: LoginActionState = {
  error: "",
};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Use your admin or student credentials to enter EasyLearningBD.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <Field>
              <FieldContent>
                <FieldLabel>Email</FieldLabel>
                <Input type="email" name="email" placeholder="admin@example.com" required />
              </FieldContent>
            </Field>

            <Field>
              <FieldContent>
                <FieldLabel>Password</FieldLabel>
                <Input type="password" name="password" placeholder="Enter your password" required />
              </FieldContent>
            </Field>

            {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="font-medium">Local seeded accounts</div>
            <div className="mt-2 space-y-1 text-muted-foreground">
              <div>
                Admin: <span className="font-mono text-foreground">admin@example.com</span> /{" "}
                <span className="font-mono text-foreground">admin123456</span>
              </div>
              <div>
                Student: <span className="font-mono text-foreground">student@example.com</span> /{" "}
                <span className="font-mono text-foreground">student123456</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
