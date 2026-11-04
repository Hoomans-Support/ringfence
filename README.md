# Ringfence

Ringfence is a prototype built for the **2026 PayPal AI Hackathon**. It helps a payout team spot coordinated groups of fraudulent payees, review the evidence, and keep legitimate recipients moving.

The current demo uses seeded, simulated payout data. Week 2's learned-rule holds are illustrative fixture results while the backend evaluator is being integrated.

_Temporary project overview; fuller setup and demo instructions will be added as the build is finalized._

## How this was built

Built during the hackathon's submission period from [`final-prd.docx`](final-prd.docx) (Ringfence v5, 3 Nov 2026), the plan of record for scope, requirements and demo data. Two engineers split the work: one on PayPal plumbing, the rule engine, and the Render deploy; the other, Claude-assisted, on the detection engine, demo data, the console, and the agents (investigator, claim checker, red-team agent). See [agent-coordination.md](agent-coordination.md) for the full task board and [log.md](log.md) for a day-by-day account of what was built, found, and fixed.

### Review queue

387 members were paid on time. 25 payouts are on hold — 23 of them one ring, 2 a roommate pair. Every held item says why.

![Review queue showing 25 held payouts, grouped by ring R-12](docs/screenshots/review-queue.png)

Reset demo (Week 0) starts clean with nothing held; Step to week N replays the next week's data.

![Week 0's empty review queue with the "Reset demo" and "Step to week 1" controls](docs/screenshots/review-queue-empty.png)

### Ring detail

Opening a held item shows the graph that ties the ring together, a Bryntum timeline of all 23 sign-ups inside their 15-minute burst, the case file (every claim re-checked against the real data, not just asserted), and the rule the investigator proposed from this ring, with its red-team score.

![Ring R-12's graph, 23-account sign-up timeline, checked case file, and proposed rule](docs/screenshots/ring-detail.png)

### Rules

Every proposed rule is attacked with 200 disguised copies of the ring it came from before anyone sees it: Rule R-01 survived 37.

![Rule R-01's conditions and its 37-of-200 red-team score](docs/screenshots/rules.png)

### Control tower

Four widgets built on the AG Studio dashboard engine: the ring graph, money kept vs. leaked, a false-hold meter, and rule robustness — all driven by the same run, no separate data path.

![Control tower: ring graph, $460 kept vs. $0 leaked, an 8% false-hold rate, and 18.5% rule robustness](docs/screenshots/control-tower.png)

Week 2 shows what a learned rule would hold — labeled simulated, since the real rule evaluator is A's and not yet connected.

![Week 2's review queue, 18 payouts held under the learned rule R-07, labeled as fixture presentation](docs/screenshots/review-queue-week2.png)

## Local Bryntum setup

The ring timeline uses Bryntum Scheduler 7.3.8. Obtain the authorized trial package from Bryntum and extract it so `scheduler.module.js` and the theme CSS are in `.vendor/bryntum-scheduler-trial/build/`. It's not an npm dependency: both files are served at runtime by `/api/vendor/bryntum` and `/api/vendor/bryntum/theme`, so `npm install` and `npm run build` work without it. You only need it in place before `npm run dev`/`start`, to see the real timeline instead of a 503. `.vendor/` is gitignored; do not commit the trial files.
