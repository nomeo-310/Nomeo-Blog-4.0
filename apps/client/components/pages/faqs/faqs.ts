/**
 * faqs.ts — Nomeo FAQ content.
 *
 * Every answer here is grounded in the published legal documents (Terms of
 * Service, Privacy Policy, Data Protection Policy, Community Guidelines, Cookie
 * Policy). When those documents change, update the matching answers here so the
 * FAQ never drifts from policy.
 *
 * Grouped by category for an accordion UI. The `contact` section on the FAQ
 * page is separate (rendered with id="contact" for the footer's Contact link).
 */

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqCategory {
  id: string;
  title: string;
  description?: string;
  items: FaqItem[];
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  /* ───────────────────────────── Getting started ──────────────────────── */
  {
    id: "getting-started",
    title: "Getting started",
    description: "Accounts, eligibility, and setting up your profile.",
    items: [
      {
        q: "What is Nomeo?",
        a: "Nomeo is a platform for long-form writing where readers and writers share ideas, learn, and connect. Readers can follow creators, save posts, comment, and subscribe; creators can publish posts, host lounges, collaborate, and earn from a shared subscription revenue pool.",
      },
      {
        q: "How old do I have to be to use Nomeo?",
        a: "You must be at least 13 years old. If you're under the age of majority in your country, you may only use Nomeo with the involvement and consent of a parent or legal guardian. Nomeo isn't intended for children under 13, and we don't knowingly collect their data.",
      },
      {
        q: "How do I create an account?",
        a: "You sign up with an email address and password, or through a supported sign-in provider such as Google. After signing up you complete a short onboarding where you choose whether to join as a reader or a creator, pick a username, and add a few profile details.",
      },
      {
        q: "What's the difference between a reader and a creator?",
        a: "Readers can read posts, comment, follow creators, save posts, and subscribe. Creators can do everything a reader can, plus publish posts, host a lounge, collaborate with other creators, and earn from the subscription pool. You choose your role during onboarding.",
      },
      {
        q: "Do I have to provide my gender or date of birth?",
        a: "Gender is optional — there's a \"prefer not to say\" option. Date of birth is used only to confirm you meet the minimum age requirement. These optional details are treated with extra care, and you can leave them out.",
      },
      {
        q: "How do I keep my account secure?",
        a: "You're responsible for keeping your login credentials safe and for activity under your account. If you suspect someone has accessed your account without permission, email support@nomeo.com immediately. We protect accounts with encrypted connections, hashed passwords, and access controls.",
      },
    ],
  },

  /* ──────────────────────── Reading & subscriptions ───────────────────── */
  {
    id: "reading-subscriptions",
    title: "Reading & subscriptions",
    description: "Free and paid posts, plans, billing, and cancellation.",
    items: [
      {
        q: "What's the difference between free and paid posts?",
        a: "Creators choose whether each post is free or paid. Free posts are readable by anyone, including visitors without an account. Paid posts require either an active subscription or available free-read credits.",
      },
      {
        q: "What are free-read credits?",
        a: "New accounts receive a number of complimentary free-read credits for paid posts. Once they're used up, you'll need an active subscription to keep reading paid content. Free-read credits have no cash value and can't be transferred or redeemed.",
      },
      {
        q: "How does billing work?",
        a: "Subscriptions renew automatically at the end of each billing period unless you cancel before renewal. Prices are shown at the point of purchase. We may change prices, but we'll give reasonable notice before any change affects your renewals.",
      },
      {
        q: "Who processes my payment?",
        a: "Payments are handled securely by our payment processor, Paystack. Your use of payment features is also subject to their terms. Nomeo doesn't store full card numbers — we receive only limited information such as transaction status and the last digits of a card.",
      },
      {
        q: "How do I cancel my subscription?",
        a: "You can cancel at any time. Cancelling stops future renewals, and you keep access until the end of your current billing period. Except where required by law, payments are non-refundable.",
      },
      {
        q: "Can I get a refund?",
        a: "Except where required by law, subscription payments are non-refundable. Cancelling ends future charges but doesn't refund the current period — you simply retain access until it ends.",
      },
    ],
  },

  /* ────────────────────────── Writing & earning ───────────────────────── */
  {
    id: "writing-earning",
    title: "Writing & earning",
    description: "Becoming a creator, how earnings work, and payouts.",
    items: [
      {
        q: "How do I become a creator?",
        a: "You can apply to upgrade from a reader to a creator at any time — you don't have to decide permanently at sign-up. Administrative roles (moderator, admin) are assigned by Nomeo only and can't be self-selected.",
      },
      {
        q: "How do creators earn money?",
        a: "Subscription revenue, after Nomeo's platform fee and applicable costs, forms a distributable pool. Each billing period, that pool is shared among creators based on the reading time their content attracted from subscribers, using our current methodology.",
      },
      {
        q: "What do I need to receive payouts?",
        a: "To receive earnings you must be an approved creator in good standing, comply with the Terms, and provide valid payout details. Earnings are estimates until they're finalised at the end of each period. You're responsible for reporting and paying any taxes on what you earn.",
      },
      {
        q: "Can the platform fee or earnings calculation change?",
        a: "Yes. The platform fee percentage and the earnings methodology are set by Nomeo and may change. We'll give reasonable notice of material changes.",
      },
      {
        q: "How do earnings work for co-authored posts?",
        a: "When a post has multiple co-authors, the earnings from it are split among them according to the agreed split. You're responsible for resolving any disputes among co-authors.",
      },
      {
        q: "What happens if someone games the earnings system?",
        a: "Manipulating earnings — using bots, fake accounts, paid engagement, or any scheme to inflate reading time — is strictly prohibited. It can result in forfeited earnings and a ban. We may also withhold, delay, or reverse payouts in cases of suspected fraud, policy violations, or chargebacks.",
      },
      {
        q: "Who owns the content I publish?",
        a: "You keep ownership of your posts, comments, and other content. By posting, you grant Nomeo a worldwide, non-exclusive, royalty-free licence to host, display, distribute, and promote it for running and marketing the Platform. That licence ends when you delete your content, except for copies kept for legal or backup reasons, or already shared or saved by others.",
      },
    ],
  },

  /* ────────────────────────── Lounges & community ─────────────────────── */
  {
    id: "lounges-community",
    title: "Lounges & community",
    description: "Lounges, following, and the rules everyone follows.",
    items: [
      {
        q: "What is a lounge?",
        a: "A lounge is a space a creator hosts for discussion among their subscribers. Lounge hosts are responsible for keeping their spaces within the Community Guidelines. Hosts may set additional reasonable rules, but those can't override the Guidelines.",
      },
      {
        q: "What's expected of everyone on Nomeo?",
        a: "Be respectful — disagree with ideas, not people. Be honest and don't impersonate others. Be original: only publish work you own or have the right to share, and credit your sources. Respect privacy and don't share others' private information without consent.",
      },
      {
        q: "What's not allowed?",
        a: "Harassment and hate speech; threats or glorifying violence; anything that sexualises or endangers minors (zero tolerance); sexually explicit content; illegal or fraudulent activity; spam and manipulation; harmful misinformation; and infringing others' intellectual property. Breaking these rules can lead to removal, warnings, restrictions, suspension, or a permanent ban.",
      },
      {
        q: "How does following work?",
        a: "Following another user may require their acceptance. You must not use following, messaging, or connection features to harass, spam, or abuse others.",
      },
      {
        q: "How do I report something?",
        a: "Use the report feature, or contact support@nomeo.com. Reports are reviewed by our moderation team. Please don't abuse the reporting system with false reports.",
      },
      {
        q: "What if I think a moderation decision was a mistake?",
        a: "You can appeal by contacting support@nomeo.com with your account details and an explanation. We'll review and respond. Enforcement is applied at our discretion, with stronger action for severe or repeated violations.",
      },
    ],
  },

  /* ────────────────────────── Privacy & your data ─────────────────────── */
  {
    id: "privacy-data",
    title: "Privacy & your data",
    description: "What we collect, your rights, and how your data is protected.",
    items: [
      {
        q: "What data does Nomeo collect?",
        a: "Account and profile details, optional sensitive data (pronouns, gender, date of birth), the content you create, payment and payout information, and communications with us. We also collect usage data such as reading time (used to calculate creator earnings) and device/log data. Full details are in the Privacy Policy.",
      },
      {
        q: "Does Nomeo sell my data?",
        a: "No. We don't sell your personal data. We share it only with trusted service providers (such as hosting, email delivery, and payment processing) under agreements that require them to protect it, or where the law requires it.",
      },
      {
        q: "What are my rights over my data?",
        a: "Depending on where you live, you can access, correct, or delete your data; restrict or object to certain processing; receive a copy in a portable format; and withdraw consent where processing relies on it. You can manage much of this in your settings, or email privacy@nomeo.com. You also have the right to complain to your data protection authority — in Nigeria, the Nigeria Data Protection Commission (NDPC).",
      },
      {
        q: "How is my data kept safe?",
        a: "We use encryption in transit, securely hashed passwords, access controls limited to a need-to-know basis, and monitoring with audit logs. No system is perfectly secure, but if a breach affects your data, we'll notify you and the relevant authorities as required by law.",
      },
      {
        q: "Is my data ever processed in other countries?",
        a: "It may be, including where our service providers operate. Where required, we apply appropriate safeguards (such as standard contractual clauses) so your data stays protected to the standard described in our policies.",
      },
      {
        q: "What emails will I receive, and can I opt out?",
        a: "You may receive emails by following a creator or subscribing to our newsletter. You can unsubscribe from non-essential emails at any time using the link in each message or your settings. Essential service emails — like security and billing notices — can't be opted out of while you hold an account.",
      },
    ],
  },

  /* ────────────────────────── Cookies ─────────────────────────────────── */
  {
    id: "cookies",
    title: "Cookies",
    description: "How Nomeo uses cookies and how to control them.",
    items: [
      {
        q: "How does Nomeo use cookies?",
        a: "Cookies keep you signed in and your session secure, remember preferences like theme and language, help us understand usage so we can improve, and support core features such as reading paid content and tracking reading time for creator earnings.",
      },
      {
        q: "What types of cookies are used?",
        a: "Essential cookies (required for authentication and security), preference cookies (your settings), analytics cookies (understanding usage), and payment cookies set by Paystack to process subscriptions securely. We don't use cookies to sell your data or for third-party advertising.",
      },
      {
        q: "Can I control cookies?",
        a: "Yes. You can control non-essential cookies through our cookie settings or your browser. Most browsers let you block or delete cookies — but blocking essential cookies may stop you signing in or using key features.",
      },
    ],
  },

  /* ────────────────────────── Account & deletion ──────────────────────── */
  {
    id: "account-deletion",
    title: "Account & deletion",
    description: "Deleting your account and what happens to your data.",
    items: [
      {
        q: "How do I delete my account?",
        a: "You can stop using Nomeo and delete your account at any time from your settings. When you delete it, it may be recoverable for a limited period — currently 45 days — before permanent removal.",
      },
      {
        q: "What happens to my data after I delete my account?",
        a: "After the 45-day recovery window, deletion is permanent: your personal data is deleted or anonymised, and your content may be removed or anonymised. We keep some records only where we must for legal, tax, accounting, fraud-prevention, or dispute-resolution reasons.",
      },
      {
        q: "Can Nomeo suspend or terminate my account?",
        a: "We may suspend or terminate access if you violate the Terms, create legal risk, or after prolonged inactivity. Some provisions survive termination, including those on content licences, earnings owed, disclaimers, and limitations of liability.",
      },
    ],
  },

  /* ────────────────────────── Legal & policies ────────────────────────── */
  {
    id: "legal",
    title: "Legal & policies",
    description: "Copyright, liability, and the law that governs Nomeo.",
    items: [
      {
        q: "What if content infringes my copyright?",
        a: "Email support@nomeo.com with enough detail to identify your work and the allegedly infringing material. We may remove infringing content and terminate repeat infringers.",
      },
      {
        q: "What law governs Nomeo?",
        a: "These Terms are governed by the laws of the Federal Republic of Nigeria. Disputes are resolved in the courts of Lagos State, Nigeria, unless mandatory law provides otherwise.",
      },
      {
        q: "What is Nomeo's liability if something goes wrong?",
        a: "The Platform is provided \"as is\" without warranties. To the maximum extent permitted by law, Nomeo isn't liable for indirect or consequential damages, and our total liability for any claim won't exceed the greater of what you paid us in the prior 12 months or ₦20,000. Some jurisdictions don't allow certain limitations, so parts of this may not apply to you.",
      },
      {
        q: "How will I know if the policies change?",
        a: "We may update our Terms and policies as the Platform and applicable laws evolve. For material changes, we'll give reasonable notice by email or an in-app notice. Continuing to use Nomeo after changes take effect means you accept the updated terms.",
      },
    ],
  },
];

/** Contact details for the page's Contact section (rendered with id="contact"). */
export const FAQ_CONTACT = {
  supportEmail: "support@nomeo.com",
  privacyEmail: "privacy@nomeo.com",
  company: "Nomeo Consults Inc.",
  address: "21 Akin Soname Street, Ojokoro New Town, Owutu Estate, Ikorodu, Lagos",
};