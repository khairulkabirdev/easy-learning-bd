"use client";

import { useActionState, useMemo, useState } from "react";

import { updateProfileAction, type ProfileActionState } from "@/app/profile/actions";
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

type ClassOption = {
  id: string;
  name: string;
  code: string;
};

type ProfileFormProps = {
  role: "admin" | "student" | "teacher";
  user: {
    name: string;
    email: string;
    phone: string | null;
    institutionName: string | null;
    classId: string | null;
  };
  classes?: ClassOption[];
};

const initialState: ProfileActionState = {
  error: "",
  success: "",
};

export function ProfileForm({ role, user, classes = [] }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);
  const [classId, setClassId] = useState(user.classId ?? "");
  const classOptions = useMemo(
    () =>
      classes.map((item) => ({
        id: item.id,
        label: item.code ? `${item.name} (${item.code})` : item.name,
      })),
    [classes]
  
  );
  const selectedClassLabel = classOptions.find((item) => item.id === classId)?.label ?? null; 

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Update your account information. Email and password stay managed by auth.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 mx-auto sm:max-w-xl">
          <Field>
            <FieldContent>
              <FieldLabel>Name</FieldLabel>
              <Input name="name" defaultValue={user.name} placeholder="Your full name" required />
            </FieldContent>
          </Field>

          <Field>
            <FieldContent>
              <FieldLabel>Email</FieldLabel>
              <Input value={user.email} disabled />
            </FieldContent>
          </Field>

          <Field>
            <FieldContent>
              <FieldLabel>Phone number</FieldLabel>
              <Input
                name="phone"
                defaultValue={user.phone ?? ""}
                inputMode="tel"
                placeholder="01XXXXXXXXX"
                pattern="(?:\+?88)?01[3-9][0-9]{8}"
                title="Use a valid Bangladesh mobile number, like 01712345678 or +8801712345678"
                required
              />
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
                <Input
                  name="institutionName"
                  defaultValue={user.institutionName ?? ""}
                  placeholder="Your school or college name"
                  required
                />
              </FieldContent>
            </Field>
          ) : null}

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-primary">{state.success}</p> : null}

          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
