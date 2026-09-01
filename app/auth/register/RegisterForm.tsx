"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { registerAction, type RegisterActionState } from "@/app/auth/register/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ClassOption = {
  id: string;
  name: string;
  code: string;
};

const initialState: RegisterActionState = {
  error: "",
};

export function RegisterForm({ classes }: { classes: ClassOption[] }) {
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [classId, setClassId] = useState("");
  const [state, formAction, pending] = useActionState(registerAction, initialState);
  const classOptions = classes.map((item) => ({
    id: item.id,
    label: item.code ? `${item.name} (${item.code})` : item.name,
  }));
  const selectedClassLabel = classOptions.find((item) => item.id === classId)?.label ?? null;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Register as a student or teacher to enter EasyLearningBD.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <Field>
              <FieldContent>
                <FieldLabel>Name</FieldLabel>
                <Input name="name" placeholder="Your full name" required />
              </FieldContent>
            </Field>

            <Field>
              <FieldContent>
                <FieldLabel>Email</FieldLabel>
                <Input type="email" name="email" placeholder="you@example.com" required />
              </FieldContent>
            </Field>

            <Field>
              <FieldContent>
                <FieldLabel>Phone number</FieldLabel>
                <Input
                  name="phone"
                  inputMode="tel"
                  placeholder="01XXXXXXXXX"
                  pattern="(?:\+?88)?01[3-9][0-9]{8}"
                  title="Use a valid Bangladesh mobile number, like 01712345678 or +8801712345678"
                  required
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldContent>
                <FieldLabel>Account type</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  {(["student", "teacher"] as const).map((item) => (
                    <label
                      key={item}
                      className={cn(
                        "flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors",
                        role === item ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
                      )}
                    >
                      <input
                        className="sr-only"
                        type="radio"
                        name="role"
                        value={item}
                        checked={role === item}
                        onChange={() => {
                          setRole(item);
                          if (item === "teacher") setClassId("");
                        }}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </FieldContent>
            </Field>

            {role === "student" ? (
              <Field>
                <FieldContent>
                  <FieldLabel>Class</FieldLabel>
                  <Combobox
                    items={classOptions.map((item) => item.label)}
                    value={selectedClassLabel}
                    onValueChange={(nextValue) => {
                      const matched = classOptions.find((item) => item.label === nextValue);
                      setClassId(matched?.id ?? "");
                    }}
                  >
                    <ComboboxInput placeholder="Search your class" showClear={Boolean(classId)} className="w-full" />
                    <ComboboxContent>
                      <ComboboxEmpty>No class found.</ComboboxEmpty>
                      <ComboboxList>
                        {(item) => (
                          <ComboboxItem key={item} value={item}>
                            {item}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  <input type="hidden" name="classId" value={classId} />
                </FieldContent>
              </Field>
            ) : null}

            {role === "teacher" ? (
              <Field>
                <FieldContent>
                  <FieldLabel>Institution name</FieldLabel>
                  <Input name="institutionName" placeholder="Your school or college name" required />
                </FieldContent>
              </Field>
            ) : null}

            <Field>
              <FieldContent>
                <FieldLabel>Password</FieldLabel>
                <Input type="password" name="password" placeholder="At least 8 characters" required minLength={8} />
              </FieldContent>
            </Field>

            <Field>
              <FieldContent>
                <FieldLabel>Confirm password</FieldLabel>
                <Input type="password" name="confirmPassword" placeholder="Repeat your password" required minLength={8} />
              </FieldContent>
            </Field>

            {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
