// scripts/seed-open-lounges.js
// Creates Nomeo's open (platform-owned) lounges. Run once.
//   node scripts/seed-open-lounges.js
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in .env');
  process.exit(1);
}

// Minimal inline Lounge schema (mirrors lounge.ts) so the script is standalone.
const LoungeSchema = new mongoose.Schema(
  {
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    kind: { type: String, enum: ['creator', 'platform'], default: 'creator' },
    accessType: { type: String, enum: ['subscribers', 'authenticated'], default: 'subscribers' },
    name: { type: String, required: true },
    description: { type: String },
    rules: { type: [String], default: [] },
    status: { type: String, enum: ['active', 'closed', 'suspended'], default: 'active' },
    isMuted: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
    bannedMembers: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    membersCount: { type: Number, default: 0 },
    messagesCount: { type: Number, default: 0 },
    slowModeSeconds: { type: Number, default: 0 },
    maxMessageLength: { type: Number, default: 4000 },
  },
  { timestamps: true, collection: 'lounges' }
);

const Lounge = mongoose.models.Lounge || mongoose.model('Lounge', LoungeSchema);

// The two open lounges. Any authenticated user can join these.
const OPEN_LOUNGES = [
  {
    name: 'The Commons',
    description: 'An open lounge for every Nomeo reader and writer. Say hello, share what you are reading, meet people.',
    rules: [
      'Be kind and respectful — treat others as you would in person.',
      'No spam, self-promotion, or repeated link-dropping.',
      'Keep it on-topic: reading, writing, and the Nomeo community.',
      'No harassment, hate speech, or personal attacks.',
      'Report anything that crosses the line instead of engaging.',
    ],
  },
  {
    name: 'Feedback & Ideas',
    description: 'Tell us what is working, what is not, and what you would love to see on Nomeo.',
    rules: [
      'Be specific — concrete feedback helps more than vague complaints.',
      'Search before posting so we avoid repeat threads.',
      'Critique ideas, not people.',
      'Bug reports welcome, but no sensitive info (passwords, payment details).',
    ],
  },
  {
    name: 'Nomeo Hangout',
    description: 'A relaxed space to just hang out, chat about anything, and connect with other readers and writers.',
    rules: [
      'Keep it friendly — this is a casual space for everyone.',
      'No hate speech, harassment, or NSFW content.',
      'No spam or aggressive self-promotion.',
      'Disagree respectfully; take heated debates elsewhere.',
    ],
  },
  {
    name: 'Writers Corner',
    description: 'For the writers of Nomeo — talk craft, share drafts, swap feedback, and find your next collaborator.',
    rules: [
      'Give feedback you would want to receive — kind, specific, useful.',
      'Credit others’ work; never repost someone’s writing as your own.',
      'Self-promo is fine in moderation — contribute more than you plug.',
      'Keep critique about the writing, not the writer.',
    ],
  },
];

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');
  let created = 0;
  for (const l of OPEN_LOUNGES) {
    const res = await Lounge.updateOne(
      { name: l.name, kind: 'platform' },
      {
        $set: { description: l.description, rules: l.rules, status: 'active' },
        $setOnInsert: {
          kind: 'platform',
          accessType: 'authenticated',
          name: l.name,
          membersCount: 0,
          messagesCount: 0,
        },
      },
      { upsert: true }
    );
    if (res.upsertedCount) created++;
    console.log(`  ${res.upsertedCount ? 'created' : 'exists '} — ${l.name}`);
  }
  console.log(`\nDone. ${created} created, ${OPEN_LOUNGES.length - created} already existed.`);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});