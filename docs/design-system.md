# Hireable design system

One kit draws all three portals (Team Builder, Independent, Admin). A screen is built from the kit's
components and the theme's tokens. It doesn't restyle them and doesn't draw its own version of
something the kit already has.

`tests/unit/design-system.spec.ts` checks the rules that can be checked on the source: a kit
component is defined once, a colour that has a token is written as the token, a text style that has
a name is written as the name, and a blue link is a `TextLink`.

## Where it lives

| Layer | File | What it holds |
| --- | --- | --- |
| Tokens | `src/app/globals.css` (`@theme inline`) | Colours, fonts, the page gutter, the UI scale |
| Components | `src/components/kit/` | One file per component, named for it: `button.tsx`, `card.tsx`, `modal.tsx`, `select.tsx` |
| Shared class strings | `src/components/kit/styles.ts` | Text styles, the form control, the icon button, the card's tray and panel |
| Icons | `src/components/icons.ts` | `ICONS`, the one icon set |
| Primitives | `src/components/ui/` | shadcn components, owned by its CLI. Screens import the kit, not these. |

Import a component from its own file: `import { Button } from "@/components/kit/button"`. The kit
has no `index.ts`, and its files import nothing that knows Hireable's data (a contract, a dispute, a
store), so the folder ports to the real app as it is. What the portals share that does know the
product (the shell, messages, disputes, contract parts) is in `src/components/portal/`.

`src/web-app/` and `src/app/(main)/onboarding/` are the real app's code, ported unchanged with its
own theme (`.web-app-theme`). They sit outside this system on purpose.

## Colour

Write the token (`bg-surface-2`, `text-ink-2`), never the hex. A colour used once that has no token
(a chart series, a brand gradient) may stay an arbitrary value. A colour used in a second place gets
a token first.

| Token | Value | Use |
| --- | --- | --- |
| `ink` | `#212121` | Primary text |
| `ink-2` | `#616161` | Secondary text and icons |
| `ink-deep` | `#141a21` | A figure or value in a card or table |
| `ink-disabled` | `#c3c3c3` | The text of a disabled control |
| `muted`, `muted-2` | `#737d8a`, `#8a8f98` | Admin's table labels, a Select's placeholder |
| `primary` | `#007acc` | Primary buttons, links, focus |
| `accent`, `accent-bg`, `accent-ink` | `#1770d9`, `#e6f3fc`, `#004675` | Selection: the open menu, the picked row |
| `border` | `#c3c3c3` | An outlined control: input, select, secondary button |
| `border-strong` | `#a6a6a6` | A clickable card's edge on hover |
| `line` | `#e3e8ed` | A card's outer edge, a table's row rule |
| `line-soft` | `#eeeeee` | A divider between rows inside a white panel |
| `surface-2` | `#f2f2f2` | The shell's frame, a card's tray, a chip |
| `surface-3` | `#e5e5e5` | A disabled fill, an empty track, the hover on `surface-2` |
| `surface-alt` | `#f9fafb` | A row's hover, an empty state's fill |
| `tile` | `#f6f6f6` | A tile inside a card's white panel |
| `skeleton` | `#d2d8db` | Behind a photo until it loads |
| `ok`, `ok-bg`, `ok-ink` | `#27ae60`, `#eef9f2`, `#1b6b3a` | Done, paid, resolved |
| `warn`, `warn-bg`, `warn-ink` | `#ef7d1a`, `#fff3e8`, `#a84d05` | Needs attention; not yet a failure |
| `danger`, `danger-bg`, `danger-hover` | `#c4352c`, `#fcf2f2`, `#a92d25` | Overdue, failed, destructive |
| `info-bg` | `#ebf8fe` | The tint behind `brand-blue` text |
| `review` | `#f7ba00` | In review: a status, not a warning |
| `brand-orange`, `brand-blue`, `brand-magenta` | | Trial, full-time, part-time |

A status is a tone, not a colour: status data carries a `Tone` (`src/lib/portal/tone.ts`) and
`Badge` draws it.

## Type

Inter for text, DM Sans (`font-display`) for a page's title and a card's heading. The text styles
that recur have names in `styles.ts`. Use the name when the text is that thing:

| Name | Style | Use |
| --- | --- | --- |
| `TEXT_TITLE` | 16 / 1.5, semibold | A block's heading inside a page or card |
| `TEXT_LABEL` | 14 / 1.2, semibold | The name of a field or of a value |
| `TEXT_BODY` | 14 / 1.2, `ink-2` | Secondary copy: a hint, a line under a heading |
| `TEXT_NOTE` | 13 / 1.4, `ink-2` | A smaller note under a control or figure |

Headings that sit on a component come from it: `Page` (24 display), `CardHeading` (18 display),
`CardTitle` (16), `Modal` (20), `StepHeading` (20).

## Shape and space

| | Value | Use |
| --- | --- | --- |
| Radius | `rounded` 4px | Badges, chips |
| | `rounded-lg` 8px | Controls: buttons, inputs, selects, menus |
| | `rounded-xl` 12px | A card's panel, a dialog |
| | `rounded-2xl` 16px | A card's tray |
| | `rounded-full` | Icon buttons, pills, avatars |
| Control height | 36 / 40 / 44 / 48 | `Button` `sm` / `md` / `lg` / `xl`; inputs and selects are 44 |
| Page gutter | `--page-gutter` | 32px, 24px on a tablet, 16px on a phone. `Page` applies it. |
| Content width | 1280px | `PortalContent`, inside `Page` |

Edges follow the table in the README (a `line` hairline, a surface change, a `border`, a focus ring,
a dashed drop target).

## Components

Each row is the one component for that job. A component's file is its name in kebab-case in
`src/components/kit/` (`TextLink` is in `text-link.tsx`); a component that shares a file is listed
with it below.

### Page and layout

| Component | From | Use |
| --- | --- | --- |
| `Page` | `kit/page` | Every screen in all three portals: title, badge, tabs, header actions, the nav row, the scroller. `fill` hands the scrolling to a workspace. |
| `BreadcrumbBack`, `BreadcrumbTrail` | `kit/breadcrumb` | A page's `nav`: one step back, or the list and then the page |
| `Section`, `FactStrip`, `SIDE_COLUMN`, `WITH_SIDE` | `kit/page-parts` | A detail page's blocks and its side column |
| `SettingsCard` | `portal/settings` | A settings screen's 720px card |
| `StepCard`, `StepHeading`, `Steps` | `kit/step-card`, `kit/steps` | A wizard's step and its stepper |

### Surfaces

| Component | Use |
| --- | --- |
| `Card` | Every standalone card: a grey tray, a white panel, an optional heading with `sub` and `aside`. A card that needs its own element uses `TRAY`, `TRAY_PANEL` and `TRAY_FOOT`. |
| `PanelCard` | A `Card` whose panel is a padded column (the trackers' side cards) |
| `EmptyState` | Nothing here: a title, why, and the way on |
| `InfoBanner` | An inline note: `info`, `warn` or `success` |
| `Modal`, `Bullets` | A dialog (a bottom sheet on a phone), and the short list of what its action does |
| `Drawer` | A panel that slides in from the right |
| `Toast` with `useToast` | What just happened, with one optional action |

### Actions

| Component | Use |
| --- | --- |
| `Button`, `LinkButton` | `primary` for the screen's main action, `secondary` (the default) for the rest, `danger` for a destructive one and its confirm, `ghost` on a busy surface |
| `MessageButton` | Every "Message ..." action |
| `TextLink` | Every link in text, and every action drawn as one: `href` for a link (`external` for another site), `onClick` for a button in the same look. `inline` inside a sentence, `tone="danger"` for a quiet Decline, `tone="inherit"` on a coloured banner. |
| `ICON_BUTTON` (class) | Every icon-only button: pass a `size-*` |
| `KebabMenu` with `MenuAction`, `MenuLink` | More actions on a card or row: verbs, destructive last |
| `SaveToggle`, `SaveButton` | The bookmark |

### Forms

| Component | Use |
| --- | --- |
| `Field` | A control's label, hint and error |
| `Input`, `Textarea` | Text. Both are `FORM_CONTROL`. |
| `Select` | Pick one from a list. No native `<select>`. |
| `SearchBox` | Every search field. Pass `value` and `onChange` to filter by it. |
| `Checkbox`, `CheckboxBox` | A tick with its label, or the box alone |
| `Pills` | Choose one of a few, always one chosen: filters, List / Board |
| `Tabs` | Switch what a page shows |
| `DatePicker`, `TimeZonePicker`, `SkillPicker` | The pickers |
| `Toolbar` | A row of filters: search and selects on the left, a count or button on the right |

### Data

| Component | Use |
| --- | --- |
| `Table`, `Row`, `Pagination` | The one table: columns as width classes (fixed widths and one flexible column), a card per row on a phone |
| `DataTable` (`admin/ui`) | The same `Table`, filled from a list of columns and rows instead of a `Row` written per record. Admin's lists use it. |
| `Badge` | Every pill. `tint` for a status, `solid` for a category, `outline` for a plain fact. `StatusDot` and `JobBadge` are shorthands. |
| `Chip` | A skill or a removable filter |
| `MatchPill`, `Meter`, `ScoreRing`, `Stars` | Scores |
| `Avatar`, `Initials`, `Person` | People |
| `StatCard`, `StatGrid` (`admin/ui`) | Admin's figures |
| `KanbanColumn`, `KanbanList` | Boards |
| `TaskRef`, `StatusCircle`, `StatusPill`, `PriorityPill` (`portal/tasks/task-bits`) | A task wherever it's listed |
| `Tip`, `InfoTip` | Tooltips. Never the browser's `title`. |

### Files that hold more than one component

| File in `kit/` | Holds |
| --- | --- |
| `button.tsx` | `Button`, `LinkButton`, `MessageButton` |
| `card.tsx` | `Card`, `CardTitle`, `CardHeading`, `KeyValue` |
| `badge.tsx` | `Badge`, `StatusDot`, `JobBadge` |
| `avatar.tsx` | `Avatar`, `Initials`, `Person` |
| `field.tsx` | `Field`, `Input`, `Textarea` |
| `search-box.tsx` | `SearchBox`, `Highlight` |
| `checkbox.tsx` | `Checkbox`, `CheckboxBox` |
| `table.tsx` | `Table`, `TableContent`, `Row` |
| `modal.tsx` | `Modal`, `Bullets` |
| `kebab-menu.tsx` | `KebabMenu`, `MenuAction`, `MenuLink` |
| `breadcrumb.tsx` | `BreadcrumbBack`, `BreadcrumbTrail`, `PageNav` |
| `page-parts.tsx` | `Section`, `FactStrip`, `SIDE_COLUMN`, `WITH_SIDE` |
| `kanban.tsx` | `KanbanColumn`, `KanbanList`, `KanbanEmpty`, `KanbanJump`, `CountPill` |
| `meter.tsx` | `Meter`, `MiniBar`, `Swatch`, `ScoreRing` |
| `inline-edit.tsx` | `EditButton`, `EditPanel` |
| `notify.tsx` | `raiseToast`, `dismissToast`: what `Toast` (`toast.tsx`) shows through the app's one `Toaster` (`toaster.tsx`) |
| `styles.ts` | Every shared class string: `TEXT_*`, `FORM_CONTROL`, `ICON_BUTTON`, `TRAY*`, `TOOLBAR_BUTTON` |

## Adding to it

1. Look in `src/components/kit/` first. If the kit has it, use it; if it almost fits, add a prop to
   the kit's component.
2. Something one route draws goes in that route's `_components/`. Something one portal draws goes in
   `src/components/<portal>/`. Something two portals draw that names a Hireable thing (a contract, a
   dispute, a message) goes in `src/components/portal/`.
3. Something another product could use unchanged is a kit component: a new file in
   `src/components/kit/`, named for it in kebab-case. It imports only other kit files, the shadcn
   primitives, the icons and `lib/portal`.
4. A class string pasted a third time becomes a component, or a constant in `styles.ts`.
5. A colour used a second time becomes a token in `globals.css`.
6. `"use client"` goes on a kit file only when it uses state, effects, event handlers or the browser.

## Known gaps

These are still drawn more than one way. Each needs a decision about how it should look, not just a
refactor.

- **Links inside a chat bubble.** A task reference and a source chip in a message take the bubble's
  own colours (white on the sender's blue), so they are still written by hand in `messages-page.tsx`
  and `chat-source-link.tsx`.
- **Type sizes.** 23 font sizes are in use, several half a pixel apart (12 / 12.5 / 13 / 13.5). The
  four named styles cover the exact repeats only.
- **Colours carried in data.** Board column and tag colours are hex values in `lib/` data
  (`lib/work/model.ts`, `lib/team/data.ts`, `lib/independent/data.ts`,
  `components/workspace/labels.ts`), drawn through `style`. They repeat token values without reading
  them.
