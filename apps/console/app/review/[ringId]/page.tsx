import { redirect } from "next/navigation";

// A ring's own page became the case view inside Decisions (graph, case file and Bryntum timeline);
// old links (/review/R-01?week=1) land on the same case there.
export default async function RingRedirect({ params, searchParams }: { params: Promise<{ ringId: string }>; searchParams: Promise<{ week?: string }> }) {
  const [{ ringId }, { week }] = await Promise.all([params, searchParams]);
  redirect(`/review?week=${week ?? "1"}&case=${encodeURIComponent(ringId)}`);
}
