/** Static hero header — title + supporting copy for the membership page. */
export function MembershipHeader() {
  return (
    <header className="mx-auto max-w-3xl pt-16 pb-12 text-center md:pt-20 md:pb-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Membership</p>
      <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight text-foreground md:text-5xl">
        Read without limits.
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
        You can read free posts and a few paid ones on us. Become a member
        for unlimited access — and to support the writers you love through
        the earnings pool.
      </p>
    </header>
  );
}
