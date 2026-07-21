/** Static intro header for the FAQ page. */
export function FaqHeader() {
  return (
    <header className="mx-auto max-w-4xl pt-16 pb-10 text-center md:pt-24 md:pb-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Help center</p>
      <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight text-foreground md:text-5xl">
        Frequently asked questions
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
        Everything about reading, writing, earning, and how we handle your
        data. Can&apos;t find what you need? Reach us below.
      </p>
    </header>
  );
}
