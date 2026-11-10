# Student dashboard: layout, links and theme tokens

## Routes

- `/user` is the canonical dashboard; the previous `/user/dashboard` URL redirects here.
- `/user/chapter-preparation` opens published subjects for the student's class.
- `/user/practice` lists working English 1st/2nd Paper practice section links and links to other published subjects.
- `/user/profile` is the existing student profile/settings page.
- Header search filters the actual published subject names and supported student pages, not an unimplemented global search endpoint.

The desktop sidebar becomes a sheet drawer below `lg`. A four-item bottom navigation is used on mobile and tablet. Dark/light preference uses the project's existing `dashboard-theme` browser key.

## Centralized primary color

**Edit the existing `--primary` values in `app/globals.css` (`:root` and `.dark`)** to recolor primary buttons, active navigation, icon badges, progress rings and hero accents. The dashboard does not hardcode a green HEX color or create an independent accent setting. Student-only light/dark surfaces, hero gradients and spacing are defined in `app/user/student-workspace.css`; CSS is scoped to `.student-workspace` and does not redesign Admin/Teacher workspaces.

## Honest data behavior

- Subject, lesson and practice-set counts come from the student's published-class/organization records, not mockup numbers.
- Practice links open real existing section routes.
- The daily checklist/activity track is optional, locally stored per browser/user/day; it is **not** server-synced student performance data.
- No fake model-test scores, past attempts, notifications, downloads, achievements, or upgrade checkout links were added.

## Validation checklist

Run `npm run build` in the project. Verify `/user`, `/user/practice`, `/user/chapter-preparation` and `/user/profile` in both theme modes at 360px, 390px, 768px, 1024px and 1440px. Check mobile drawer links, bottom navigation, subject search, lesson/practice links, the theme toggle, daily checklist, and sign out.
