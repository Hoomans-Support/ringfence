import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

export function GET() {
  const candidates = [
    path.resolve(process.cwd(), ".vendor/bryntum-scheduler-trial/build/scheduler.module.js"),
    path.resolve(process.cwd(), "../../.vendor/bryntum-scheduler-trial/build/scheduler.module.js"),
    path.resolve(process.cwd(), "apps/console/node_modules/@bryntum/scheduler/scheduler.module.js"),
    path.resolve(process.cwd(), "node_modules/@bryntum/scheduler/scheduler.module.js"),
    path.resolve(process.cwd(), "../../node_modules/@bryntum/scheduler/scheduler.module.js"),
  ];
  const schedulerPath = candidates.find(existsSync);
  if (!schedulerPath) {
    return new Response("Bryntum Scheduler trial package is not installed.", { status: 503 });
  }

  return new Response(readFileSync(schedulerPath), {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
