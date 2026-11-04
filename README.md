# Ringfence

Ringfence is a prototype built for the **2026 PayPal AI Hackathon**. It helps a payout team spot coordinated groups of fraudulent payees, review the evidence, and keep legitimate recipients moving.

The current demo uses seeded, simulated payout data. Week 2's learned-rule holds are illustrative fixture results while the backend evaluator is being integrated.

_Temporary project overview; fuller setup and demo instructions will be added as the build is finalized._

## How this was built

Built during the hackathon's submission period from [`final-prd.docx`](final-prd.docx) (Ringfence v5, 3 Nov 2026), the plan of record for scope, requirements and demo data. Two engineers split the work: one on PayPal plumbing, the rule engine, and the Render deploy; the other, Claude-assisted, on the detection engine, demo data, the console, and the agents (investigator, claim checker, red-team agent). See [agent-coordination.md](agent-coordination.md) for the full task board and [log.md](log.md) for a day-by-day account of what was built, found, and fixed.

_Placeholder for now — the fuller "how we used it" writeup with screenshots is still open, per the submission checklist in [reminder.md](reminder.md)._

## Local Bryntum setup

The ring timeline uses Bryntum Scheduler 7.3.8. Obtain the authorized trial package from Bryntum and extract it so `scheduler.module.js` and the theme CSS are in `.vendor/bryntum-scheduler-trial/build/`. It's not an npm dependency: both files are served at runtime by `/api/vendor/bryntum` and `/api/vendor/bryntum/theme`, so `npm install` and `npm run build` work without it. You only need it in place before `npm run dev`/`start`, to see the real timeline instead of a 503. `.vendor/` is gitignored; do not commit the trial files.
