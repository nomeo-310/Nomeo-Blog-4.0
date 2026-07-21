"use client";

import { AboutHero } from "./about-hero";
import { AboutHowItWorks } from "./about-how-it-works";
import { AboutMission } from "./about-mission";
import { AboutWritersSection } from "./about-writers-section";
import { AboutTeam } from "./about-team";
import { AboutClosing } from "./about-closing";

/**
 * AboutPage — Nomeo's "about" marketing page.
 *
 * Mostly-static sections composed from sibling sub-components in this same
 * folder (about-hero, about-how-it-works, about-mission,
 * about-writers-section, about-team, about-closing); only the writers grid
 * fetches data (see about-writers-section.tsx), which is why it keeps its
 * own "use client" boundary.
 *
 * Component: app-pages/about/about-page.tsx
 * Route:     app/(root)/about/page.tsx
 */
export default function AboutPage() {
  return (
    <div className="w-full bg-background">
      <AboutHero />
      <AboutHowItWorks />
      <AboutMission />
      <AboutWritersSection />
      <AboutTeam />
      <AboutClosing />
    </div>
  );
}
