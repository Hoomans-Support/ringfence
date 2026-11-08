export const runtime = "nodejs";

export async function GET(request: Request) {
  const apiUrl = process.env.RINGFENCE_API_URL;
  const apiKey = process.env.RINGFENCE_MCP_KEY;
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("run_id");
  const ringId = searchParams.get("ring_id");
  if (!apiUrl || !apiKey) return Response.json({ error: "Ring Watch is not configured." }, { status: 503 });
  if (!runId || !ringId) return Response.json({ error: "run_id and ring_id are required." }, { status: 400 });

  const url = new URL(`${apiUrl.replace(/\/$/, "")}/v1/rings/${encodeURIComponent(ringId)}`);
  url.searchParams.set("run_id", runId);
  // 65s covers the API waking from Render's free-plan sleep (about a minute); past that, or on a
  // network error, Ring Watch says the live API is unavailable instead of this route crashing.
  const response = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store", signal: AbortSignal.timeout(65_000) }).catch(() => null);
  if (!response) return Response.json({ error: "The live API didn't answer." }, { status: 502 });
  return new Response(await response.text(), { status: response.status, headers: { "Content-Type": response.headers.get("content-type") ?? "application/json", "Cache-Control": "no-store" } });
}
