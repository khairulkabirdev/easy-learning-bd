"use client";

import { useActionState, useMemo, useRef, useState } from "react";

import { updateProfileAction, uploadProfileImageTemp, type ProfileActionState } from "@/app/profile/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { UploadCloud } from "lucide-react";

type ClassOption = {
  id: string;
  name: string;
  code: string;
};

type ProfileFormProps = {
  role: "admin" | "student" | "teacher";
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    profileImage: string | null;
    district: string | null;
    institutionName: string | null;
    instituteType: string | null;
    academicYear: string | null;
    rollNumber: string | null;
    section: string | null;
    groupName: string | null;
    designation: string | null;
    subject: string | null;
    experience: string | null;
    classId: string | null;
    class?: { id: string; name: string; code: string } | null;
  };
  classes?: ClassOption[];
};

const initialState: ProfileActionState = {
  error: "",
  success: "",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";
}

function ProfileImageUpload({ name, value, onChange }: { name: string; value: string; onChange: (nextValue: string) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  async function handleSelectedFile(file: File | null) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.add({ title: "Invalid file", description: "Please choose an image file.", type: "error" });
      return;
    }

    if (file.size > 4.8 * 1024 * 1024) {
      toast.add({ title: "Image too large", description: "Maximum upload size is 4.8MB.", type: "error" });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    if (value.startsWith("/uploads/temp/")) {
      formData.append("previousTempPath", value);
    }
    setIsUploading(true);

    try {
      const result = await uploadProfileImageTemp(formData);
      onChange(result.imageUrl);
      toast.add({ title: "Profile photo updated", type: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Profile photo upload failed.";
      toast.add({ title: "Upload failed", description: message, type: "error" });
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border bg-muted/20 p-5 transition-colors",
        isDragging && "border-primary bg-primary/5"
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        void handleSelectedFile(event.dataTransfer.files?.[0] ?? null);
      }}
    >
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <Avatar size="lg" className="h-20 w-20 border-4 border-background shadow-sm">
          <AvatarImage src={value || undefined} alt={name} />
          <AvatarFallback className="text-xl font-semibold">{getInitials(name)}</AvatarFallback>
        </Avatar>

        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-sm font-medium text-foreground">
            <UploadCloud className="h-4 w-4" />
            Avatar Preview
          </div>
          <p className="text-sm text-muted-foreground">Drag & drop files here</p>
          <div className="flex items-center justify-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={isUploading}>
              {isUploading ? "Uploading..." : "Browse"}
            </Button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(event) => void handleSelectedFile(event.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-muted-foreground">PNG, JPG, WEBP or GIF · Max: 4.8MB</p>
        </div>
      </div>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

function PersonalInformationForm({ user }: { user: ProfileFormProps["user"] }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Personal Information</h2>
        </div>
      </div>

      <Field>
        <FieldContent>
          <FieldLabel>Name</FieldLabel>
          <Input name="name" defaultValue={user.name} placeholder="Your full name" required minLength={3} />
        </FieldContent>
      </Field>

      <Field>
        <FieldContent>
          <FieldLabel>Phone</FieldLabel>
          <Input
            name="phone"
            defaultValue={user.phone ?? ""}
            inputMode="tel"
            placeholder="01XXXXXXXXX"
            pattern="(?:\\+?88)?01[3-9][0-9]{8}"
            title="Use a valid Bangladesh mobile number, like 01712345678 or +8801712345678"
          />
        </FieldContent>
      </Field>

      <Field>
        <FieldContent>
          <FieldLabel>Email</FieldLabel>
          <Input value={user.email} disabled />
        </FieldContent>
      </Field>

      <div className="space-y-2">
        <Label>Profile Picture</Label>
        <p className="text-sm text-muted-foreground">Upload a photo using the profile card on the left.</p>
      </div>
    </div>
  );
}

function StudentAcademicForm({ user, classes }: { user: ProfileFormProps["user"]; classes: ClassOption[] }) {
  const [classId, setClassId] = useState(user.classId ?? user.class?.id ?? "");
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
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Academic Information</h2>

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

      <div className="grid gap-4 md:grid-cols-2">
        <Field>
          <FieldContent>
            <FieldLabel>Academic Year</FieldLabel>
            <Input name="academicYear" defaultValue={user.academicYear ?? ""} placeholder="2026" />
          </FieldContent>
        </Field>

        <Field>
          <FieldContent>
            <FieldLabel>Roll Number</FieldLabel>
            <Input name="rollNumber" defaultValue={user.rollNumber ?? ""} placeholder="12" />
          </FieldContent>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field>
          <FieldContent>
            <FieldLabel>Section</FieldLabel>
            <Input name="section" defaultValue={user.section ?? ""} placeholder="A" />
          </FieldContent>
        </Field>

        <Field>
          <FieldContent>
            <FieldLabel>Group</FieldLabel>
            <Input name="groupName" defaultValue={user.groupName ?? ""} placeholder="Science" />
          </FieldContent>
        </Field>
      </div>
    </div>
  );
}

function InstituteDetailsForm({ user }: { user: ProfileFormProps["user"] }) {
  const instituteOptions = ["School", "College", "Madrasa", "University"];
  const [instituteType, setInstituteType] = useState(user.instituteType ?? "School");

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Institute Details</h2>

      <Field>
        <FieldContent>
          <FieldLabel>District</FieldLabel>
          <Input name="district" defaultValue={user.district ?? ""} placeholder="Narsingdi" />
        </FieldContent>
      </Field>

      <Field>
        <FieldContent>
          <FieldLabel>Institute Name</FieldLabel>
          <Input
            name="institutionName"
            defaultValue={user.institutionName ?? ""}
            placeholder="Panchdona Sir K G Gupta High School"
          />
        </FieldContent>
      </Field>

      <Field>
        <FieldContent>
          <FieldLabel>Institute Type</FieldLabel>
          <Combobox
            items={instituteOptions}
            value={instituteType}
            onValueChange={(nextValue) => setInstituteType(nextValue ?? "")}
          >
            <ComboboxInput placeholder="Select institute type" showClear={Boolean(instituteType)} className="w-full" />
            <ComboboxContent>
              <ComboboxEmpty>No institute type found.</ComboboxEmpty>
              <ComboboxList>
                {(item) => (
                  <ComboboxItem key={item} value={item}>
                    {item}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          <input type="hidden" name="instituteType" value={instituteType} />
        </FieldContent>
      </Field>
    </div>
  );
}

function TeacherProfessionalForm({ user }: { user: ProfileFormProps["user"] }) {
  const instituteOptions = ["School", "College", "Madrasa", "University"];
  const [instituteType, setInstituteType] = useState(user.instituteType ?? "School");

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Professional Information</h2>

      <Field>
        <FieldContent>
          <FieldLabel>Institute Name</FieldLabel>
          <Input name="institutionName" defaultValue={user.institutionName ?? ""} placeholder="ABC School" />
        </FieldContent>
      </Field>

      <Field>
        <FieldContent>
          <FieldLabel>Institute Type</FieldLabel>
          <Combobox
            items={instituteOptions}
            value={instituteType}
            onValueChange={(nextValue) => setInstituteType(nextValue ?? "")}
          >
            <ComboboxInput placeholder="Select institute type" showClear={Boolean(instituteType)} className="w-full" />
            <ComboboxContent>
              <ComboboxEmpty>No institute type found.</ComboboxEmpty>
              <ComboboxList>
                {(item) => (
                  <ComboboxItem key={item} value={item}>
                    {item}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          <input type="hidden" name="instituteType" value={instituteType} />
        </FieldContent>
      </Field>

      <Field>
        <FieldContent>
          <FieldLabel>District</FieldLabel>
          <Input name="district" defaultValue={user.district ?? ""} placeholder="Dhaka" />
        </FieldContent>
      </Field>

      <Field>
        <FieldContent>
          <FieldLabel>Designation</FieldLabel>
          <Input name="designation" defaultValue={user.designation ?? ""} placeholder="Assistant Teacher" />
        </FieldContent>
      </Field>

      <Field>
        <FieldContent>
          <FieldLabel>Subject</FieldLabel>
          <Input name="subject" defaultValue={user.subject ?? ""} placeholder="English" />
        </FieldContent>
      </Field>

      <Field>
        <FieldContent>
          <FieldLabel>Experience</FieldLabel>
          <Input name="experience" defaultValue={user.experience ?? ""} placeholder="10 Years" />
        </FieldContent>
      </Field>
    </div>
  );
}

export function ProfileForm({ role, user, classes = [] }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);
  const [profileImage, setProfileImage] = useState(user.profileImage ?? "");

  return (
    <main className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Card className="overflow-hidden rounded-xl shadow-sm">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-2xl">Profile</CardTitle>
            <CardDescription>Keep your personal, academic, and institutional details up to date.</CardDescription>
          </CardHeader>

          <CardContent className="p-0 sm:p-0">
            <form action={formAction} className="space-y-0">
              <div className="grid gap-6 p-4 md:grid-cols-[300px_minmax(0,1fr)] md:p-6">
                <aside className="space-y-4">
                  <Card className="rounded-xl border bg-background shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Profile card</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pb-5">
                      <div className="flex justify-center">
                        <Avatar size="lg" className="h-22 w-22">
                          <AvatarImage src={profileImage || undefined} alt={user.name} />
                          <AvatarFallback className="text-xl font-semibold">{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                      </div>

                      <div className="space-y-2 text-center">
                        <div className="text-lg font-semibold">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>

                      <Separator />

                      <ProfileImageUpload name="profileImage" value={profileImage} onChange={setProfileImage} />
                    </CardContent>
                  </Card>
                </aside>

                <div className="space-y-6">
                  <section className="space-y-5 rounded-xl border bg-background p-4 shadow-sm sm:p-5">
                    <PersonalInformationForm user={user} />
                  </section>

                  {role === "student" ? (
                    <section className="space-y-5 rounded-xl border bg-background p-4 shadow-sm sm:p-5">
                      <StudentAcademicForm user={user} classes={classes} />
                    </section>
                  ) : null}

                  {role === "teacher" ? (
                    <section className="space-y-5 rounded-xl border bg-background p-4 shadow-sm sm:p-5">
                      <TeacherProfessionalForm user={user} />
                    </section>
                  ) : role === "student" ? (
                    <section className="space-y-5 rounded-xl border bg-background p-4 shadow-sm sm:p-5">
                      <InstituteDetailsForm user={user} />
                    </section>
                  ) : null}

                  <div className="space-y-3 border-t pt-4">
                    {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
                    {state.success ? <p className="text-sm text-primary">{state.success}</p> : null}

                    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
                      {pending ? "Saving..." : "Save profile"}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
