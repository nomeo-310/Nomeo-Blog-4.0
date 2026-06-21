/**
 * build-bio.ts — deterministic, template-based bio generator.
 * -----------------------------------------------------------
 * Assembles profile bios by dynamically weaving multiple structured answers together.
 * Hand-tailored variations ensure details don't look repetitive or identical.
 */

export type BioStyle = "professional" | "friendly" | "witty" | "minimal" | "storyteller";

export interface BioInput {
  style:           BioStyle;
  occupation?:     string;
  interests?:      string[];   
  likes?:          string[];   
  dislikes?:       string[];   
  personalTouch?:  string;     
  aspirations?:    string[];   
  hopeForFuture?:  string;     
  favoriteQuote?:  string;     
  extra?:          string;     
  intent?:         "reader" | "writer";
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

const lower = (s?: string) => (s ? s.trim().toLowerCase() : "");
const cap   = (s: string)  => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function naturalList(items: string[], max = 3): string {
  if (!items || !items.length) return "";
  const list = items.map(i => i.trim()).filter(Boolean).slice(0, max);
  if (!list.length)     return "";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

function clamp(s: string, max = 500): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

/* ── Generator ──────────────────────────────────────────────────────────── */

export function buildBios(input: BioInput): string[] {
  const occ         = lower(input.occupation);
  const touch       = lower(input.personalTouch);
  const hope        = input.hopeForFuture?.trim();
  const quote       = input.favoriteQuote?.trim();
  const extra       = input.extra?.trim();
  const isWriter    = input.intent === "writer";

  // Build cleanly separated listing variables
  const topics      = naturalList(input.interests ?? []);
  const enjoyList   = naturalList(input.likes ?? []);
  const avoidList   = naturalList(input.dislikes ?? []);
  const aspireStr   = naturalList(input.aspirations ?? []);
  
  const writeVerb   = isWriter ? "writing about" : "reading about";
  const doVerb      = isWriter ? "writing" : "reading";

  const bios: string[] = [];

  // Helper formatting values for clean interpolation
  const cleanQuote = quote ? `"${quote.replace(/[".]/g, "")}"` : "";
  const cleanHope  = hope ? hope.replace(/^a world where\s+/i, "").replace(/\.$/, "") : "";

  switch (input.style) {

    /* ── Professional ──────────────────────────────────────────────── */
    case "professional": {
      // Composition 1: Timeline Forward (Title -> Interests -> Goals -> Hopes)
      let b1 = occ ? `${cap(occ)}` : "Professional";
      if (topics) b1 += ` specializing in ${topics}`;
      if (touch) b1 += `, operating as a natural ${touch}`;
      b1 += ".";
      if (aspireStr) b1 += ` Driven by a mission to ${aspireStr}.`;
      if (cleanHope) b1 += ` Dedicated to building an ecosystem where ${cleanHope.toLowerCase()}.`;
      if (cleanQuote) b1 += ` Guided by the ethos: ${cleanQuote}.`;
      if (extra) b1 += ` ${cap(extra)}`;
      bios.push(clamp(b1));

      // Composition 2: Core Philosophy First (Quote -> Work Ethics -> Preferences)
      let b2 = cleanQuote ? `${cleanQuote} — that's the standard. ` : "";
      b2 += occ ? `${cap(occ)}` : "Result-oriented professional";
      if (enjoyList) b2 += ` highly passionate about exploring ${enjoyList}`;
      if (avoidList) b2 += `, maintaining a productive focus strictly free from ${avoidList}`;
      b2 += ".";
      if (aspireStr) b2 += ` Currently executing goals to ${aspireStr}.`;
      if (extra) b2 += ` ${cap(extra)}`;
      bios.push(clamp(b2));
      break;
    }

    /* ── Friendly ──────────────────────────────────────────────────── */
    case "friendly": {
      // Composition 1: Interactive & Conversational
      let b1 = "Hey there! 👋 ";
      if (occ) b1 += `I'm a ${occ}, but `;
      b1 += `I spend a ton of my time ${writeVerb} ${topics || "cool topics"}.`;
      if (touch) b1 += ` Around here, I'm known as a huge ${touch}.`;
      if (enjoyList) b1 += ` Outside of work, I really love ${enjoyList}.`;
      if (cleanHope) b1 += ` I genuinely dream of a world where ${cleanHope.toLowerCase()}.`;
      if (cleanQuote) b1 += ` My absolute favorite reminder is: ${cleanQuote}.`;
      if (extra) b1 += ` ${cap(extra)}`;
      bios.push(clamp(b1));

      // Composition 2: Ambition & Lifestyle Blend
      let b2 = `On a huge journey to ${aspireStr || "learn, connect, and swap great ideas"}.`;
      if (topics) b2 += ` Right now, I'm exploring all things ${topics}.`;
      if (avoidList) b2 += ` Keeping my circle positive and totally clear of ${avoidList}!`;
      if (extra) b2 += ` ${cap(extra)}`;
      bios.push(clamp(b2));
      break;
    }

    /* ── Witty ─────────────────────────────────────────────────────── */
    case "witty": {
      // Composition 1: Sharp Contrast Layout
      let b1 = "";
      if (occ && touch) b1 += `${cap(occ)} fueled completely by my inner ${touch}. `;
      else if (touch) b1 += `Part-time ${touch}, full-time thinker. `;
      else b1 += "An open book with structural layers. ";
      
      if (topics) b1 += `Regularly caught ${doVerb} about ${topics}. `;
      if (aspireStr) b1 += `Currently organizing plans to successfully ${aspireStr}. `;
      if (cleanQuote) b1 += ` Basically living out the phrase: ${cleanQuote}.`;
      if (extra) b1 += ` ${cap(extra)}`;
      bios.push(clamp(b1));

      // Composition 2: Preference Filter
      let b2 = `Highly responsive to ${enjoyList || "good designs"} and actively allergic to ${avoidList || "clunky updates"}.`;
      if (cleanHope) b2 += ` Honestly just hoping for a future where ${cleanHope.toLowerCase()}.`;
      if (extra) b2 += ` ${cap(extra)}`;
      bios.push(clamp(b2));
      break;
    }

    /* ── Minimal ───────────────────────────────────────────────────── */
    case "minimal": {
      const segments: string[] = [
        occ && cap(occ),
        topics && `Involved in ${topics}`,
        touch && cap(touch),
        aspireStr && `Aiming to ${aspireStr}`,
      ].filter(Boolean) as string[];

      let b1 = segments.length ? segments.join(" · ") + "." : "Explorer.";
      if (enjoyList) b1 += ` Driven by ${enjoyList}.`;
      if (cleanQuote) b1 += ` ${cleanQuote}.`;
      if (extra) b1 += ` ${cap(extra)}`;
      bios.push(clamp(b1));
      break;
    }

    /* ── Storyteller ───────────────────────────────────────────────── */
    case "storyteller": {
      let b1 = occ ? `${cap(occ)} by trade, ` : "A curious spirit ";
      b1 += `drawn toward exploring deep concepts in ${topics || "unmapped spaces"}.`;
      if (touch) b1 += ` I process the world through the eyes of a ${touch}.`;
      if (aspireStr) b1 += ` Ultimately, my paths are all leading me to ${aspireStr}.`;
      if (cleanHope) b1 += ` Everything points toward a landscape where ${cleanHope.toLowerCase()}.`;
      if (cleanQuote) b1 += ` As the old wisdom goes: ${cleanQuote}.`;
      if (extra) b1 += ` ${cap(extra)}`;
      bios.push(clamp(b1));
      break;
    }
  }

  // Deduplicate arrangements
  const seen = new Set<string>();
  const out:  string[] = [];
  for (const b of bios) {
    const clamped = clamp(b, 1000);
    const key     = clamped.toLowerCase().trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(clamped);
    }
    if (out.length === 4) break;
  }

  // Static Fallback
  if (out.length === 0) {
    out.push(isWriter ? "Writing, reading, and capturing structural stories." : "Here to read, follow, and discover new perspectives.");
  }

  return out;
}