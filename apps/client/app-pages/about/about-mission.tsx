import { HugeiconsIcon } from "@hugeicons/react";
import {
  Message01Icon, UserMultiple02Icon, PencilEdit01Icon,
  CircleLock02Icon, SparklesIcon, FavouriteIcon, Globe02Icon,
} from "@hugeicons/core-free-icons";

/** Mission block: what Nomeo is, the reader/writer value props, and core beliefs. */
export function AboutMission() {
  return (
    <>
      {/* ── What Nomeo is ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          A home for writers and the people who read them.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Most platforms stop at publishing. Nomeo treats the conversation as part of the work. You can follow
          a writer, connect with other readers, send a message, and join the lounge where it all keeps going —
          open rooms for everyone, and members-only lounges run by the writers themselves. Built in Lagos, for
          readers and writers everywhere.
        </p>
      </section>

      {/* ── For readers / For writers ────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="h-full">
            <AudienceCard
              label="For readers"
              title="Find the voices, join the room."
              points={[
                { icon: <HugeiconsIcon icon={FavouriteIcon}      className="h-4 w-4" />, text: "Follow writers you love and keep up with every new piece." },
                { icon: <HugeiconsIcon icon={UserMultiple02Icon} className="h-4 w-4" />, text: "Connect with other readers and message them directly." },
                { icon: <HugeiconsIcon icon={Message01Icon}      className="h-4 w-4" />, text: "Step into lounges and talk about the ideas that move you." },
              ]}
            />
          </div>
          <div className="h-full">
            <AudienceCard
              label="For writers"
              title="Publish, gather, and grow your circle."
              points={[
                { icon: <HugeiconsIcon icon={PencilEdit01Icon} className="h-4 w-4" />, text: "Write and publish to readers who actually show up." },
                { icon: <HugeiconsIcon icon={CircleLock02Icon} className="h-4 w-4" />, text: "Run members-only lounges and choose who joins the conversation." },
                { icon: <HugeiconsIcon icon={SparklesIcon}     className="h-4 w-4" />, text: "Turn readers into a community that sticks around." },
              ]}
              accent
            />
          </div>
        </div>
      </section>

      {/* ── What we believe ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">What we believe</h2>
        </div>
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {[
            { icon: <HugeiconsIcon icon={Message01Icon} className="h-5 w-5" />, title: "Conversation is part of the work", body: "A piece of writing is the start of something, not the end. The talk it sparks is worth keeping." },
            { icon: <HugeiconsIcon icon={FavouriteIcon} className="h-5 w-5" />, title: "Writers come first",               body: "The people who make the work should own their audience and the rooms they build around it." },
            { icon: <HugeiconsIcon icon={Globe02Icon}   className="h-5 w-5" />, title: "Built for everywhere",             body: "From Lagos to anywhere — good writing and real conversation don't need a passport." },
          ].map((b) => (
            <div key={b.title} className="h-full"><Belief icon={b.icon} title={b.title} body={b.body} /></div>
          ))}
        </div>
      </section>
    </>
  );
}

function AudienceCard({ label, title, points, accent }: {
  label: string; title: string;
  points: { icon: React.ReactNode; text: string }[];
  accent?: boolean;
}) {
  return (
    <div className={
      "flex h-full flex-col rounded-2xl border p-7 " +
      (accent ? "border-primary/20 bg-primary/[0.03]" : "border-border bg-card")
    }>
      <span className="text-xs font-semibold uppercase tracking-widest text-primary">{label}</span>
      <h3 className="mt-2 font-heading text-xl font-bold text-card-foreground">{title}</h3>
      <ul className="mt-5 space-y-3.5">
        {points.map((p, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{p.icon}</span>
            <span className="text-sm leading-relaxed text-muted-foreground">{p.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Belief({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="h-full rounded-2xl border border-border bg-card p-6 transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <h3 className="mt-4 font-heading text-base font-bold text-card-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
