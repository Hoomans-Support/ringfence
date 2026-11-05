# Ringfence

*Pay the real ones. Hold the ring.*

Ringfence sits between a reward program and PayPal Payouts. Before a batch goes out, it looks for groups of accounts one person is secretly running — the same device, the same payout address, sign-ups minutes apart — and holds only those. Everyone else gets paid on time, same as always.

A hold isn't a rejection. An investigator opens it and sees the graph connecting the accounts, a timeline of the sign-up burst, and a case file where every claim is checked against the real data instead of just stated. From there they either release it (these are real people — pay them) or confirm it (this is fraud — never pay it, and remember its devices and addresses so they're caught automatically next time). Confirming a group can also teach Ringfence a new rule, so it catches similar fraud on its own going forward.

Built for the **2026 PayPal AI Hackathon**.

**Status**: the rule engine, payout API, and rule propose/approve flow are real and live — see [Verifying it works](#verifying-it-works). The four-week console walkthrough uses seeded fixture payouts; Week 2 reviews the actual Week 1 fixture decisions, Week 3 applies R-07 or its locally accepted revision to new items, and Week 4 presents cross-program matches and unclaimed-payout recovery as fixture outcomes. Week 4 also has a button to screen through the configured API.

## Key terms

Ringfence uses a few words on purpose, consistently, in this doc and in the code. The full list — and the words we deliberately avoid — is in [GLOSSARY.md](GLOSSARY.md); here's the short version:

| Term | Plain meaning |
| --- | --- |
| **Ring** | Three or more accounts one person is secretly running, found by shared devices/addresses and sign-up timing |
| **Pair** | Two accounts sharing something like a payout address, each already looking suspicious on its own |
| **Hold** | Paused, not judged — a held payout waits for a person to decide |
| **Release** | A person decides a held group is real people; it gets paid |
| **Confirm** | A person decides a held group is fraud; it's never paid, and it's recognized automatically in future runs |
| **Learned rule** | A condition Ringfence writes itself after a ring is confirmed, so it can hold similar rings automatically next time |
| **Red team** | Before a new rule goes live, Ringfence attacks it with 200 disguised copies of the ring it came from, to see what it would still miss |
| **MCP** | The protocol that lets an AI agent call Ringfence directly as a tool, instead of a person clicking through the UI |

## Contents

- [Quick start](#quick-start)
- [Repo layout](#repo-layout)
- [Walkthrough](#walkthrough)
- [How we used each sponsor's tool](#how-we-used-each-sponsors-tool)
- [Payout API](#payout-api)
- [Verifying it works](#verifying-it-works)
- [Deploying to Render](#deploying-to-render)
- [Local Bryntum setup](#local-bryntum-setup)

## Quick start

Nothing to install or sign up for first — this runs with an in-memory database and a fake PayPal built into the app, so no network calls leave your machine:

```bash
npm install
RINGFENCE_API_KEY=dev-key npm start -w @ringfence/api
```

Then, in another terminal, send it a run:

```bash
curl -X POST localhost:3000/v1/payout-runs \
  -H 'authorization: Bearer dev-key' \
  -H 'content-type: application/json' \
  --data-binary @fixtures/week1.json
```

To also run the console UI (`apps/console`), see [Repo layout](#repo-layout) below and [Local Bryntum setup](#local-bryntum-setup) for one dependency it needs. `.env.example` lists every setting with what it's for; copy it to `.env` and only fill in what the piece you're running needs — the default `PAYPAL_MODE=mock` needs none of the real PayPal or Render settings.

## Repo layout

| Path | What it is |
| --- | --- |
| `apps/api` | The payout API: makes the hold/pay decisions, sends runs to PayPal, and serves rules, webhooks, and the MCP server. See [Payout API](#payout-api). |
| `apps/console` | The investigator-facing UI: review queue, ring detail, rules, control tower. Next.js + AG Grid/AG Studio + Bryntum. |
| `packages/engine` | Groups accounts into rings and pairs, scores proposed rules, and runs the red-team attack. |
| `packages/agents` | The pieces built for AI agents: MCP tools, a hard spending cap, and the one place a real AI model gets called (to turn a case-file claim into a plain sentence). |
| `packages/paypal` | Talks to PayPal: sends payouts, checks webhook signatures, handles the "Log in with PayPal" flow. Runs against PayPal's real sandbox (their free test environment) or a built-in fake for offline use. |
| `packages/sdk` | A generated TypeScript client for Ringfence's own API, plus a file that teaches a coding assistant how to call it. See [APIMatic](#how-we-used-each-sponsors-tool). |
| `scripts/` | Demo data generation, smoke tests, chaos/fire-drill tests, the real-sandbox week-1 run. |
| `docs/` | OpenAPI spec, Postman collection, agent-facing docs, recorded test runs. |
| `GLOSSARY.md` | The full version of the [Key terms](#key-terms) table above. |

## Walkthrough

### Review queue

387 members were paid on time. 25 payouts are on hold — 23 of them one ring, 2 a roommate pair. Every held item says why.

![Review queue showing 25 held payouts, grouped by ring R-12](docs/screenshots/review-queue.png)

Reset demo (Week 0) starts clean with nothing held. Week 1 exposes the full 23-account R-12 ring and the roommate pair. Week 2 compares Week 1's engine decisions with the separate truth labels, then lets the investigator accept R-07-v2 in URL-local demo state. Week 3 applies the selected rule to disguised returns. Week 4 brings six device matches into the survey app and shows $460 from 23 Week 1 holds as a simulated cancellation of unclaimed payouts.

![Week 0's empty review queue with the "Reset demo" and "Step to week 1" controls](docs/screenshots/review-queue-empty.png)

### Ring detail

Opening a held item shows the graph tying the ring together, a Bryntum timeline of all 23 sign-ups inside their 15-minute burst, the case file, and the rule the investigator proposed from this ring, with its red-team score.

![Ring R-12's graph, 23-account sign-up timeline, checked case file, and proposed rule](docs/screenshots/ring-detail.png)

### Rules

Every proposed rule is attacked with 200 disguised copies of the ring it came from before anyone sees it: Rule R-01 caught 48. The ones it missed are saved as open cases — the next time someone revises that rule, it widens whichever check a majority of its saved misses would beat, and only a fresh attack that actually catches those exact disguises again closes them: R-01-v2's wider signup window closes 13 of its 112 open cases.

![Rule R-01's conditions and its 48-of-200 red-team score](docs/screenshots/rules.png)

### Control tower

Six widgets built on the AG Studio dashboard engine: the ring graph, money kept vs. leaked, a false-hold meter, a rule-robustness score, a live Ring Watch panel, and a plain-English analyst read.

![Control tower: ring graph, $460 kept vs. $0 leaked, an 8% false-hold rate, and 24% rule robustness](docs/screenshots/control-tower.png)

Ring Watch is the one widget that's always live: it polls the real API every eight seconds for the ring's current member states. To see it update, open the same ring in a second tab and confirm or release the hold there. It needs `RINGFENCE_API_URL`, the read-only `RINGFENCE_MCP_KEY`, and `RINGFENCE_RING_WATCH_THRESHOLD_USD` set on the console host.

### Survey app

Week 4 folds the survey-app scenario into the main review stepper. Its fixture has 120 payees; six reuse an R-12 device. The on-page live screening control exercises the API's cross-program matcher when configured; set `RINGFENCE_SURVEY_API_KEY` on the console host to match the API's survey program key. `/survey-app` redirects to the Week 4 step. The $460 recovery figure is expressly fixture-backed and does not represent a live PayPal cancellation.

## How we used each sponsor's tool

Every sponsor component is restyled in Ringfence's own ink/mist/coral theme ([design.md](design.md)), not its stock look.

**AG Grid + AG Studio** — The review queue (`apps/console/app/review/data-grid.tsx`) groups payouts by hold group, so one decision clears all 23 members of a ring at once (review-queue screenshot above). The control tower (`apps/console/app/control-tower/control-tower.tsx`, `.../studio/widgets.tsx`) is six AG Studio widgets; Ring Watch is the only one backed by live, polled API data, while the analyst read is generated from the same checked case-file evidence shown on the ring detail screen.

**Bryntum Scheduler** — The ring timeline (`apps/console/app/review/[ringId]/ring-timeline.tsx`) puts one row per account, sign-up to payout, so a 23-account ring's 15-minute burst is visible at a glance (ring-detail screenshot above). The hold calendar (`apps/console/app/review/calendar/hold-calendar.tsx`) is one row per held group, showing its 7-day hold limit and 30-day cancel countdown.

**Render** — `render.yaml` is the one Blueprint (Render's term for "every service this app needs, defined in one file"): the API, its background worker (retries failed sends, reconciles state, running inline — `apps/api/src/loop.ts`), an hourly cron job (`apps/api/src/cron.ts`), and Postgres. This is hosting, not a UI feature — but it's genuinely deployed and exercised, not just configured: [docs/smoke-test-results.md](docs/smoke-test-results.md) records a real PayPal webhook arriving at and verified by the deployed instance, something that only works against a real public URL.

**APIMatic** — We fed Ringfence's own OpenAPI spec ([docs/openapi.yaml](docs/openapi.yaml)) into the APIMatic CLI to generate [packages/sdk](packages/sdk): a real TypeScript client (94 files — auth, pagination, retries, error handling, one model per schema) plus a Context Plugin, a file that teaches a coding agent (Claude Code, Cursor, Codex) how to call that client correctly, in TypeScript, C#, and Python. It's verified, not just generated: `npm install`, `typecheck`, `lint`, and the SDK's own smoke test all pass clean in `packages/sdk`, with 0 vulnerabilities. We also evaluated APIMatic's PayPal-side Context Plugin — the other half of this sponsor's intended use — and found it doesn't cover Payouts, the one PayPal product this build uses, so we dropped that angle and generated our own SDK instead.

## Payout API

`apps/api` is the service that sits between a program and PayPal. `POST /v1/payout-runs` takes a PayPal Payouts request body (plus optional per-payee context), decides every payee, and sends the paid ones to PayPal as one batch, exactly once. Every `/v1` route takes the program's API key as `Authorization: Bearer <key>`.

**Paid vs. state** — two different things that sound similar: a run's `summary` counts each payout as **paid** (let through and sent on time — set the moment Ringfence lets it through, before PayPal does anything), **held**, or **blocked** (held, confirmed as fraud). "Paid" says nothing about whether the money was actually collected — that's the payout's separate `state`, which follows PayPal's own words once it's sent: **succeeded**, **unclaimed**, **returned**, or **failed** (and before sending: `queued`, `sent`, `held`, `blocked`). A payout can be paid and still sit unclaimed. Full definitions in [GLOSSARY.md](GLOSSARY.md).

| Route | Does |
| --- | --- |
| `POST /v1/payout-runs`, `GET /v1/payout-runs/:id` | Decide and send a run; read back its decisions and PayPal batch |
| `POST /v1/payout-runs/import` | Record a run that was already paid straight through PayPal, so it's tracked and cancellable here too |
| `POST /v1/holds/release` | Pay held payees, or a whole hold group, in a batch of their own |
| `POST /v1/rings/:id/confirm` | Confirm a hold group (a ring `R-12`, a pair `P-01`, or the payouts a learned rule held, `rule:R-07`) as fraud: never pay it, remember its devices and addresses, cancel its earlier unclaimed payouts |
| `GET /v1/rules`, `POST /v1/rules`, `POST /v1/rules/:id/approve` | Propose a rule learned from a confirmed ring, or a revised version of an existing one; Ringfence assigns its number, replays it against past runs, and red-teams it before anyone approves it |
| `POST /v1/screen`, `GET /v1/rings/:id?run_id=` | Preview the decisions a run would get without storing or sending anything; read a held ring's checked case file |
| `POST /v1/webhooks/paypal` | Receives PayPal's own status-change notifications, signature-verified before anything is acted on |
| `POST /mcp` | The MCP server for AI agents: `screen_payees` and `explain_ring`, both read-only |

Import the [Postman collection](docs/postman/Ringfence.postman_collection.json) and [local environment](docs/postman/Ringfence.postman_environment.json) to call the REST API directly. Set `api_key`, `mcp_key`, and `admin_token` to your instance's credentials; `api_host` defaults to `http://localhost:3000`. [A recorded local run](docs/postman-run.txt) shows 16 passing requests and 17 assertions.

A payee with an individually held payout can prove they own their PayPal address themselves, through `/self-release/start` and `/self-release/callback` — PayPal's own login flow, so no new account or password is involved. Ring and pair members, and shared rule holds, can't use this; a person has to decide those. The review queue's copy-link button is a demo stand-in for that flow; the build doesn't yet deliver the link to a payee through a real notification channel.

An agent that pays people out should screen its payees over MCP first, using the program's read-only `RINGFENCE_MCP_KEY` (every route that actually moves money refuses that key). For example, in Claude Code:

```bash
claude mcp add --transport http ringfence https://<api host>/mcp --header "Authorization: Bearer <mcp key>"
```

`npm run mock-paypal` runs the fake PayPal as its own standalone server, so you can exercise the real PayPal client code and webhook handling without a sandbox account (see the script's header).

## Verifying it works

| Command | Checks |
| --- | --- |
| `npm test` | The engine, agents, and API together, with the API running on an in-memory Postgres as an ordinary (non-admin) database role, so the same per-program data isolation applies as in production |
| `npm run smoke` | Day-one smoke tests 1–7 against PayPal's real sandbox (`-- --mock` runs the same tests against the fake instead, to check the script itself) |
| `npm run sandbox:week1` | Week 1 run through the API against the real sandbox: 387 payees in one real batch, the roommate pair released into its own, the ring confirmed, then reconciled. Needs $7,740+ in the sandbox business account |
| `npm run fire-drill` | Compares no gate, a simple per-request gate, and Ringfence, all on one synthetic program — see [docs/fire-drill.md](docs/fire-drill.md) |
| `npm run chaos` | Replays the demo weeks while killing the process at 5 points mid-run, then audits PayPal's ledger for correctness — see [docs/chaos-run.txt](docs/chaos-run.txt) |

## Deploying to Render

`render.yaml` is one Blueprint: the API (a web service with health check `/health`, on Render's free plan, with its background worker running inside it), an hourly cron job (reconciles state, cancels unclaimed fraud payouts, retries anything PayPal refused), and a Postgres database. The free-plan API sleeps after 15 idle minutes, so its first request after a while takes about a minute.

1. In Render: **New → Blueprint** → this repo, and enter your PayPal sandbox app's client ID and secret when asked.
2. In the PayPal developer dashboard, register `https://<api host>/v1/webhooks/paypal` for the `PAYMENT.PAYOUTS-ITEM.*` events, then set that webhook's ID as the API's `PAYPAL_WEBHOOK_ID`.
3. Render generates the API key and admin token for you; find them in the API service's Environment tab.

## Local Bryntum setup

The ring timeline uses Bryntum Scheduler 7.3.8, which is licensed software, not an npm package, so it isn't committed to this repo. Get the authorized trial package from Bryntum and extract it so `scheduler.module.js` and the theme CSS end up in `.vendor/bryntum-scheduler-trial/build/`. The app serves those two files itself at `/api/vendor/bryntum` and `/api/vendor/bryntum/theme`, so `npm install` and `npm run build` work fine without it — you only need it in place before `npm run dev`/`start`, to see the real timeline instead of a 503 error. `.vendor/` is gitignored; don't commit the trial files.
