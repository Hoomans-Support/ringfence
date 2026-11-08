import { redirect } from "next/navigation";

// The control tower became Insights; old links (/control-tower?week=1) land there, week and all.
export default async function ControlTowerRedirect({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  redirect(`/insights?${new URLSearchParams(await searchParams)}`);
}
