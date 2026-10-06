# Global Page Navigation Update

- `PageNavigation` is a dedicated page-level component; it is not rendered inside `AppShellNav`.
- Admin, Teacher, and Student/User layouts render it once above route content, so every route inherits the same navigation automatically.
- Breadcrumb labels resolve Class, Subject, Unit, Lesson, Topic, Unseen Composition, subject-section block titles, and Content context through `/api/navigation/labels` using the signed-in user's organization.
- The Back button uses logical parent routes and safe role fallbacks.
- Existing duplicate route-level breadcrumb/back markup was removed from affected pages.
- `AppShellNav` keeps the shared `max-w-screen-2xl` outer and `max-w-7xl` inner width system.
