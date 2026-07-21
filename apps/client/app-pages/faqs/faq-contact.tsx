import { Mail01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { FAQ_CONTACT } from "./faqs";
import { FaqContactForm } from "./faq-contact-form";

/** Contact section (id="contact") — intro + direct emails on the left, the contact form on the right. */
export function FaqContact() {
  return (
    <section id="contact" className="scroll-mt-24 border-t border-border py-16 md:py-24">
      <div className="mx-auto grid gap-12 md:grid-cols-2">
        {/* Left: invitation + direct emails */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Contact</p>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground">
            Still have a question?
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
            Send us a message and we&apos;ll get back to you. Pick the topic that
            fits best so it reaches the right people faster.
          </p>

          <div className="mt-8 space-y-4">
            <DirectEmail label="General & support" email={FAQ_CONTACT.supportEmail} />
            <DirectEmail label="Privacy & your data" email={FAQ_CONTACT.privacyEmail} />
          </div>

          <div className="mt-8 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{FAQ_CONTACT.company}</p>
            <p className="mt-1 max-w-xs leading-relaxed">{FAQ_CONTACT.address}</p>
          </div>
        </div>

        {/* Right: the form */}
        <FaqContactForm />
      </div>
    </section>
  );
}

function DirectEmail({ label, email }: { label: string; email: string }) {
  return (
    <a
      href={`mailto:${email}`}
      className="flex items-center gap-3 text-sm transition-colors group"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors group-hover:border-primary/40 group-hover:text-primary">
        <HugeiconsIcon icon={Mail01Icon} className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="block font-medium text-foreground group-hover:text-primary">{email}</span>
      </span>
    </a>
  );
}
