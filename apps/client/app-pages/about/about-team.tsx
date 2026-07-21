import { HugeiconsIcon } from "@hugeicons/react";
import { Location01Icon } from "@hugeicons/core-free-icons";

/** "The people behind Nomeo" — static team grid. */
export function AboutTeam() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20">
      <div className="mb-3 text-center">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
          <HugeiconsIcon icon={Location01Icon} className="h-3.5 w-3.5" /> Made in Lagos
        </span>
      </div>
      <h2 className="text-center font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
        The people behind Nomeo
      </h2>
      <p className="mx-auto mt-6 mb-8 max-w-2xl text-center text-base leading-relaxed text-muted-foreground">
        A small, independent team building from Lagos under Nomeo Consults Inc. — shipping carefully, and
        listening to the writers and readers who make this place what it is.
      </p>
      <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {TEAM.map((m) => (
          <div key={m.name} className="h-full"><TeamCard member={m} /></div>
        ))}
      </div>
    </section>
  );
}

const TEAM: { name: string; role: string; blurb: string; lead?: boolean }[] = [
  { name: "Salomi Onome",    role: "Founder & Developer", blurb: "Started Nomeo to put writing and conversation in the same room. Builds the platform end to end.", lead: true },
  { name: "Chidinma Okafor", role: "Product Manager",     blurb: "Shapes what gets built and why, keeping the writer and reader experience at the centre." },
  { name: "Adebayo Ogunleye",role: "UI/UX Designer",      blurb: "Designs the calm, warm spaces where Nomeo's conversations happen." },
  { name: "Ngozi Eze",       role: "Assistant Developer",  blurb: "Builds and ships features across the stack, from lounges to messages." },
];

function TeamCard({ member }: { member: typeof TEAM[number] }) {
  const initials = member.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={
      "flex h-full flex-col rounded-2xl border p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-md " +
      (member.lead ? "border-primary/30 bg-primary/[0.03] hover:border-primary/50" : "border-border bg-card hover:border-primary/40")
    }>
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-base font-bold text-primary">
          {initials}
        </span>
        <div className="min-w-0">
          <h3 className="truncate font-heading text-base font-bold text-card-foreground">{member.name}</h3>
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-primary">{member.role}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{member.blurb}</p>
    </div>
  );
}
