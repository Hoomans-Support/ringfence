# Ringfence

Ringfence is a prototype built for the **2026 PayPal AI Hackathon**. It helps a payout team spot coordinated groups of fraudulent payees, review the evidence, and keep legitimate recipients moving.

The current demo uses seeded, simulated payout data. Week 2's learned-rule holds are illustrative fixture results while the backend evaluator is being integrated.

_Temporary project overview; fuller setup and demo instructions will be added as the build is finalized._

## Local Bryntum setup

The ring timeline uses Bryntum Scheduler 7.3.8. Obtain the authorized trial package from Bryntum and extract it so `scheduler.module.js` and the theme CSS are in `.vendor/bryntum-scheduler-trial/build/`. It's not an npm dependency: both files are served at runtime by `/api/vendor/bryntum` and `/api/vendor/bryntum/theme`, so `npm install` and `npm run build` work without it. You only need it in place before `npm run dev`/`start`, to see the real timeline instead of a 503. `.vendor/` is gitignored; do not commit the trial files.
