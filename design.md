# Design direction

**Source of truth: `asset/Ringfence-Brand-Guidelines.html` (V1, November 2026)**, plus the produced logo and tagline files in `asset/`. This doc restates that guide for people building the console, the README, Devpost images and the video, and adds the product/UX decisions (layout, components) the brand guide doesn't cover. If the two ever disagree, the brand guide wins — re-check it, don't trust this summary blindly.

This file previously described an early, idea-independent "navy and blue, PayPal-adjacent" direction written before the brand was finalized. That direction is superseded. The real brand is ink and coral, and it explicitly avoids blue — see Trademark and partner rules below.

## The brief

Mostly white and mist, ink for structure, coral only where something needs attention. If a screen has more than one coral thing, one of them is wrong — coral is a single highlight per view, not a primary colour to apply everywhere.

It should **not** feel like the PayPal developer dashboard: no dense left sidebar of menus, no wall of tiny tables, no banners stacked at the top. This is a tool for a small-business owner who wants to know one thing: *what needs my decision?*

## Trademark and partner rules (from the brand guide, section 10)

- **Name partners in plain text.** Write "Built on PayPal Payouts" in our own type. Never use PayPal's logo, wordmark, colours or button styles.
- **Stay off payments blue.** No navy-and-sky-blue pairings, no blue primary buttons, anywhere — not just to avoid PayPal's mark, but because ink and coral are what keep Ringfence visually distinct from every payments brand. (The old navy/blue direction in this file is retired for this reason, not only the trademark one.)
- **Sponsor tools wear our skin.** AG Studio and Bryntum components get the Ringfence theme (tokens below), not their stock look. Credit each sponsor by name in the video and docs — this applies directly to the AG Studio and Bryntum work. (APIMatic has no UI of its own in this build, so there's nothing to reskin — its contribution is `packages/sdk`, a generated TypeScript SDK and Context Plugin for Ringfence's own API, built from `docs/openapi.yaml` via the APIMatic CLI. Its PayPal-side Context Plugin was separately evaluated and dropped: it doesn't cover Payouts, the one PayPal product this build uses — see reminder.md.)
- Mention PayPal in text only (e.g. "runs on the PayPal sandbox"). No PayPal logo or other third-party marks on screen in the video.

## Feel in four words

**Calm** — we hold money, we don't sound alarms. Real members never feel accused.
**Precise** — numbers, names and evidence. Every claim can be traced to data.
**Sharp-eyed** — we notice what one-at-a-time checks miss, and we show our working.
**Fair** — everyone else gets paid on time. A hold is a pause, never a verdict.

## Logo

The mark is the smallest possible ring: four nodes joined into one shape, with one coral node showing the operator behind it. Wordmark: Geist SemiBold, lowercase, tracked −4%.

Files in `asset/`:

| File | Use |
| --- | --- |
| `ringfence-logo-transparent-ink.png` | Lockup (mark + wordmark) on light backgrounds |
| `ringfence-logo-dark.png` | Lockup, white nodes/lines, spark stays coral, on dark backgrounds |
| `ringfence-mark-transparent-ink.png` | Mark alone (app icon, favicon) |
| `ringfence-tagline-stacked-light.png` | Mark + wordmark stacked over a tagline, light |
| `ringfence-tagline-dark.png` | Same, dark |

Rules:
- **Clear space** equal to the mark's height on every side. **Minimum size:** lockup 96px wide, mark 20px.
- **On coral** (ink lines, white spark): stickers and one hero moment only, never in the product.
- **One colour** (all ink): print, faxes, embossing.
- **Don't:** stretch or squash it, make every node coral, place it on busy backgrounds, or retype the wordmark in another font.

## Colour

Tokens below are the brand guide's own names and values — use these names in code, not the retired `--navy`/`--blue` ones.

| Token | Hex | RGB | Use |
| --- | --- | --- | --- |
| `--ink` | `#111114` | 17 17 20 | Text, lines, primary buttons, ring nodes |
| `--spark` | `#FF5A36` | 255 90 54 | The operator node, Held status, **one highlight per view** — never a general-purpose accent |
| `--spark-text` | `#C2381A` | — | Coral words (passes AA; use this, not `--spark`, for coral text) |
| `--mist` | `#F3F3F1` | 243 243 241 | Graph fields, cards on white, quiet panels |
| `--white` | `#FFFFFF` | — | The page. Most of every layout |
| `--slate` | `#5E5E66` | — | Secondary text (6.2:1 on white) |
| `--star-grey` | `#B5B5B0` | — | Idle/unlinked dots only — **never for text** |
| `--hairline` | `#E4E4E0` | — | Borders |

**Proportion a screen roughly this way:** white 60%, mist 22%, ink 15%, spark 3%. If spark is much above that, pull it back.

Status colours — status is always a word plus a dot, never colour alone (see Voice below for the actual words to use):

| State | Colour |
| --- | --- |
| Paid | ink (neutral — paid on time is the unremarkable default, it doesn't need a colour of its own) |
| Held | `--spark` dot/icon + the word "Held" |
| Recovered | ink, same treatment as Paid — it's good news, not an alarm |

Dark mode is **not specified in the brand guide** (it only documents the logo's on-dark treatment: white nodes/lines, spark stays coral). Derived and shipped in `apps/console/app/globals.css`, guarded by `@media (prefers-color-scheme: dark)`: `--ink`/`--white` inverted (page becomes near-black `#111114`, text becomes near-white `#f2f2f0`), `--mist`/`--hairline` darkened toward ink, `--slate`/`--star-grey` lightened to hold their original contrast ratios against the new dark page, `--spark` kept as-is. One deviation from "keep spark as-is": `--spark-text`'s light-mode darkening (`#c2381a`) exists only to pass AA against a *white* page — against the dark page its contrast drops to ~3.5:1 and fails AA, so dark mode reuses full `--spark` (`#ff5a36`, ~6.1:1 on `#111114`) for coral text instead. Checked by computing WCAG contrast ratios by hand, not by eye.

## Type

- **Geist** (words) and **Geist Mono** (evidence — anything a machine produced: IDs, counts, timestamps, labels). Both free, SIL Open Font License, on Google Fonts. Never set body copy in mono.
- Scale: Display 72/1.0, weight 600 (one hero number, e.g. "$7,740 sent"). H1 48/1.05/600. H2 32/1.15/600. H3 22/1.3/600. Body 17/1.55/400. Small 14/1.45/400. Label: Geist Mono 12px, caps, +8% tracking (e.g. "MONDAY RUN · 412 PAYEES").
- Headlines tracked −3 to −4%.
- Money and IDs (`R-12`, `0DR82895XX5881600`) are always Geist Mono, right-aligned/tabular in tables.
- Plain words — see Voice below.

## Graphic language: the constellation

This is the spec for the console's live ring graph. "It's a map, not a galaxy" — three node sizes, one line weight, nothing decorative, drawn from real data whenever possible.

| Element | Spec |
| --- | --- |
| Payee | 5px dot, `--star-grey`. Everyone who's fine: scattered, never connected, never labelled |
| Ring member | 9px dot, `--ink`. Joined by 1.5px `--ink` hairlines. **Lines only ever connect ring members** |
| Operator | 22px dot, `--spark`. The shared device, address or answer that ties the ring together. **One per graphic** |

Do: leave lots of empty field around the ring so the shape reads instantly; place the ring off-centre, like the eye would find it; label rings in mono pills, e.g. `R-12 · 23 linked`.

Don't: glows, gradients, nebulae or starry-sky photos; connect innocent payees, even for decoration; use spark on more than one node.

## Icons

Hairline icons, round ends: 24px grid, 1.5px stroke, round caps and joins, ink only. Coral only for the Hold icon when it's the active state. Six named icons: **Pay, Hold, Trace, Recover, Rule, Agent**.

Extracted as React components in `apps/console/app/icons.tsx`, with paths copied verbatim from the inline `<svg>` markup in `asset/Ringfence-Brand-Guidelines.html` (section "06 — ICONS") rather than redrawn from the written spec, so they match the guide exactly. Each uses `currentColor` so a consumer sets ink (default) or, for Hold only, spark when it's the active state. Wired in so far: Pay/Hold on the Overview stat row, Hold on the hold calendar and its nav link, Rule on the Learned rules page and the Decisions case view's proposed-rule section, Trace on the case view's heading, Agent on the case file heading, Rule on the Decisions nav link. Recover isn't wired into any screen yet — there's no "recovered" status rendered anywhere in the console yet to attach it to.

## Voice

We sound like a calm analyst, not a security alarm. Short sentences, real numbers, the good news first.

| We say | We don't say |
| --- | --- |
| "387 members were paid on time. 25 payouts are on hold." | "FRAUD DETECTED! 25 users blocked." |
| "Ring R-12: 23 accounts that look like one person." | "23 scammers caught." |
| "Held by mistake? Release it in one click." | "Your account has been flagged for suspicious activity." |
| "Rule R-01 caught 48 of 200 disguised attacks." | "Our AI is now smarter than ever." |

**Words we use:** held · ring · real members · payout run · trace · release · recovered · rule · on time
**Words we avoid:** blocked · banned · scammers · criminals · suspicious users · threat · AI-powered

**Implementation note:** the engine's internal decision enum (`PAY` / `HOLD` / `BLOCK` — see `packages/engine/src/types.ts`) is a technical name and stays as-is in code. But nothing user-facing — a chip, a button, a log line in the README, a word in the video — should ever print "blocked". A confirmed ring is still shown as **held** (now confirmed) or, once money is clawed back, **recovered**. Flagging this now because it's an easy habit to break without noticing: `BLOCK` reads naturally as "Blocked" to anyone writing UI copy quickly.

**Note, 4 Nov:** the row above read "Rule R-07 survived 200 disguised attacks" until Chelsea asked twice, specifically, for the control tower's rule-robustness card to drop "survived" (ambiguous — did the rule survive, or the attacks?) for "caught N of 200". Updated here to match. The `/rules` page and the ring detail page's "Proposed rule" section used the original "Survived" phrasing for the same underlying numbers; both now say "Caught N of 200" to match the control tower, so all three surfaces agree.

**Taglines** (from the brand guide): "Connect the dots before payday." · "One dot is a user. Twenty-three is a pattern." · "Pay the real ones. Hold the ring." · "Farming stops paying."
Note: the produced tagline lockup PNGs (`ringfence-tagline-*.png`) instead read "Ready for the fake-account era" — that line isn't in the guide's own tagline list. Picked "Pay the real ones. Hold the ring." (from the guide's own list, and already the home page's copy in `apps/console/app/page.tsx`) for text use — now also the README's tagline. The PNG lockups keep their own "Ready for the fake-account era" line as a separate hero-image treatment; not mixed into body copy.

## Shape, space and components

- **Buttons:** pill shape. Primary action is ink (not coral — coral is reserved for the one highlight, e.g. the Held status or the one decision being asked for for a 1-off special moment). Min height 44px.
- **Cards:** 20px radius, 1px `--hairline` border, **no shadows**.
- **Spacing:** 8px grid (8, 16, 24, 32, 48...).
- **Status chip:** pill, icon plus word, never colour alone (see Status colours above).
- **Stat row:** lead with the good number first (e.g. "387 paid" before "25 held"). Held is the only coral figure on the row.
- **Table (AG Grid):** quartz-style theme reset to the tokens above (ink/mist/hairline, not AG Grid's defaults), 48px rows, sticky header, status chip column first, amounts right-aligned in Geist Mono. Using AG Grid keeps us eligible for its sponsor prize.
- **Receipt block:** Geist Mono, `--mist` background, hash shortened with a copy button.
- **Toast:** bottom centre, one line, auto-dismiss, never for errors that need action.

## Layout principles (still valid, not covered by the brand guide)

1. **One question per screen.** Lead with a large block: "3 things need your decision." Everything else is secondary.
2. **Inbox first, tables second.** Held items are cards with the reason in a sentence, the amount and two buttons. The full table (AG Grid) lives behind "See all activity".
3. **Slim top bar, no deep sidebar.** At most 4 tabs across the top: Today, Activity, Rules, Receipts. Collapse into a bottom bar on phones.
4. **Every decision shows its reason.** A held payment shows why in plain words and which rule did it. Judges reward a visible explanation.
5. **Empty states teach.** No blank tables. Say what will appear here and how.

## Motion

Short and purposeful: 150–200ms ease-out for chips, cards and dialogs. A held card slides out when decided. Respect `prefers-reduced-motion` by turning motion off. No looping animation.

## Accessibility

- Slate (`#5E5E66`) on white is 6.2:1; spark-text (`#C2381A`) "passes AA" per the brand guide — both quoted from the guide itself, not recomputed here. Verify any new colour pairing before shipping it, the same way.
- Focus ring: 2px `--ink` outline (not `--spark` — coral stays a once-per-screen highlight, not a UI-chrome colour), 2px offset, on every interactive element.
- Targets at least 44px. Everything works by keyboard. Status never relies on colour alone (word + icon, always).

## For the demo video (under 3 minutes)

- Record at 1920×1080, browser zoom 110–125% so text is readable on a phone.
- Use only sandbox data with clearly fake names.
- No PayPal logo or other third-party marks on screen. Plain text for the PayPal name.
- Lead the first moments with the one-line promise, not a login screen.
- `asset/Ringfence-Demo-Storyboard_1.pdf` (12 pages, image-only) is a separate pre-production storyboard for the video itself, in a distinct warm/illustrated style (cream backgrounds, simple character doodles) — that's the video's intro-beat treatment, not the product's own UI brand. Out of scope for the console/API work; relevant once someone starts on the video.

## Open questions

- ~~**Icons aren't extracted as files yet**~~ — done, see Icons above.
- ~~**Tagline mismatch**~~ — done, see Taglines above.
- ~~**Dark mode isn't in the brand guide.**~~ — done, see Colour above.
- ~~**Sponsor-tool reskinning**~~ — done. AG Studio, AG Grid and Bryntum are reskinned, tokens confirmed in `apps/console/app/globals.css`, `review/accounts-grid.tsx` and `control-tower/control-tower.tsx`. APIMatic has no UI in this build to reskin either way — see Trademark and partner rules above for what it contributed instead (`packages/sdk`).
- ~~**Task numbering is inconsistent across the repo's own docs**~~ — resolved 2026-11-05: `final-prd.docx` (now in the repo working tree) organizes work by owner and by date gate, not by a numbered task list at all, so the "tasks 4/9/10" numbering this file and `apps/console/.env.example` used was never PRD-backed. Dropped the numbers everywhere; sponsor tools are now referenced by name only.
- ~~**True collapsible AG Grid row groups**~~ — done, without an AG Grid Enterprise license: `review/accounts-grid.tsx` (previously `data-grid.tsx`, before the Overview/Decisions/Learned rules/Control tower console rebuild) hand-builds one clickable, full-width header row per hold group (count and total) on top of AG Grid Community's own full-width-row feature, collapsing or expanding its member rows — AG Grid stays the renderer (keeps the sponsor-prize eligibility above), Community stays the only AG Grid package in use.
- ~~**Control tower was a fixed six-widget layout**~~ — superseded: it's now an editable AG Studio dashboard over three live data sources, with built-in Studio widgets alongside the three custom ones, plus an OpenRouter-backed AI assistant in edit mode (`control-tower/studio/ai.ts`). See the README's Control tower section.
