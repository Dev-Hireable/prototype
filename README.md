# Hireable prototype

A clickable prototype of Hireable's three portals: Team Builder, Independent and Admin. It runs on
demo data kept in the browser, and it's laid out like the real app (Web-App `apps/web`), so its code
can move there as a copy rather than a rewrite.

## Commands

```bash
npm run dev          # http://localhost:3000
npm run typecheck    # both tsconfigs: the app, and e2e/ + tests/
npm run lint         # oxlint
npm run test:unit    # tests/unit (no browser)
npm run test:e2e     # e2e/, against a production build on :3100
npm run build
```

## Structure

```
src/
  app/                      routes only (Next.js App Router)
    (auth)/                 login, signup
    (main)/                 onboarding, team (Team Builder), independent, admin
    _components/            app-level helpers
    page.tsx                the portal picker
    error.tsx, global-error.tsx, not-found.tsx
  components/               UI shared by several routes
    portal/                 what every portal draws: the UI kit (ui.tsx), shell, cards, dialogs, pickers
    workspace/              a contract's Work tab
    team/, independent/, admin/   one portal's own parts
    ui/                     shadcn components, owned by the CLI
    icons.ts                the icon set
  lib/                      logic, types and data: no components
    work/, contract/, disputes/   the rules, the pure ones covered by tests/unit
    portal/                 what the portals share: dates, money, toasts, profile fields
    team/, independent/, admin/   one portal's own data and stores
    demo/                   the stand-in backend: localStorage stores and seed data
  web-app/                  code ported unchanged from the real app's lib/ and components/ui/
```

## Conventions

These are the real app's, so the two stay easy to compare:

- File names are kebab-case: `team-shell.tsx` holds `TeamShell`.
- A route folder holds only Next's own files (`page`, `layout`, `error`…). A route's parts go in
  private folders beside its page: `_components/`, `_lib/`, `_data/`.
- `lib/` never imports from `components/` or `app/`. The one exception is `lib/demo/work-style.ts`,
  which reads the onboarding quiz script where the real app keeps it.
- Imports across layers use `@/`; inside a route folder, relative paths.

And the prototype's own boundaries, so each part can move on its own:

- A portal imports nothing from another portal's folders (`app/(main)/<portal>/`,
  `components/<portal>/`, `lib/<portal>/`), and shared code imports nothing from any portal's. One
  shared file still reads the portals, the chat line that opens a proposal in each side's own
  dialog; the test names it, with its reason.
- The pure rules import only each other, by relative path, never `lib/demo/`: the work domain in
  `lib/work/`, the contract's lifecycle, job types, agreement and fit score in `lib/contract/`,
  `lib/disputes/case.ts` and `lib/portal/dates.ts`.
- No two files import each other in a loop, type imports included.

`tests/unit/architecture.spec.ts` checks these rules.

## Naming across the prototype and the real app

The same thing has different names in three places, so check which one a file speaks:

|               | Prototype                                      | Web-App frontend (`apps/web`) | Web-App backend (`apps/api`)                         |
| ------------- | ---------------------------------------------- | ----------------------------- | ---------------------------------------------------- |
| Roles         | `team`, `independent`, `admin`                 | `client`, `talent`, `admin`   | `employer`, `talent`, `admin`                        |
| A job posting | a "role" (Create Role, All Roles)              | not built yet                 | `job_post`; "role" means a user's role               |
| File names    | kebab-case                                     | kebab-case                    | kebab-case with NestJS suffixes (`auth.service.ts`)  |
| Stored values | mixed: `full-time`, `Pending`, `proposal_sent` | the API's                     | snake_case enums: `full_time`, `under_review`        |
| Fields        | camelCase                                      | camelCase                     | camelCase in GraphQL, snake_case columns in Postgres |

`QUIZ_ROLE` in `lib/demo/work-style.ts` maps the prototype's roles to the real app's
(`team` → `client`, `independent` → `talent`). The API names a few files in camelCase, after the
GraphQL operation or table they serve (`loginWithPassword.resolver.ts`, `workstyleResponse.hooks.ts`).
