import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl p-16">
      <h1 className="text-[32px] font-semibold tracking-[-0.03em]">Ringfence</h1>
      <p className="mt-2 text-[17px] leading-[1.55] text-rf-slate">
        Pay the real ones. Hold the ring. Running on fixture data — see{" "}
        <code className="font-mono">fixtures/week1.json</code>.
      </p>
      <Link
        href="/review"
        className="mt-6 inline-block rounded-full bg-rf-ink px-5 py-2.5 text-sm font-semibold text-rf-white"
      >
        Open the review queue →
      </Link>
    </main>
  );
}
