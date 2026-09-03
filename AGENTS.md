<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Task: Upgrade User Profile System (Student + Teacher)

Project:
easy-learning-bd

Route:
 /user/profile

Goal:
Create a complete professional profile management system for students and teachers.

Do not create duplicate components.
Reuse existing shadcn/ui components and existing upload utilities.

First inspect the existing code:
- prisma/schema.prisma
- app/user/profile/page.tsx
- components/app/ProfileForm.tsx
- app/profile/actions.ts
- lib/upload.ts
- lib/entity-media.ts
- components/ui/*

==================================================
1. DATABASE UPDATE
==================================================

Update prisma/schema.prisma

Extend User model.

Current user fields must remain.

Add:

```prisma
profileImage String?

// Common personal information
phone String?

// Institute information
district String?
institutionName String?
instituteType String?

// Student information
academicYear String?
rollNumber String?
section String?
groupName String?

// Teacher information
designation String?
subject String?
experience String?
```
Keep relations unchanged.

After update run:

npx prisma migrate dev --name update_user_profile_information

# ==================================================
2. PROFILE PAGE STRUCTURE
Update:

app/user/profile/page.tsx

The page should show:

Dynamic based on user role.

# ==================================================
STUDENT PROFILE
Section 1:

## Personal Information
Fields:

Name
Phone
Profile Picture

Profile uploader:

Design:

---

```
    Avatar Preview
```
Drag & drop files here

or

Browse

Accepted:
image/*

Maximum size:
4.8MB

---
Use existing upload system.

Do not store image binary.
Store uploaded URL/path only.

---
Section 2:

## Academic Information
Fields:

Class

Academic Year

Roll Number

Section

Group

Example:

Class:
SSC Class 10

Academic Year:
2026

Roll:
12

Section:
A

Group:
Science

---
Section 3:

## Institute Details
Fields:

District

Institute Name

Institute Type

Example:

District:
Narsingdi

Institute Name:
Panchdona Sir K G Gupta High School

Institute Type:

- School
- College
- Madrasa
- University

# ==================================================
TEACHER PROFILE
Teacher should NOT see student fields.

Section 1:

## Personal Information
Fields:

Name

Phone

Profile Picture

Section 2:

## Professional Information
Fields:

Institute Name

District

Designation

Subject

Experience

Example:

Institute:
ABC School

Designation:

Assistant Teacher

Subject:

English

Experience:

10 Years

# ==================================================
3. COMPONENT DESIGN
Update:

components/app/ProfileForm.tsx

Use shadcn components:

Import:

Card
CardHeader
CardContent
Input
Label
Button
Select
Textarea
Avatar
Separator

Create reusable sections:

ProfileImageUpload

PersonalInformationForm

StudentAcademicForm

InstituteDetailsForm

TeacherProfessionalForm

Structure:

Personal Information

{student &&

Academic Information

}

Institute Details

{teacher &&

Professional Information

}

# ==================================================
4. IMAGE UPLOAD
Use existing:

lib/upload.ts

lib/entity-media.ts

Do NOT install another uploader.

Requirements:

Accepted:

image/*

Maximum:

4.8 MB

Validation:

if file > 4.8MB:

show toast error

After upload:

save returned URL:

profileImage

Display:

Avatar component

fallback:

First letter of name

# ==================================================
5. SERVER ACTION UPDATE
Update:

app/profile/actions.ts

Add support:

updateProfile(data)

Save:

name

phone

profileImage

district

institutionName

instituteType

academicYear

rollNumber

section

groupName

designation

subject

experience

Validation:

Use existing validation pattern.

Rules:

name required

phone optional

student:

class required

teacher:

designation required

# ==================================================
6. FORM VALIDATION
Use existing project validation library.

Add:

Student:

name:
minimum 3 characters

phone:

valid BD phone format

Teacher:

experience:

string allowed

# ==================================================
7. UI IMPROVEMENT
Profile page should look professional.

Layout:

Desktop:

2 column

Left:

Profile card

Right:

Information forms

Mobile:

single column

Use:

max-w-5xl

space-y-6

rounded-xl

shadow-sm

# ==================================================
8. PROFILE DATA LOADING
When page loads:

Fetch current user:

Include:

class

all profile fields

Do not create another API.

Use existing server action/data fetching.

# ==================================================
9. SECURITY
Only logged user can update own profile.

Never allow:

changing role

changing email

changing user id

# ==================================================
10. FILES TO MODIFY
Modify:

1. 
prisma/schema.prisma

1. 
app/user/profile/page.tsx

1. 
components/app/ProfileForm.tsx

1. 
app/profile/actions.ts

1. 
lib/upload.ts

Only if required.

# ==================================================
11. AFTER CODING
Run:

npm run lint

npm run build

npx prisma generate

Fix all TypeScript errors.

# ==================================================
12. FINAL RESULT
Student profile:

Personal Information

✓ Name
✓ Phone
✓ Profile Picture

Academic Information

✓ Class
✓ Academic Year
✓ Roll
✓ Section
✓ Group

Institute Details

✓ District
✓ Institute Name
✓ Institute Type

Teacher profile:

Personal Information

✓ Name
✓ Phone
✓ Profile Picture

Professional Information

✓ Institute
✓ District
✓ Designation
✓ Subject
✓ Experience

The final implementation must follow the existing project architecture.
Do not create unnecessary files.
Do not break existing authentication or admin/teacher/student roles.

This prompt is complete enough for an AI coding agent to modify the whole profile system in one pass.
