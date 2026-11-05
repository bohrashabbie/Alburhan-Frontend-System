---
name: alburhan-ui
description: Al-Burhan ERP and POS design system (colours, type, layout shell, components, animations, RTL). Load before building or changing ANY page, component, dialog, table, form or style in the Al-Burhan frontend so every screen looks and moves the same.
---

# Al-Burhan UI design system

The look is **calm, monochrome and dense**: black, white and neutral greys. Colour appears only
for meaning: purple `#6950f3` for focus, links and the active nav item; red for danger; amber for
warning. Everything opens with the same soft ease-out curve.

The `references/` folder holds the original working source this design comes from. Copy those
patterns rather than inventing new ones:

| File | What to take from it |
|---|---|
| `references/globals.css` | **The stylesheet. Copy it as `src/app/globals.css`**, then add the RTL block below |
| `references/ui.tsx` | Button, IconButton, ButtonLink, TextField, SelectField, TextAreaField, CheckboxField, Card, Badge, PageHeader, EmptyState, Loading, ErrorBanner, Modal, Drawer, SlidePanel, Menu, MenuItem, MenuLink, Table. Port these first, as `src/components/ui.tsx` |
| `references/app-shell.tsx` | Top bar + black icon rail + area flyout + profile menu |
| `references/section-layout.tsx`, `sections.ts` | An area's side menu (collapsible white panel) built from one list of groups and links |
| `references/sub-nav.tsx` | Underlined tab row inside a page |
| `references/auth-layout.tsx`, `auth-card.tsx` | Login: black story panel (5fr) and form (7fr) |
| `references/root-layout.tsx` | Fonts wired through `next/font` CSS variables |

Rename the brand to **Al-Burhan** in place of "BCT". Booking-specific parts (calendar, clients,
appointments) are examples only; keep their structure, not their content.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 (CSS-first `@theme inline`, no
tailwind.config), `lucide-react` icons, `swr` for data. This Next.js has breaking changes from older
versions, so **read `node_modules/next/dist/docs/` before using a Next API**. No other UI kit:
do not add shadcn, MUI, Chakra or framer-motion. Dialogs are native `<dialog>`.

## Colour tokens (use the Tailwind names, never raw hex in components)

| Token | Value | Use |
|---|---|---|
| `canvas` | `#f7f7f7` | Page background |
| `surface` | `#ffffff` | Cards, panels, header, menus, inputs |
| `surface-muted` | `#f0f0f0` | Hover rows and buttons, table head (`/60`) |
| `ink` / `ink-soft` / `ink-faint` | `#0a0a0a` / `#525252` / `#8a8a8a` | Text: main / secondary / placeholder |
| `line` / `line-strong` | `#e5e5e5` / `#d0d0d0` | Borders: cards / inputs and secondary buttons |
| `accent` / `accent-strong` / `accent-soft` | `#0a0a0a` / `#2b2b2b` / `#ececec` | Primary button (black), its hover, selected menu item |
| `panel` / `panel-ink` / `panel-ink-soft` | `#0a0a0a` / `#fff` / `#a8a8a8` | Black icon rail, auth story panel, tooltips |
| `link` (= focus) | `#6950f3` | Text links, active rail icon bg, focus ring, focused input border |
| `danger` / `danger-soft` | `#b42318` / `#fdecea` | Errors, destructive actions, notification count |
| `warning` / `warning-soft` | `#8a5a00` / `#fdf3dc` | Warnings, e.g. low stock |
| `sky` / `sky-strong` | `#dbeafe` / `#60a5fa` | Light info highlight |

Fixed extras used in the source:
- Active side-menu item: `bg-[#f0ecff]`.
- Avatar initials: `bg-[#e6f6fd] text-[#0b7cab] border-[#a8dcf5]`.
- Info status pill: `border-[#c9d8fb] bg-[#eef3fe] text-[#2f5fd0]`.
- Chart series: purple `#6950f3` and green `#2e7d32`.
- SlidePanel header default: `#2f78ef`.

## Type

- Fonts: **Inter** (`--font-inter`), set as `font-sans`, and **Geist Mono** (`--font-geist-mono`).
  For Arabic, add **IBM Plex Sans Arabic** via `next/font` and put it in the `font-sans` stack
  after Inter.
- Page title: `text-2xl font-bold tracking-tight`. Drawer (large) title: `text-[28px] leading-9 font-bold tracking-tight`.
- Section or card title: `text-base font-bold`. Dashboard panel title: `text-xl leading-7 font-semibold`.
- Body: `text-sm`. Side-menu links: `text-[15px]`. Group headings: `text-[17px] font-semibold`.
- Table head: `text-xs uppercase tracking-wide text-ink-soft`.
- **All numbers, money and quantities: `tabular-nums`.**

## Shape, spacing, elevation

- Radius: inputs and buttons `rounded-lg`; cards and tables `rounded-xl`; dashboard panels, modals
  and the profile menu `rounded-2xl`; pills, avatars and round buttons `rounded-full`.
- Card: `rounded-xl border border-line bg-surface p-5`. Dashboard panel: `rounded-2xl border border-line bg-surface p-6`.
- Shadows only on floating things: menus `shadow-lg`, drawers and modals `shadow-2xl`, floating
  round buttons `shadow-md` / `shadow-sm`.
- Page actions (Export, Options, Add new) sit inside `.page-actions`, which makes them 46px-tall
  pill buttons with 16px semibold text. Use `PageHeader actions={...}` for this.

## App shell (ERP web app)

- **Top bar:** `sticky top-0 h-16 border-b border-line bg-surface`. Brand on the start side.
  On the end side: the quick action button (e.g. "New quotation", secondary), search, notifications
  bell with a red count, and the avatar menu.
- **Icon rail:** `fixed top-16 w-[4.5rem] bg-panel`. Icons are `size-6 strokeWidth={1.5}` in a
  `size-12 rounded-xl` button. Hover and active state: `bg-link`. When an icon's flyout is open:
  `ring-2 ring-white`. The tooltip is a black bubble with an arrow, placed `fixed` so the scrolling
  rail can't clip it.
- **Flyout:** clicking an area icon slides out a `w-56` white menu beside the rail, with grouped
  links. A round chevron button sits on its edge. It closes on outside click or Esc.
- **Area pages** use `SectionLayout`: a 14rem white side menu that a round chevron button folds
  away, animating `grid-template-columns` over 300ms. On small screens it becomes a scrolling row.
- **Main area:** `mx-auto max-w-[100rem] px-4 py-5 sm:px-6`, or full width inside an area.
- **Avatar menu:** name and current company, then links, then **Switch company / branch** (from
  `/api/v1/me` → `companies`, `branches`), then Log out. It replaces the "Switch business" menu in
  the reference.

ERP rail areas (icon from lucide): Home (`House`), Sales (`Tag`), POS (`ShoppingCart`), Projects
(`FolderKanban`), Inventory (`Boxes`), Purchasing (`Truck`), Installation (`Wrench`), Accounts
(`Landmark`), Reports (`ChartLine`), Settings (`Settings`). Show an item only if `/me` `access`
grants its `.view` permission in the current company/branch.

## Forms in side panels (`ResourcePage`, `src/components/resource-page.tsx`)

- **Normal panel (460px): one column.** **Wide panel (760px, `wide`): two columns**, used for big
  forms such as products, customers, suppliers, roles, users and price lists.
- Full-width items (textareas, tick boxes, section headings) span both columns **only in wide
  panels**. A `col-span-2` in a one-column grid creates an uneven implicit second column.
- Group long forms with `section: "Title"` on a field. It draws a bold heading with a divider.
- Every control is 40px tall (`h-10`). Dropdowns use the `control-select` chevron. Locked fields
  (`lockOnEdit`) look disabled (muted background).
- Country fields use `type: "country"` (searchable picker with flags); tables use `<CountryLabel>`.
  Flags are static SVGs in `public/flags/`.
- Logos and images: `<LogoUpload>` and `<LogoThumb>` (PNG/JPEG/WebP, up to 2 MB, stored in S3).
- Before calling a screen done, screenshot it with the panel open (both a new and an existing
  record) and check that labels, inputs and hints line up.

## Documents with lines (`DocumentList`, `src/components/document-list.tsx`)

Transfers, adjustments, counts, journal entries and (later) quotations, invoices and orders all
follow one pattern: a `DocumentList` (search, status and date filters, "New …" button) that opens
a **wide drawer**. Drafts open an *Editor* (header fields in a two-column grid, then a `Lines`
table with `LINE_INPUT` controls and a footer of totals); posted/sent documents open a read-only
*Viewer* (a `Facts` strip, the lines, then an action section such as Receive or Reverse).
Rules: the footer has Cancel · Save draft · the posting action (primary, on the end side);
Delete sits on the start side and only for drafts; line tables are `table-fixed` with set column
widths so inputs never jump; numbers are `text-end tabular-nums`; the first line is always
present; removal is an `IconButton` with a bin icon.

## Photos and pickers

- `PhotoUpload` (`src/components/photo-upload.tsx`): upload a file **or take a photo with the
  camera** (square centre-crop), replace, remove. Used for company logos, product families and
  products. `PhotoThumb` shows the photo or initials in lists (`size-9` logos, `size-11`/`size-12`
  products).
- `FamilyPicker` (`src/components/family-picker.tsx`): a searchable grid of family cards with
  photos, grouped Indoor / Outdoor / Magnetic & linear / …; used wherever a product family is
  chosen. `ProductPicker` searches products by SKU, model or name.
- `ResourcePage` fields may be `type: "custom"` with a `render` callback to drop these pickers
  into a standard form.
- Buttons never wrap (`whitespace-nowrap`, `shrink-0`); keep labels short.

## Sales documents

- Header grid: Customer (full width, `CustomerPicker`, with the customer's amount due / advance /
  credit limit under it), then Branch · Deliver from, Date · Due date, Currency · Reference, Notes.
- Lines use `SalesLinesEditor` (product search → price auto-filled from the customer's price list or
  the company default; quantity · unit price · disc. % · VAT % · total; description as a quiet
  second row; footer Subtotal / VAT / Grand total). `SalesLinesView` for posted documents.
- A posted invoice is a *Viewer* with four tiles (Total, Paid, Credited, Amount due), the delivery
  status, and actions on the end side in this order: Cancel (ghost, start side) · Credit note ·
  Deliver · **Record payment** (primary).
- Hand-offs between pages go through the URL: `/sales/deliveries?invoice=12`,
  `/sales/receipts?invoice=12`, `/sales/credit-notes?invoice=12`, `/sales/invoices?open=12`. The
  target page opens the prefilled editor and clears the query when it closes.
- Status badges: `SalesStatus` (Draft, Sent, Accepted, Invoiced, Unpaid, Partly paid, Paid,
  Cancelled) and `DeliveryStatus` (Not delivered, Partly delivered, Delivered).

## Sign-in page

The form sits on white at the start. The end half is `CountrySlides`: the group's country
photographs from alburhan-regional.com (Kuwait Towers, Burj Khalifa, Great Wall, Pyramids in
`public/auth/`, portrait 1200 × 1800). It cross-fades every 6s with a slow zoom, shows the current
country's flag and name with progress bars, and sits behind a curved edge
(`[border-start-start-radius:9%_100%]`). With reduced motion it stays on Kuwait. To add a country,
add a photo and a line to `SLIDES`.

## Components and behaviour (from `references/ui.tsx`)

- **Buttons:** `primary` (black), `secondary` (white with border), `ghost`, `danger`. Base classes
  `rounded-lg px-3.5 py-2 text-sm font-medium`. While saving, `pending` shows "Working…".
  Disabled: `opacity-50`.
- **Fields:** label above (`text-sm font-medium`), hint or error below. Error text is `text-danger`
  and the control gets `aria-invalid` (red border). Focus is a purple border plus a
  `0 0 0 3px rgb(105 80 243 / .15)` ring, never an outline box.
- **Menu:** the list is positioned `fixed` so scrolling containers can't clip it. It opens upward
  when the button sits below 65% of the viewport height. It closes on outside click, Esc or resize.
  Esc closes only the menu, not the panel it is in.
- **Modal:** a centred `<dialog>`, `max-w-lg rounded-2xl`, with a black 50% backdrop.
- **Drawer / SlidePanel:** a right-side `<dialog class="slide-panel">` at full height. It slides in
  over 340ms and slides out over 240ms (`data-closing`), with the backdrop at black 25%. The
  large variant's close button is a 48px round button floating **outside the panel's left edge**
  (`sm:-left-[60px]`). Use the drawer for create and edit forms (new item, new customer). Use
  SlidePanel for a record's detail view.
- **Table:** `rounded-xl border` wrapper with horizontal scroll, a muted uppercase head,
  `divide-y` rows, and a row hover of `bg-surface-muted/50`.
- **Badge:** `rounded-full px-2 py-0.5 text-xs font-medium`. Tones: neutral (grey), success
  (black), warning (amber), danger (red). Document statuses map to these: Draft is neutral;
  Approved, Paid and Delivered are success; Partially delivered and Overdue are warning;
  Cancelled is danger.
- **EmptyState:** a dashed `rounded-xl` box with a centred bold title, a short line of text and an
  optional action.
- **Loading:** a centred `text-ink-soft` line ("Loading…"). Errors: `ErrorBanner` lists the API's
  field errors.
- **Lists** follow `RecordList`: a PageHeader with Export (CSV, Excel, PDF), a 4-column filter grid
  (search, dates, status, sort), summary stat Cards, then the Table.

## Motion

One easing curve for entrances: **`cubic-bezier(0.22, 1, 0.36, 1)`**. Exits use `cubic-bezier(0.4, 0, 1, 1)`.

| Element | Animation |
|---|---|
| Drawer / SlidePanel | `panel-in` 0.34s; exit `panel-out` 0.24s; backdrop fades 0.3s in, 0.24s out |
| Rail flyout | `flyout-in` 0.22s (fade, plus slide 16px from the rail) |
| Full-screen create form | `rise-in` 0.35s (fade, plus rise 24px) |
| Detail sections | `.profile-section > *` → `section-in` 0.28s (fade, plus rise 8px) |
| Panel overlay | `panel-in` 0.28s, or `profile-in` 0.45s while the panel widens (`transition-[max-width] duration-500`) |
| Hover states | `transition-colors` only |

Entrance animations use `backwards` fill, never `forwards`. A leftover transform would make the
panel the containing block for `fixed` menus, and they would open in the wrong place. Respect
`prefers-reduced-motion`; globals.css already turns the animations off for it.

## Arabic / RTL (required: the ERP is bilingual)

The reference is LTR-only. In Al-Burhan:
- Set `<html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>`.
- Use **logical** utilities everywhere: `ms-/me-`, `ps-/pe-`, `start-/end-`, `border-s/border-e`,
  `text-start/text-end`. Never use `ml-/mr-/pl-/pr-/left-/right-` for layout.
- Mirror directional icons (chevrons, arrows) with `rtl:-scale-x-100`.
- Add to globals.css so drawers and the flyout slide in from the left in RTL:

```css
[dir="rtl"] dialog.slide-panel { animation-name: panel-in-rtl; }
[dir="rtl"] dialog.slide-panel[data-closing] { animation-name: panel-out-rtl; }
@keyframes panel-in-rtl { from { transform: translateX(-100%); } to { transform: translateX(0); } }
@keyframes panel-out-rtl { from { transform: translateX(0); } to { transform: translateX(-100%); } }
[dir="rtl"] .rail-flyout { animation-name: flyout-in-rtl; }
@keyframes flyout-in-rtl { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
```

- Show `name_ar` from the API when the locale is Arabic, falling back to `name`.

## ERP data conventions

- Money: format with the document's currency. KWD has **3 decimals**; AED, CNY, EGP and USD have
  2 (from the API's `currency.decimal_places`). Use `Intl.NumberFormat(locale, { style: "currency",
  currency, minimumFractionDigits: d, maximumFractionDigits: d })` with `tabular-nums`. The API sends
  amounts as strings; never do money maths in floats.
- Every request runs in a **current company** (and optional branch) chosen in the avatar menu.
  Send it as a filter (`?company=<id>`) and store the choice per user.
- Hide or disable actions the user lacks permission for, using `/me.access[].permissions` for the
  current company or branch. The API enforces this anyway; the UI only avoids dead buttons.
- API base: `/api/v1/` (JWT `auth/token/`, `auth/token/refresh/`). As in the reference, proxy it
  through Next route handlers so tokens stay in httpOnly cookies.

## POS web app differences

Same tokens, fonts and motion. Larger touch targets: buttons at least `h-12`, product tiles in a
grid, the cart in a right-hand panel (start side in RTL), and the pay button full-width primary
`h-14`. No rail; a slim top bar shows the branch, shift status and cashier.

## Checklist before finishing any UI change

1. Only token colours, plus the fixed extras listed above.
2. Built from the `ui.tsx` primitives; no one-off button or input styles.
3. Works in RTL (logical classes, mirrored chevrons) and at phone width.
4. Uses the motion curve and durations above, with `backwards` fill.
5. Numbers use `tabular-nums`; money is formatted per currency.
6. Keyboard: native `<dialog>`, Esc closes, focus ring visible, icon buttons have `aria-label`.
