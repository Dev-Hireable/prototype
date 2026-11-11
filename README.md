# Hireable prototype

A clickable prototype of Hireable's three portals: Team Builder, Independent and Admin. It runs on
demo data kept in the browser, and it's laid out like the real app (Web-App `apps/web`), so its code
can move there as a copy rather than a rewrite.

## Commands

```bash
npm run dev          # http://localhost:3000
npm run check        # typecheck + lint + unit tests: run it before you push (about 30 s)
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
    kit/                    the design system: one file per component (button.tsx, card.tsx, modal.tsx…)
    portal/                 what the portals share that knows the product: shell, messages, disputes, contract parts
    workspace/              a contract's Work tab
    team/, independent/, admin/   one portal's own parts
    ui/                     shadcn primitives, owned by the CLI: the kit wraps them, screens don't import them
    icons.ts                the icon set
  lib/                      logic, types and data: no components
    work/, contract/, disputes/   the rules, the pure ones covered by tests/unit
    portal/                 what the portals share: dates, money, toasts, profile fields
    team/, independent/, admin/   one portal's own data and stores
    demo/                   the stand-in backend: localStorage stores and seed data
  web-app/                  code ported unchanged from the real app's lib/ and components/ui/
```

## Where code belongs

| What the code owns | Where to put it |
| --- | --- |
| A URL, shared route shell, loading state, error boundary, or HTTP endpoint | `src/app/` with the appropriate Next.js file, such as `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, or `route.ts` |
| UI, logic, or static data used in one route subtree | `_components/`, `_lib/`, or `_data/` at the nearest route segment shared by its consumers |
| UI used across route subtrees | `src/components/<portal>/` for one portal, `src/components/portal/` across portals, or `src/components/workspace/` for contract work |
| A design-system component: one another product could use unchanged | `src/components/kit/<name>.tsx`, imported from that file |
| A shadcn primitive | `src/components/ui/`, added with the shadcn CLI and wrapped by a kit component |
| Logic or data used across route subtrees | `src/lib/<domain>/` or `src/lib/<portal>/`. Keep pure domain rules separate from the browser-backed stores in `src/lib/demo/`. |
| Code copied from the production frontend for parity | The existing `src/web-app/` mirror |

### Discover and Saved Independents

`src/app/(main)/team/discover/page.tsx` and `discover/saved/page.tsx` are Server Component
entry points for `/team/discover` and `/team/discover/saved`. Each renders a screen from its
own `_components/` folder. The screens declare `"use client"` because they manage interactive
state and use browser-backed demo data. Pages and layouts are Server Components by default.

Both screens use the talent browser and overlays in `discover/_components/` and the filter
hook in `discover/_lib/`. The `discover` segment owns these because it is the nearest common
ancestor. The talent card in `src/components/team/ui.tsx` and saved-talent state in
`src/lib/team/saved.ts` belong to the Team portal.

### Adding a piece of UI

Ask these in order and stop at the first yes:

1. **Does the kit already have it?** Look in `src/components/kit/`: the file is named for the
   component (`button.tsx`, `text-link.tsx`, `table.tsx`). Import it from that file:
   `import { Button } from "@/components/kit/button"`. If it almost fits, add a prop there.
2. **Is it used by one route only?** Put it in that route's `_components/`.
3. **Does it name a Hireable thing** (a contract, a dispute, a role, a message)? It goes in
   `src/components/<portal>/` when one portal draws it, `src/components/portal/` when more do.
4. **Could another product use it unchanged?** It's a kit component: a new file in
   `src/components/kit/`, named for it.

A file is a Client Component (`"use client"`) only when it uses state, effects, event handlers or
the browser. The kit's static pieces (`card.tsx`, `badge.tsx`, `table.tsx`) are not, so a Server
Component page can render them as they are.

There is no `index.ts` in the kit on purpose: Next parses every module a barrel file re-exports to
import one name from it, so each component is imported from its own file, as with shadcn's.

## Conventions

One kit draws all three portals. [docs/design-system.md](docs/design-system.md) lists its tokens,
text styles and components, and which one to use for what. `tests/unit/design-system.spec.ts` fails
when a screen defines its own copy of a kit component, spells out a colour or text style that has a
name, draws a link by hand, or when a kit file imports something that knows the product.

Use the shared portal `Card` for standalone content cards. When a card needs its own
semantic element, use the shared `TRAY` and `TRAY_PANEL` styles, as the work board does.
The outer radius is 16px and the inset is 4px, so the inner radius is 12px.

| Edge | Use it when |
| --- | --- |
| A subtle `line` hairline | A card needs an outer edge or adjacent regions need a divider, such as the toolbar and table rows. |
| A change in surface color | A gray tray already frames its inset white panel. The panel uses the surface change as its edge. |
| A stronger `border` edge | An outlined control needs a visible boundary on a light surface, such as a search field, select, or secondary button. |
| A focus ring or state color | The edge communicates focus, selection, or an error. Pair state color with a label, icon, or other visible cue when needed. |
| A dashed border | A region invites a drop or insertion, such as a file upload target. |

Use a chevron for a control that selects a value and a trailing checkmark for the
current choice. Use the vertical ellipsis for more actions. Action menu items use
verb labels, with destructive actions placed last and styled in the danger color.

These are the real app's, so the two stay easy to compare:

- File names are kebab-case: `team-shell.tsx` holds `TeamShell`.
- Route groups such as `(auth)` and `(main)` organize routes without adding URL segments.
  Dynamic segments such as `[slug]` and `[id]` capture values from the URL.
- A route folder holds only Next's own files (`page`, `layout`, `error`…). A route's parts go in
  private folders prefixed with `_`, such as `_components/`, `_lib/`, and `_data/`.
- `lib/` never imports from `components/` or `app/`. The one exception is `lib/demo/work-style.ts`,
  which reads the onboarding quiz script where the real app keeps it.
- Use `@/` across layers and relative imports within a route subtree.

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
