# Design direction

Idea-independent. It covers how the product looks and feels. Screens and flows get added once the idea is chosen (A or B).

## The brief

PayPal-adjacent, not a PayPal copy. It should feel like a calm, trustworthy money product: navy and blue, generous white space, rounded pill shapes, plain language. We keep Inter (free) as the font and our own amber accent, since PayPal's font is proprietary and its yellow is part of its brand.

It should **not** feel like the PayPal developer dashboard: no dense left sidebar of menus, no wall of tiny tables, no banners stacked at the top. This is a tool for a small-business owner who wants to know one thing: *what needs my decision?*

**Trademark rule.** The hackathon rules ban third-party trademarks in the video. We use PayPal-inspired colours and shapes, but never the PayPal logo, wordmark or "PayPal Sans" font. Mention PayPal in text only (for example "runs on the PayPal sandbox").

## Feel in three words

Calm. Clear. Accountable.

## Colour

Tokens go on `:root`. Dark mode redefines them. Contrast ratios below were computed (WCAG: 4.5 or more for body text).

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg` | `#FFFFFF` | `#06142E` | page |
| `--canvas` | `#F5F7FA` | `#0B1D3F` | cards sit on this |
| `--ink` | `#001435` (18.2:1) | `#EAF0FA` (16.0:1) | main text |
| `--muted` | `#5A6B85` (5.4:1) | `#9FB0CC` (8.3:1) | secondary text |
| `--line` | `#D9DEE7` | `#1F3358` | borders |
| `--navy` | `#003087` | `#003087` | headings, hero areas |
| `--blue` | `#0070E0` (4.8:1 with white text) | `#5AA2FF` (7.0:1) | links, primary buttons, focus |
| `--sky` | `#009CDE` | `#009CDE` | accents, charts |
| `--accent` | `#FFB020` | `#FFB020` | the single most important action, with `--ink` text (about 11:1). Amber, not PayPal's button yellow |

Status colours. These are the product's core vocabulary, so they must be unmistakable and never colour alone (always an icon and a word).

| State | Text on tint (light) | Text on tint (dark) | Icon |
| --- | --- | --- | --- |
| Allowed | `#0B6B45` on `#E3F5EC` (5.8:1) | `#5FD39B` on `#0E2A22` (8.2:1) | check |
| Held | `#7A4B00` on `#FFF0C7` (6.5:1) | `#FFD36B` on `#33260A` (10.4:1) | pause |
| Blocked | `#B3202A` on `#FDE8EA` (5.7:1) | `#FF8B93` on `#3A1218` (7.3:1) | stop |

Rules:
- Blue is the primary action. The amber pill is used **once per screen**, for the decision the owner is being asked to make (for example Approve). Never use it for decoration.
- Navy, blue and Inter are applied everywhere: the app, the README header, the Devpost images and the video title cards. One palette and one font across all of it makes the project look like a single product.
- Navy for large headings and hero blocks. Do not set long body text in blue.
- Red is only for blocked and destructive actions. Use sky or navy for charts so a chart is never mistaken for an alert.

## Type

- **Inter** (Google Fonts), the nearest open stand-in for a friendly geometric sans. Fallback: system sans.
- Scale: 14 body, 16 inputs, 20 section titles, 28 page titles, 40 only for one hero number or promise.
- Weights: 400 body, 600 labels and buttons, 700 headings.
- Money is always `tabular-nums`, right-aligned in tables, with the currency code (`USD 12.00`).
- Plain words. "Held for you", not "Pending manual review".

## Shape and space

- Radius: 12 on cards, 999 (pill) on buttons and status chips, 8 on inputs.
- Spacing on a 4px grid: 8, 12, 16, 24, 32, 48. Cards get 24 of padding.
- Elevation: a 1px `--line` border first, a soft shadow only on floating things (dialogs, menus).
- Icons: one outline set (Lucide), 20px, 1.5px stroke. No emoji in the product.

## Layout principles (different from the dashboard in the screenshot)

1. **One question per screen.** Lead with a large block: "3 things need your decision." Everything else is secondary.
2. **Inbox first, tables second.** Held items are cards with the reason in a sentence, the amount and two buttons. The full table (AG Grid) lives behind "See all activity".
3. **Slim top bar, no deep sidebar.** At most 4 tabs across the top: Today, Activity, Rules, Receipts. The tabs collapse into a bottom bar on phones.
4. **Every decision shows its reason.** A held payment shows why in plain words and which rule did it. Judges reward a visible explanation.
5. **Receipts feel physical.** A short, monospaced block with a hash and a "Verified" tick. It is a trust signal and looks good in the video.
6. **Empty states teach.** No blank tables. Say what will appear here and how.

## Components

- **Button:** primary (blue, pill), decision (amber pill, ink text), secondary (outline), danger (red text, outline). Min height 44px.
- **Status chip:** pill, tint background, icon plus word. Never colour alone.
- **Decision card:** left status stripe, amount (large, tabular), one-line reason, buttons on the right (stacked under 640px).
- **Table (AG Grid):** quartz-style theme set to our tokens, 48px rows, sticky header, status chip column first, amounts right-aligned. Using AG Grid keeps us eligible for its sponsor prize.
- **Receipt block:** monospace, `--canvas` background, hash shortened with a copy button.
- **Toast:** bottom centre, one line, auto-dismiss, never for errors that need action.

## Motion

Short and purposeful: 150 to 200ms ease-out for chips, cards and dialogs. A held card slides out when decided. Respect `prefers-reduced-motion` by turning motion off. No looping animation.

## Accessibility

- All text meets 4.5:1 (checked above). Focus ring is a 2px `--blue` outline with a 2px offset on every interactive element.
- Targets are at least 44px. Everything works by keyboard. Status never relies on colour alone.
- Support light and dark. Dark is not an inverted copy: backgrounds stay navy, not black.

## For the demo video (under 3 minutes)

- Record at 1920x1080, browser zoom 110 to 125 so text is readable on a phone.
- Use only sandbox data with clearly fake names.
- No PayPal logo or other third-party marks on screen. Use plain text for the PayPal name.
- Lead the first 10 seconds with the one-line promise and the decision card, not a login screen.

## Open questions

- Product name and logo (blocked on the A or B decision, and the rename for A).
- Do we show real PayPal sandbox buttons in the demo? If so, check that it doesn't breach the third-party trademark rule.
- Mobile first or desktop first? The demo is probably desktop, but a phone view makes a strong "owner on the go" shot.
