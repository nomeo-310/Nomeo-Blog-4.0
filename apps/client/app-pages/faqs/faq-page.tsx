"use client";

import { useState } from "react";
import { FAQ_CATEGORIES } from "./faqs";
import { FaqHeader } from "./faq-header";
import { FaqCategoryNav } from "./faq-category-nav";
import { FaqAccordion } from "./faq-accordion";
import { FaqContact } from "./faq-contact";

/**
 * FAQ page — Nomeo.
 *
 * Matches the app design (forest-green tokens, Quicksand body / Urbanist
 * headings, container layout). Two parts:
 *   1. FAQ accordion grouped by category (built from scratch, animated)
 *   2. Contact form (id="contact") that posts to /api/contact → nodemailer
 *
 * Layout is composed from sibling sub-components in this same folder
 * (faq-header, faq-category-nav, faq-accordion, faq-contact →
 * faq-contact-form); this file owns the category/accordion state only.
 *
 * The accordion animates height via grid-template-rows (0fr → 1fr), which is
 * the cleanest way to animate to auto height without measuring.
 */

export default function FaqPage() {
  const [activeId, setActiveId] = useState(FAQ_CATEGORIES[0].id);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const active = FAQ_CATEGORIES.find((c) => c.id === activeId) ?? FAQ_CATEGORIES[0];

  const selectCategory = (id: string) => {
    setActiveId(id);
    setOpenIndex(null); // collapse everything when switching category
  };

  const toggleQuestion = (i: number) => {
    setOpenIndex((cur) => (cur === i ? null : i));
  };

  return (
    <div className="w-full bg-background">
      <div>
        <FaqHeader />

        {/* ── Tabbed FAQ: category rail (left) + questions (right) ─────── */}
        <div className="pb-20">
          <div className="grid gap-8 md:grid-cols-[260px_1fr] md:gap-10">
            <FaqCategoryNav categories={FAQ_CATEGORIES} activeId={activeId} onSelect={selectCategory} />
            <FaqAccordion category={active} openIndex={openIndex} onToggle={toggleQuestion} />
          </div>
        </div>

        {/* ── Contact ─────────────────────────────────────────────────── */}
        <FaqContact />
      </div>
    </div>
  );
}
