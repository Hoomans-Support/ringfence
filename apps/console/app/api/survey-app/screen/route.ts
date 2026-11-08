import { existsSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";

export const runtime = "nodejs";
const configuredMaxCalls = Number(process.env.SURVEY_APP_MAX_CALLS ?? 20);
const MAX_CALLS = Number.isFinite(configuredMaxCalls) && configuredMaxCalls > 0 ? configuredMaxCalls : 20;
let calls = 0;

export async function POST() {
  const apiUrl = process.env.RINGFENCE_API_URL;
  const apiKey = process.env.RINGFENCE_SURVEY_API_KEY;
  if (!apiUrl || !apiKey) return Response.json({ error: "Survey app screening is not configured on this console." }, { status: 503 });
  if (calls >= MAX_CALLS) return Response.json({ error: "Survey app screening has used this server's call budget for now." }, { status: 429 });
  calls++;

  try {
    const fixturePath = [
      path.resolve(process.cwd(), "fixtures/surveyapp.json"),
      path.resolve(process.cwd(), "../../fixtures/surveyapp.json"),
    ].find(existsSync);
    if (!fixturePath) throw new Error("surveyapp fixture is missing");
    const body = JSON.parse(readFileSync(fixturePath, "utf8")) as { sender_batch_header: { sender_batch_id: string }; items: unknown[] };
    body.sender_batch_header.sender_batch_id = `survey_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const response = await fetch(`${apiUrl.replace(/\/$/, "")}/v1/screen`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok) return Response.json({ error: "The Ringfence API could not screen this run.", detail: result }, { status: response.status });
    return Response.json({ ...result, run_id: body.sender_batch_header.sender_batch_id }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Could not read the survey-app fixture or reach the Ringfence API." }, { status: 502 });
  }
}
