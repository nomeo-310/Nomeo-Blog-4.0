# Nomeo Blog 3.0

A full-stack long-form blogging platform built with Next.js 15, MongoDB, and Better Auth. Nomeo 3.0 is a ground-up rewrite of version 2.0 with a completely new feature set — real-time messaging, creator monetisation, private communities (lounges), co-authorship, and a secure admin console.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Authentication](#authentication)
- [Database](#database)
- [Real-time](#real-time)
- [Payments](#payments)
- [Media Uploads](#media-uploads)
- [Admin Console](#admin-console)
- [Deployment](#deployment)

---

## Overview

Nomeo is a platform for long-form writing — think Substack meets Medium, built for the African creator economy. Readers discover and follow writers, subscribe to the platform for access to paid content, and join private writer communities called lounges. Creators publish posts, earn from the subscription pool, and manage their audience from a dedicated dashboard.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, React 19) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | MongoDB + Mongoose |
| Auth | Better Auth (email/password + Google OAuth) |
| Real-time | Ably (presence, lounge chat, notifications) |
| Payments | Paystack |
| Media | Cloudinary (images with crop/upload) |
| State | Zustand (panels, modals) + TanStack Query (server state) |
| Animations | Framer Motion |
| Email | OTP via Better Auth |
| Deployment | Vercel |

---

## Features

### Auth & Onboarding
- Email/password sign-up with OTP email verification
- Google OAuth via Better Auth
- Three-step forgot-password flow (email → OTP → new password)
- Multi-step onboarding modal (intent → profile → details → interests → done)
- AI-assisted bio builder during onboarding
- Account banning via session hook — banned users are blocked at session creation
- Global auth singleton pattern (`global.__betterAuth`) survives Next.js hot reload in development

### Posts
- Rich text editor (Tiptap) with text alignment, highlights, images, lists, code blocks
- Free and paid (members-only) access tiers
- Series support — ordered sequences of related posts with prev/next navigation
- View tracking — deduplicated per session via `sessionStorage`
- Free credit system — non-subscribers get a limited number of paid reads
- Like, save, share (modal with Twitter/X, Facebook, WhatsApp, Email, copy link)
- Floating sidebar action pill (like, save, comments scroll, share) on desktop
- Related posts — fetched by category/tag match, shown below article content
- SEO-optimised metadata (`og:type: article`, `twitter:card: summary_large_image`, canonical URLs, keywords from tags)
- Co-authorship — creators can invite other creators; accepted co-authors appear on the byline
- Post moderation — soft delete with `isRemoved` flag

### Reader Experience
- Home feed with post cards, pagination, category filters
- Search page — spotlight-style with result preview panel, filter pills (All / Posts / Writers / Tags / Lounges), live results
- Popular topics — fetched from DB, cached in MongoDB for 10 minutes, refreshed automatically
- Tag search returns actual posts (not abstract topic pages)
- Saved posts dashboard
- Liked posts dashboard
- Profile pages with bio, cover image, social links, post list

### Creator Tools
- Creator application flow — readers apply to become creators with motivation, topics, portfolio links
- Dashboard: overview, posts, earnings, subscribers (lounge members), connections, notifications, settings
- Earnings page with revenue breakdown and creator earning model
- Subscribers page — shows accepted lounge members (the creator's closest community), not generic followers
- Post editor with cover image upload, tags, category, series assignment, co-author invites, access tier

### Connections & Social
- Follow/unfollow system (social graph via `followings` collection)
- Connection requests with accept/decline
- Followers and following tabs with search and direct message button
- Activity panel (slide-in from right) with tabs:
  - Notifications — mark read, mark all read, select multiple
  - Connections — accept/decline requests, bulk actions
  - Co-author — accept/decline post co-author invitations
  - Lounge (creators only) — approve/decline lounge join requests

### Lounges (Private Communities)
- Creators create private lounges with name, description, cover image, access rules
- Readers request to join; creators approve/decline from the activity panel
- Real-time lounge chat via Ably — presence indicators, message editing, reactions
- Lounge member management
- Join request cooldown on decline

### Direct Messages
- DM conversations between connected users
- Real-time message delivery via Ably
- Message editing and deletion
- Conversation panel accessible from anywhere in the app

### Notifications
- In-app real-time notifications via Ably
- Types: new follower, follow request, comment, comment reply, new post, lounge activity, lounge mention, co-author invite, lounge join approved/declined, system announcements
- Notification preferences per type (email + push), with sensible defaults seeded on first load
- Full notifications page in dashboard

### Payments & Subscriptions
- Paystack integration — initiate, verify, webhook
- Subscription plans with monthly/annual billing
- Payment history page — status filter (success/pending/failed/abandoned/reversed), pagination, stat cards
- Creator earnings derived from subscription pool

### Settings
- Profile settings — avatar upload with crop, cover image, display name, pronouns, bio (with AI builder), about, location, occupation, social links
- Live profile preview while editing
- Notification preferences — email + push toggles, all seeded with sensible defaults
- Appearance — theme (light/dark/system), reading font size
- Account — email display, change password (credential users), OAuth provider display (Google users), creator application section, delete account
- `dataUpdatedAt`-keyed sync so saved images and form data always reflect the latest server state after save

### Admin Console
- Separate `/admin` route group
- Three-factor login: email + password + seed phrase (12–16 words)
- Audit logging
- Role-based access (`admin`, `super_admin`)

---

## Project Structure

```
app/
├── (main)/               # Public-facing routes (home, post, profile, search, lounges)
├── dashboard/            # Authenticated creator/reader dashboard
│   ├── posts/
│   ├── earnings/
│   ├── subscribers/
│   ├── connections/
│   ├── notifications/
│   ├── payments/
│   ├── saved/
│   ├── liked/
│   └── settings/
├── admin/                # Admin console (separate auth)
│   └── login/
├── api/                  # API route handlers
│   ├── auth/
│   ├── posts/
│   ├── profile/
│   ├── settings/
│   ├── connections/
│   ├── lounges/
│   ├── lounge-join-requests/
│   ├── notifications/
│   ├── payments/
│   ├── plans/
│   ├── search/
│   │   └── trending-tags/
│   ├── coauthor-invites/
│   ├── creator-application/
│   └── admin/
├── onboarding/
└── messages/

components/
├── auth/                 # AuthModal, OnboardingModal, ImageCropper, BioBuilderDialog
├── features/             # DashboardLayout, ActivityPanel, ConversationsPanel
├── pages/                # PostPage, ProfilePage, SearchPage, etc.
└── ui/                   # shadcn base components + Modal, PostEditor

hooks/                    # useActivity, useSearch, useLounge, usePayments, etc.
lib/                      # auth.ts, connect-to-database.ts, ably-registry.ts, session.ts
models/                   # Mongoose schemas
services/                 # PaymentService, PostAccessService, OnboardingService
stores/                   # Zustand stores (activity panel, conversations panel, modal)
```

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/your-org/nomeo-blog-3.0.git
cd nomeo-blog-3.0

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Fill in .env.local (see Environment Variables below)

# Run in development
pnpm dev
```

---

## Environment Variables

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb+srv://...

# Better Auth
BETTER_AUTH_SECRET=<random 32+ char string — generate with: openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Ably (real-time)
ABLY_API_KEY=
NEXT_PUBLIC_ABLY_API_KEY=

# Cloudinary (media uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Paystack (payments)
PAYSTACK_SECRET_KEY=
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=

# Admin (seed phrase auth)
ADMIN_SEED_PHRASE_HASH=
```

> **Note:** `BETTER_AUTH_SECRET` must be a stable value — never generate it dynamically at runtime. Changing it invalidates all existing sessions.

---

## Authentication

Nomeo uses [Better Auth](https://better-auth.com) with the MongoDB adapter.

**Auth flows:**
- Email/password with mandatory OTP email verification on sign-up
- Google OAuth (configure redirect URI: `https://yourdomain.com/api/auth/callback/google`)
- Forgot password via OTP code

**Session persistence:**
The auth instance is stored on `global.__betterAuth` so it survives Next.js hot module replacement in development. Without this, every code change would invalidate existing sessions.

**Roles:** `user` · `creator` · `moderator` · `admin` · `super_admin`

On sign-up, a `Profile` document and default `Setting` document are provisioned automatically via a `databaseHooks.user.create.after` hook. A welcome notification is sent via `createNotification`.

---

## Database

MongoDB via Mongoose. Key collections:

| Collection | Purpose |
|---|---|
| `users` | Better Auth managed — email, role, avatar |
| `profiles` | Public identity — username, bio, social links, images, follower counts |
| `posts` | Blog posts — content, access tier, tags, series, co-authors |
| `comments` | Threaded post comments |
| `reactions` | Likes on posts and comments |
| `saved_posts` | Reader bookmarks |
| `followings` | Social follow graph |
| `connection_requests` | Pending connection requests |
| `notifications` | In-app notification inbox |
| `settings` | Per-user notification and appearance preferences |
| `lounges` | Private creator communities |
| `lounge_members` | Lounge membership (pending/accepted/declined) |
| `lounge_join_requests` | Join request queue with cooldown |
| `direct_messages` | DM messages |
| `conversations` | DM conversation threads |
| `subscriptions` | Active platform subscriptions |
| `payments` | Paystack payment records |
| `plans` | Subscription plan definitions |
| `creator_earnings` | Creator revenue records |
| `coauthor_invites` | Co-authorship invitations |
| `creator_applications` | Creator upgrade applications |
| `post_reads` | View/read tracking |
| `cache` | Server-side cache (e.g. trending tags, 10-min TTL) |
| `audit_logs` | Admin action audit trail |

---

## Real-time

Powered by [Ably](https://ably.com). Channels:

- `notifications:{userId}` — personal notification inbox
- `lounge:{loungeId}` — lounge chat + presence
- `dm:{conversationId}` — direct messages
- `presence:{userId}` — online/offline indicators

A client-side registry (`ably-registry.ts`) manages channel subscriptions and is torn down cleanly on sign-out via `teardownRealtime()`.

---

## Payments

Paystack handles all payment processing:

1. Client calls `POST /api/payments/initiate` → receives a Paystack checkout URL
2. User completes payment on Paystack
3. Paystack calls `POST /api/payments/webhook` → payment record created, subscription activated
4. Client can verify via `POST /api/payments/verify`

Creator earnings are calculated from the subscription pool based on reader engagement with paid content.

---

## Media Uploads

Cloudinary with unsigned upload presets:

| Preset | Use |
|---|---|
| `nomeo_blogs_profile` | Avatar photos (cropped to circle) |
| `nomeo_blogs_cover` | Profile and post cover images |

Images are cropped client-side before upload using `ImageCropper` (react-easy-crop). The component returns `{ url, publicId, width, height }` which is stored on the profile/post document.

> **Important:** Profile image fields must be updated as whole objects (`$set.profileImage = { url, publicId }`) — never dot-notation sub-fields (`$set["profileImage.url"]`). MongoDB cannot create sub-fields on a `null` parent, which throws error code 28.

---

## Admin Console

Located at `/admin`. Completely separate from the main app auth.

**Login flow:**
1. Email + password verification (`POST /api/admin/auth/check`)
2. 12–16 word seed phrase verification (`POST /api/admin/auth/login`)

All admin actions are audit-logged. Sessions have a short TTL with no "remember device" option — security over convenience.

---

## Deployment

The app is designed for Vercel deployment with MongoDB Atlas.

**Pre-deploy checklist:**
- Set all environment variables in Vercel dashboard
- Add production domain to Google OAuth authorized redirect URIs: `https://yourdomain.com/api/auth/callback/google`
- Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to your production domain
- Ensure `BETTER_AUTH_SECRET` is set and matches across all instances
- Configure Paystack webhook URL: `https://yourdomain.com/api/payments/webhook`
- Configure Ably for production capacity

**MongoDB indexes to add for performance:**
```js
// posts
db.posts.createIndex({ status: 1, publishedAt: -1 })
db.posts.createIndex({ slug: 1 }, { unique: true })
db.posts.createIndex({ tags: 1 })
db.posts.createIndex({ authorId: 1, status: 1 })

// profiles
db.profiles.createIndex({ username: 1 }, { unique: true })
db.profiles.createIndex({ userId: 1 }, { unique: true })

// notifications
db.notifications.createIndex({ recipientId: 1, isRead: 1, createdAt: -1 })

// followings
db.followings.createIndex({ followerId: 1, followingId: 1 }, { unique: true })

// cache (auto-expire old entries)
db.cache.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
```

---

## Licence

Private — all rights reserved.
