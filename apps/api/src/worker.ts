/**
 * The background worker as its own process (the loop itself is loop.ts). Render runs this loop
 * inside the API instead (render.yaml); this is for running it separately, locally or to scale.
 *
 *   npx tsx apps/api/src/worker.ts
 */
import { boot } from "./boot";
import { startWorkerLoop } from "./loop";

const { db, paypal } = await boot();
console.log(`worker: PayPal ${process.env.PAYPAL_MODE === "sandbox" ? "sandbox" : "mock"}`);
const stop = startWorkerLoop(db, paypal);
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => void stop().then(() => db.close()).then(() => console.log("worker: stopped")));
}
