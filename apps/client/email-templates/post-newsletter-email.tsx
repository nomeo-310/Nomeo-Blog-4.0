import { Img, Section, Text } from "@react-email/components";
import { EmailLayout, Heading, Paragraph, CtaButton, BRAND } from "./components";

/**
 * Post Newsletter Email — sent to followers when a creator publishes
 * with sendAsNewsletter = true. Also reused for new-post alerts.
 *
 * Sent as: `"<CreatorName> via Nomeo" <newsletter@nomeo.com>`
 * Always includes the unsubscribe link (it toggles the recipient's
 * Setting.notifications.emailNewPost preference).
 */

export type postNewsletterEmailProps = {
  creatorName?: string;
  postTitle?: string;
  excerpt?: string;
  coverImageUrl?: string;
  postUrl?: string;
  readingTime?: number;
  unsubscribeUrl?: string;  
}

export default function PostNewsletterEmail({ creatorName = "A creator", postTitle = "An interesting new post", excerpt = "Here's a preview of what this post covers...", coverImageUrl, postUrl = BRAND.url, readingTime, unsubscribeUrl = `${BRAND.url}/settings/notifications` }: postNewsletterEmailProps) {
  
  return (
    <EmailLayout preview={`${creatorName} just published: ${postTitle}`} unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 13, color: "#6b7280", margin: "16px 0 4px", textTransform: "uppercase" as const, letterSpacing: 1 }}>
        New from {creatorName}
      </Text>

      <Heading>{postTitle}</Heading>

      {coverImageUrl && (
        <Section style={{ margin: "0 0 20px" }}>
          <Img
            src={coverImageUrl}
            alt={postTitle}
            width={504}
            style={{ borderRadius: 8, width: "100%", height: "auto" }}
          />
        </Section>
      )}

      <Paragraph>{excerpt}</Paragraph>

      {readingTime && <Paragraph muted>{readingTime} min read</Paragraph>}

      <CtaButton href={postUrl}>Read on {BRAND.name}</CtaButton>

      <Paragraph muted>
        You're receiving this because you follow {creatorName} on {BRAND.name}.
      </Paragraph>
    </EmailLayout>
  );
}