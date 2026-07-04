"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api } from "@/lib/axios";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Message01Icon, UserMultiple02Icon, PencilEdit01Icon,
  CircleLock02Icon, ArrowRight02Icon, SparklesIcon,
  FavouriteIcon, Globe02Icon, Location01Icon, UserCircle02Icon,
} from "@hugeicons/core-free-icons";
import { Skeleton } from "@/components/ui/skeleton";

export default function AboutPage() {
  return (
    <div className="w-full bg-background">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="relative mx-auto max-w-5xl px-4 pt-20 pb-16 text-center sm:px-6 lg:px-8 md:pt-28 md:pb-24">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">About Nomeo</p>
          <h1 className="mx-auto mt-6 max-w-3xl font-heading text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl">
            The story doesn&apos;t end at the last paragraph.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Nomeo is where writing and conversation live together. Read a piece,
            then step into the lounge beside it — where the people who care about
            the same things are already talking.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/lounges"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Explore the lounges <HugeiconsIcon icon={ArrowRight02Icon} className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >
              Start reading
            </Link>
          </div>
        </div>
      </section>

      {/* ── Read → Talk ──────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="grid md:grid-cols-2">
            <div className="border-b border-border p-8 sm:p-10 md:border-b-0 md:border-r">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-heading text-sm font-bold text-primary">1</span>
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">First, you read</span>
              </div>
              <h3 className="mt-5 font-heading text-xl font-bold text-card-foreground">A story worth talking about</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Writers publish essays, stories, and ideas. You follow the voices you love and never miss a word.
              </p>
              <div className="mt-6 rounded-xl border border-border bg-background p-4">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-primary/15" />
                  <div className="h-2 w-20 rounded-full bg-muted" />
                </div>
                <div className="mt-3 space-y-2">
                  <div className="h-2 w-full rounded-full bg-muted" />
                  <div className="h-2 w-[88%] rounded-full bg-muted" />
                  <div className="h-2 w-[94%] rounded-full bg-muted" />
                </div>
              </div>
            </div>
            <div className="bg-primary/[0.03] p-8 sm:p-10">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-heading text-sm font-bold text-primary">2</span>
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">Then, you talk</span>
              </div>
              <h3 className="mt-5 font-heading text-xl font-bold text-card-foreground">In the lounge beside it</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Every space has a lounge — a real-time room where readers and writers keep the conversation going.
              </p>
              <div className="mt-6 space-y-2 rounded-xl border border-border bg-background p-4">
                <ChatBubble side="left"  name="Ada">So good — the ending floored me.</ChatBubble>
                <ChatBubble side="right" name="You">Right? Didn&apos;t see it coming.</ChatBubble>
                <ChatBubble side="left"  name="Tomi">Re-reading it now 👀</ChatBubble>
              </div>
            </div>
          </div>
        </div>
      </section>

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

      {/* ── Writers grid ─────────────────────────────────────────────────── */}
      <WritersSection />

      {/* ── The people ───────────────────────────────────────────────────── */}
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

      {/* ── Origin note ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 pb-8 text-center sm:px-6 lg:px-8">
        <p className="text-lg font-medium leading-relaxed text-foreground">
          Nomeo started with a simple frustration: the best part of reading something good is talking about
          it — and almost nowhere lets you do both in the same place. So we built a home where the writing
          and the conversation sit side by side.
        </p>
      </section>

      {/* ── Closing ──────────────────────────────────────────────────────── */}
      <section className="px-4 pb-24 sm:px-0">
        <div className="relative w-full overflow-hidden rounded-3xl border border-primary/20 bg-primary/5 px-6 py-14 text-center sm:py-20">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Pull up a seat.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              Read something that moves you, then say so out loud. The conversation is already happening —
              come find your room.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/lounges" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                Browse lounges <HugeiconsIcon icon={ArrowRight02Icon} className="h-4 w-4" />
              </Link>
              <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent">
                Explore writing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── Writers section ──────────────────────────────────────────────────────── */

interface Writer {
  username:       string;
  displayName:    string;
  bio?:           string;
  avatar?:        string;
  followersCount: number;
}

function WritersSection() {
  const { data, isLoading } = useQuery<{ writers: Writer[] }>({
    queryKey:  ["about-writers"],
    queryFn:   () => api.get("/api/writers").then(r => r.data),
    staleTime: 60 * 60 * 1000,
  });

  const writers = data?.writers ?? [];
  if (!isLoading && writers.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
      <div className="mb-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Community</p>
        <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Meet the writers
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          The voices that make Nomeo worth reading. Hover a card to learn more,
          click to visit their profile.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <WriterCardSkeleton key={i} />)
          : writers.map((w, i) => (
              <motion.div
                key={w.username}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
              >
                <FlipCard writer={w} />
              </motion.div>
            ))
        }
      </div>

      {!isLoading && writers.length > 0 && (
        <div className="mt-10 text-center">
          <Link
            href="/writers"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
          >
            Browse all writers
            <HugeiconsIcon icon={ArrowRight02Icon} className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
}

/* ── Flip card ────────────────────────────────────────────────────────────── */

function FlipCard({ writer }: { writer: Writer }) {
  const [flipped, setFlipped] = useState(false);
  const initials = (writer.displayName || writer.username)
    .split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    /* Perspective wrapper — required for 3D flip */
    <div
      className="h-52 cursor-pointer"
      style={{ perspective: "1000px" }}
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      onClick={() => setFlipped(f => !f)} // touch support
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* ── Front — avatar, name, username, followers ── */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-5 text-center"
          style={{ backfaceVisibility: "hidden" }}
        >
          {writer.avatar ? (
            <Image
              src={writer.avatar}
              alt={writer.displayName || writer.username}
              width={56} height={56}
              className="h-14 w-14 rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 font-heading text-lg font-bold text-primary ring-2 ring-border">
              {initials}
            </span>
          )}
          <div className="min-w-0 w-full">
            <p className="truncate font-heading text-sm font-bold text-foreground">
              {writer.displayName || writer.username}
            </p>
            <p className="truncate text-xs text-muted-foreground">@{writer.username}</p>
          </div>
          <p className="text-xs font-semibold text-primary">
            {formatFollowers(writer.followersCount)}
          </p>
          <p className="text-[10px] text-muted-foreground/50">Hover to learn more</p>
        </div>

        {/* ── Back — bio + visit profile button ── */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl border border-primary/30 bg-primary/[0.04] p-5 text-center"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <HugeiconsIcon icon={UserCircle02Icon} className="h-7 w-7 text-primary/60" />
          <div className="min-w-0 w-full">
            <p className="truncate font-heading text-sm font-bold text-foreground">
              {writer.displayName || writer.username}
            </p>
            {writer.bio ? (
              <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                {writer.bio}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground/60 italic">No bio yet.</p>
            )}
          </div>
          <Link
            href={`/@${writer.username}`}
            onClick={e => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            View profile <HugeiconsIcon icon={ArrowRight02Icon} className="h-3 w-3" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Writer card skeleton ─────────────────────────────────────────────────── */

function WriterCardSkeleton() {
  return (
    <div className="flex h-52 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-5">
      <Skeleton className="h-14 w-14 rounded-full" />
      <div className="w-full space-y-1.5">
        <Skeleton className="mx-auto h-3.5 w-28 rounded" />
        <Skeleton className="mx-auto h-3 w-20 rounded" />
      </div>
      <Skeleton className="h-3 w-16 rounded" />
    </div>
  );
}

function formatFollowers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k followers`;
  return `${n} ${n === 1 ? "follower" : "followers"}`;
}

/* ── Team ─────────────────────────────────────────────────────────────────── */

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

/* ── Shared bits ──────────────────────────────────────────────────────────── */

function ChatBubble({ side, name, children }: { side: "left" | "right"; name: string; children: React.ReactNode }) {
  const mine = side === "right";
  return (
    <div className={mine ? "flex flex-col items-end" : "flex flex-col items-start"}>
      <span className="mb-0.5 px-1 text-[10px] font-semibold text-muted-foreground">{name}</span>
      <div className={
        "max-w-[85%] px-3 py-1.5 text-xs leading-snug " +
        (mine ? "rounded-2xl rounded-tr-md bg-primary text-primary-foreground" : "rounded-2xl rounded-tl-md bg-muted text-foreground")
      }>
        {children}
      </div>
    </div>
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