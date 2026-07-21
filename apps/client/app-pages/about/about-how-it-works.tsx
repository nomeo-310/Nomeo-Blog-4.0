/** "Read → Talk" two-step explainer with mocked UI previews of each step. */
export function AboutHowItWorks() {
  return (
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
  );
}

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
