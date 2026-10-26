# Dependency Compatibility Fix — 2026-10-19

## What was broken

The project used this incompatible combination:

- `next`: `16.4.0`
- `eslint`: `9.39.5`
- `eslint-config-next`: `^14.2.35`

`eslint-config-next@14.2.35` only accepts ESLint 7/8 as a peer dependency, so a normal `npm install` fails with `ERESOLVE` when ESLint 9 is present.

## Fix applied

The lint stack is now aligned to the Next.js 16 line:

- `next`: `16.4.0`
- `eslint`: `9.39.5`
- `eslint-config-next`: `16.4.0`

The existing `eslint.config.mjs` already uses the Next.js 16 flat-config format (`core-web-vitals` + `typescript`), so no config rewrite was necessary.

The Prisma CLI was also aligned with the Prisma Client to avoid CLI/client drift:

- `prisma`: `6.19.3`
- `@prisma/client`: `6.19.3`

## Lockfile note

The uploaded `package-lock.json` encoded the old incompatible `eslint-config-next@14.2.35` dependency graph. It has been removed from this repaired package instead of shipping a misleading/stale lockfile.

On the first machine with npm registry access, run:

```bash
npm install
```

npm will generate a fresh `package-lock.json` matching the repaired `package.json`. Commit that newly generated lockfile with the project.

Do **not** use `--force` or `--legacy-peer-deps` for this issue. Those flags only bypass dependency validation and can preserve a broken lint stack.

## Recommended Windows clean install

From PowerShell in the project folder:

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm cache verify
npm install
npm run lint
npm run build
```

If `package-lock.json` is not present, the second command is harmless because of `-ErrorAction SilentlyContinue`.
