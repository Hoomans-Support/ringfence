import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

export function GET() {
  const candidates = [
    path.resolve(process.cwd(), ".vendor/bryntum-scheduler-trial/build/material3-light.css"),
    path.resolve(process.cwd(), "../../.vendor/bryntum-scheduler-trial/build/material3-light.css"),
    path.resolve(process.cwd(), "apps/console/node_modules/@bryntum/scheduler/material3-light.css"),
    path.resolve(process.cwd(), "node_modules/@bryntum/scheduler/material3-light.css"),
    path.resolve(process.cwd(), "../../node_modules/@bryntum/scheduler/material3-light.css"),
  ];
  const themePath = candidates.find(existsSync);
  if (!themePath) {
    return new Response("Bryntum Scheduler trial package is not installed.", { status: 503 });
  }

  return new Response(readFileSync(themePath), {
    headers: {
      "Content-Type": "text/css; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
