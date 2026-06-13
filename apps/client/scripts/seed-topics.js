// scripts/seed-topics.js
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in .env file');
  process.exit(1);
}

// ─── Schema (mirrors topic.ts) ─────────────────────────────────────────────
// Inline so the script is self-contained and needs no compiled TS output.

const TopicSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers and hyphens'],
    },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, maxlength: 500, trim: true },
    aliases: { type: [String], default: [] },
    category: { type: String, trim: true, maxlength: 60 },
    icon: { type: String, maxlength: 16 },
    isCurated: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'merged', 'banned'], default: 'active' },
    mergedInto: { type: String, trim: true, lowercase: true },
    postsCount: { type: Number, default: 0 },
    followersCount: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Topic = mongoose.models.Topic || mongoose.model('Topic', TopicSchema);

// ─── Seed data — 40 curated topics across categories ───────────────────────
// All isCurated: true, status: active → they appear in the onboarding picker.

const topics = [
  // ── Technology ─────────────────────────────────────────────────────────
  { slug: 'artificial-intelligence', label: 'Artificial Intelligence', category: 'Technology', icon: '🤖', aliases: ['ai', 'machine-intelligence'] },
  { slug: 'programming', label: 'Programming', category: 'Technology', icon: '💻', aliases: ['coding', 'software-development'] },
  { slug: 'web-development', label: 'Web Development', category: 'Technology', icon: '🌐', aliases: ['webdev', 'frontend', 'backend'] },
  { slug: 'startups', label: 'Startups', category: 'Technology', icon: '🚀', aliases: ['startup'] },
  { slug: 'cybersecurity', label: 'Cybersecurity', category: 'Technology', icon: '🔐', aliases: ['security', 'infosec'] },
  { slug: 'data-science', label: 'Data Science', category: 'Technology', icon: '📊', aliases: ['data', 'analytics'] },
  { slug: 'gadgets', label: 'Gadgets & Devices', category: 'Technology', icon: '📱', aliases: ['hardware', 'tech-reviews'] },
  { slug: 'crypto', label: 'Crypto & Web3', category: 'Technology', icon: '⛓️', aliases: ['cryptocurrency', 'blockchain', 'web3'] },

  // ── Business ───────────────────────────────────────────────────────────
  { slug: 'entrepreneurship', label: 'Entrepreneurship', category: 'Business', icon: '💡', aliases: ['founder'] },
  { slug: 'finance', label: 'Finance', category: 'Business', icon: '💰', aliases: ['personal-finance', 'money'] },
  { slug: 'investing', label: 'Investing', category: 'Business', icon: '📈', aliases: ['investment', 'stocks'] },
  { slug: 'marketing', label: 'Marketing', category: 'Business', icon: '📣', aliases: ['growth', 'digital-marketing'] },
  { slug: 'productivity', label: 'Productivity', category: 'Business', icon: '⚡', aliases: ['time-management'] },
  { slug: 'leadership', label: 'Leadership', category: 'Business', icon: '🧭', aliases: ['management'] },
  { slug: 'career', label: 'Career', category: 'Business', icon: '💼', aliases: ['jobs', 'career-growth'] },

  // ── Arts & Culture ─────────────────────────────────────────────────────
  { slug: 'writing', label: 'Writing', category: 'Arts & Culture', icon: '✍️', aliases: ['creative-writing'] },
  { slug: 'photography', label: 'Photography', category: 'Arts & Culture', icon: '📷', aliases: ['photo'] },
  { slug: 'design', label: 'Design', category: 'Arts & Culture', icon: '🎨', aliases: ['graphic-design', 'ux', 'ui'] },
  { slug: 'music', label: 'Music', category: 'Arts & Culture', icon: '🎵', aliases: ['musician'] },
  { slug: 'film', label: 'Film & TV', category: 'Arts & Culture', icon: '🎬', aliases: ['movies', 'cinema', 'tv'] },
  { slug: 'books', label: 'Books & Literature', category: 'Arts & Culture', icon: '📚', aliases: ['reading', 'literature'] },
  { slug: 'art', label: 'Visual Art', category: 'Arts & Culture', icon: '🖼️', aliases: ['fine-art', 'illustration'] },

  // ── Lifestyle ──────────────────────────────────────────────────────────
  { slug: 'health', label: 'Health & Wellness', category: 'Lifestyle', icon: '🩺', aliases: ['wellness', 'wellbeing'] },
  { slug: 'fitness', label: 'Fitness', category: 'Lifestyle', icon: '💪', aliases: ['exercise', 'workout'] },
  { slug: 'food', label: 'Food & Cooking', category: 'Lifestyle', icon: '🍳', aliases: ['cooking', 'recipes', 'cuisine'] },
  { slug: 'travel', label: 'Travel', category: 'Lifestyle', icon: '✈️', aliases: ['tourism'] },
  { slug: 'relationships', label: 'Relationships', category: 'Lifestyle', icon: '❤️', aliases: ['dating', 'love'] },
  { slug: 'parenting', label: 'Parenting', category: 'Lifestyle', icon: '👶', aliases: ['family'] },
  { slug: 'fashion', label: 'Fashion & Style', category: 'Lifestyle', icon: '👗', aliases: ['style'] },
  { slug: 'mental-health', label: 'Mental Health', category: 'Lifestyle', icon: '🧠', aliases: ['psychology', 'mindfulness'] },

  // ── Science ────────────────────────────────────────────────────────────
  { slug: 'science', label: 'Science', category: 'Science', icon: '🔬', aliases: ['research'] },
  { slug: 'space', label: 'Space & Astronomy', category: 'Science', icon: '🪐', aliases: ['astronomy', 'cosmos'] },
  { slug: 'environment', label: 'Environment', category: 'Science', icon: '🌍', aliases: ['climate', 'sustainability'] },
  { slug: 'nature', label: 'Nature & Wildlife', category: 'Science', icon: '🌿', aliases: ['wildlife'] },

  // ── Society ────────────────────────────────────────────────────────────
  { slug: 'politics', label: 'Politics', category: 'Society', icon: '🏛️', aliases: ['policy'] },
  { slug: 'history', label: 'History', category: 'Society', icon: '📜', aliases: ['historical'] },
  { slug: 'education', label: 'Education', category: 'Society', icon: '🎓', aliases: ['learning', 'teaching'] },
  { slug: 'philosophy', label: 'Philosophy', category: 'Society', icon: '🤔', aliases: ['ethics'] },

  // ── Sports & Gaming ────────────────────────────────────────────────────
  { slug: 'sports', label: 'Sports', category: 'Sports & Gaming', icon: '⚽', aliases: ['athletics'] },
  { slug: 'gaming', label: 'Gaming', category: 'Sports & Gaming', icon: '🎮', aliases: ['video-games', 'esports'] },
];

// Stamp the shared curated flags onto every topic
const seedDocs = topics.map((t, i) => ({
  ...t,
  isCurated: true,
  status: 'active',
  isFeatured: false,
  postsCount: 0,
  followersCount: 0,
  // keep a stable display order roughly by category grouping
  // (sortOrder isn't in the schema; left here as a no-op if you add it later)
}));

// ─── DB connection ─────────────────────────────────────────────────────────

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');
}

async function disconnectDB() {
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
}

// ─── Commands ───────────────────────────────────────────────────────────────

/**
 * Seed curated topics. By default it UPSERTS (safe to re-run, won't wipe
 * usage counters or auto-created topics). Pass `--fresh` to wipe curated
 * topics first.
 */
async function seedTopics({ fresh = false } = {}) {
  await connectDB();
  try {
    if (fresh) {
      // Only remove CURATED topics — never touch auto-created ones that may
      // have real post counts.
      const deleted = await Topic.deleteMany({ isCurated: true });
      console.log(`Cleared ${deleted.deletedCount} curated topics`);
    }

    let created = 0;
    let updated = 0;

    for (const doc of seedDocs) {
      const res = await Topic.updateOne(
        { slug: doc.slug },
        {
          // Set curated metadata, but DON'T reset the usage counters if the
          // topic already exists with real activity.
          $set: {
            label: doc.label,
            category: doc.category,
            icon: doc.icon,
            aliases: doc.aliases || [],
            isCurated: true,
            status: 'active',
          },
          $setOnInsert: {
            postsCount: 0,
            followersCount: 0,
            isFeatured: false,
          },
        },
        { upsert: true }
      );
      if (res.upsertedCount) created++;
      else if (res.modifiedCount) updated++;
    }

    console.log(`\nSeed complete: ${created} created, ${updated} updated, ${seedDocs.length} total curated.\n`);

    // Print grouped summary
    const byCategory = {};
    topics.forEach((t) => {
      byCategory[t.category] = byCategory[t.category] || [];
      byCategory[t.category].push(t.label);
    });
    Object.entries(byCategory).forEach(([cat, labels]) => {
      console.log(`  ${cat} (${labels.length}): ${labels.join(', ')}`);
    });
  } finally {
    await disconnectDB();
  }
}

async function listTopics(category) {
  await connectDB();
  try {
    const query = category ? { category, isCurated: true } : { isCurated: true };
    const results = await Topic.find(query).sort({ category: 1, label: 1 });
    console.log(`\n${results.length} curated topic(s):\n`);
    results.forEach((t) => {
      console.log(`  ${t.icon || '  '} [${t.category}] ${t.label} (${t.slug}) — posts: ${t.postsCount}, followers: ${t.followersCount}`);
    });
    return results;
  } finally {
    await disconnectDB();
  }
}

async function addTopic(data) {
  await connectDB();
  try {
    const existing = await Topic.findOne({ slug: data.slug });
    if (existing) {
      console.log(`Topic '${data.slug}' already exists`);
      return null;
    }
    const result = await Topic.create({ ...data, isCurated: true, status: 'active' });
    console.log(`Added topic: ${result.label} (${result.slug})`);
    return result;
  } finally {
    await disconnectDB();
  }
}

async function removeTopic(slug) {
  await connectDB();
  try {
    const result = await Topic.findOneAndDelete({ slug });
    console.log(result ? `Deleted topic: ${slug}` : `No topic found with slug: ${slug}`);
    return result;
  } finally {
    await disconnectDB();
  }
}

// ─── CLI ──────────────────────────────────────────────────────────────────

async function main() {
  const [command, ...args] = process.argv.slice(2);

  try {
    switch (command) {
      case 'seed':
        await seedTopics({ fresh: args.includes('--fresh') });
        break;
      case 'list':
        await listTopics(args[0]);
        break;
      case 'add':
        if (!args[0]) { console.log('Usage: seed-topics add \'{"slug":"...","label":"...","category":"...","icon":"..."}\''); break; }
        await addTopic(JSON.parse(args[0]));
        break;
      case 'remove':
        if (!args[0]) { console.log('Usage: seed-topics remove <slug>'); break; }
        await removeTopic(args[0]);
        break;
      default:
        console.log(`
seed-topics — Topic management CLI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Commands:
  seed [--fresh]        Upsert curated topics (--fresh wipes curated first)
  list [category]       List curated topics (optional category filter)
  add <json>            Add a single curated topic
  remove <slug>         Delete a topic

Examples:
  node scripts/seed-topics.js seed
  node scripts/seed-topics.js seed --fresh
  node scripts/seed-topics.js list Technology
  node scripts/seed-topics.js add '{"slug":"devops","label":"DevOps","category":"Technology","icon":"⚙️"}'
  node scripts/seed-topics.js remove devops
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { seedTopics, listTopics, addTopic, removeTopic };