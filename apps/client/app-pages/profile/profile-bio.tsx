import { HugeiconsIcon } from "@hugeicons/react";
import { Location01Icon, Briefcase07Icon, Globe02Icon, Calendar03Icon } from "@hugeicons/core-free-icons";
import { CiTwitter as Twitter, CiInstagram as Instagram, CiLinkedin as Linkedin } from "react-icons/ci";
import { SiGithub as Github } from "react-icons/si";
import { formatDate } from "./profile-format";
import type { ProfileData } from "./profile-types";

/** Bio text, occupation/location/joined meta strip, and social links. */
export function ProfileBio({ profile }: { profile: ProfileData }) {
  const hasSocialLinks = Object.values(profile.socialLinks).some(Boolean);

  return (
    <div className="mt-6 border-b border-border pb-6">
      {profile.bio && (
        <p className="max-w-2xl text-sm leading-relaxed text-foreground">{profile.bio}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        {profile.occupation && (
          <span className="inline-flex items-center gap-1.5"><HugeiconsIcon icon={Briefcase07Icon} className="h-3.5 w-3.5" />{profile.occupation}</span>
        )}
        {profile.location && (
          <span className="inline-flex items-center gap-1.5"><HugeiconsIcon icon={Location01Icon} className="h-3.5 w-3.5" />{profile.location}</span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <HugeiconsIcon icon={Calendar03Icon} className="h-3.5 w-3.5" />Joined {formatDate(profile.joinedAt)}
        </span>
      </div>

      {hasSocialLinks && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {profile.socialLinks.website  && <SocialLink href={profile.socialLinks.website} icon={<HugeiconsIcon icon={Globe02Icon} className="h-3.5 w-3.5" />} label="Website" />}
          {profile.socialLinks.twitter  && <SocialLink href={`https://twitter.com/${profile.socialLinks.twitter}`} icon={<Twitter className="h-3.5 w-3.5" />} label="Twitter" />}
          {profile.socialLinks.linkedin && <SocialLink href={profile.socialLinks.linkedin} icon={<Linkedin className="h-3.5 w-3.5" />} label="LinkedIn" />}
          {profile.socialLinks.github   && <SocialLink href={`https://github.com/${profile.socialLinks.github}`} icon={<Github className="h-3.5 w-3.5" />} label="GitHub" />}
          {profile.socialLinks.instagram && <SocialLink href={`https://instagram.com/${profile.socialLinks.instagram}`} icon={<Instagram className="h-3.5 w-3.5" />} label="Instagram" />}
        </div>
      )}
    </div>
  );
}

function SocialLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary">
      {icon}{label}
    </a>
  );
}
