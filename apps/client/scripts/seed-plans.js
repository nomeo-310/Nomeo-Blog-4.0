// scripts/seed-plans.js
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in .env file');
  process.exit(1);
}

// Optional: an admin user id to set as createdBy. If not provided, a throwaway
// ObjectId is used so the docs validate — replace later from the dashboard.
const SEED_ADMIN_ID = process.env.SEED_ADMIN_ID || null;

// ─── Schema (mirrors plan.ts) ──────────────────────────────────────────────
// Inline so the script is self-contained and needs no compiled TS output.

const PlanFeatureSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 150 },
    isHighlighted: { type: Boolean, default: true },
  },
  { _id: false }
);

const PlanSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, maxlength: 300, trim: true },
    interval: { type: String, enum: ['monthly', 'yearly'], required: true },
    priceAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, default: 'NGN' },
    externalPriceId: { type: String, trim: true },
    trialDays: { type: Number, default: 0, min: 0 },
    features: { type: [PlanFeatureSchema], default: [] },
    isHighlighted: { type: Boolean, default: false },
    isDefault: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'archived', 'draft'], default: 'draft' },
    sortOrder: { type: Number, default: 0 },
    activeSubscribersCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, collection: 'plans' }
);

const Plan = mongoose.models.Plan || mongoose.model('Plan', PlanSchema);

// ─── Seed data ──────────────────────────────────────────────────────────────
// Nomeo is a READER subscription: readers subscribe to the platform to read,
// and the revenue pool is shared with creators by reading time. Plans are
// consumer reading tiers, not business tiers.
//
// Prices in kobo (₦ smallest unit): ₦2,500/mo and ₦24,000/yr (2 months free).

const createdBy = SEED_ADMIN_ID
  ? new mongoose.Types.ObjectId(SEED_ADMIN_ID)
  : new mongoose.Types.ObjectId(); // throwaway; replace via dashboard later

const plans = [
  {
    createdBy,
    name: 'Free',
    description: 'Start reading with a taste of everything Nomeo offers.',
    interval: 'monthly',
    priceAmount: 0,
    currency: 'NGN',
    trialDays: 0,
    features: [
      { label: '10 free paid-post reads per month', isHighlighted: true },
      { label: 'Follow your favourite writers', isHighlighted: true },
      { label: 'Save and bookmark posts', isHighlighted: true },
      { label: 'Personalised topic feed', isHighlighted: true },
      { label: 'No unlimited access to paid posts', isHighlighted: false },
      { label: 'Does not support the creator pool', isHighlighted: false },
    ],
    isHighlighted: false,
    isDefault: true,        // pre-selected on the subscribe page
    status: 'active',
    sortOrder: 0,
  },
  {
    createdBy,
    name: 'Monthly',
    description: 'Unlimited reading, billed monthly. Cancel anytime.',
    interval: 'monthly',
    priceAmount: 250000,     // ₦2,500
    currency: 'NGN',
    trialDays: 7,
    features: [
      { label: 'Unlimited access to all paid posts', isHighlighted: true },
      { label: 'Support writers through the earnings pool', isHighlighted: true },
      { label: 'Follow unlimited writers', isHighlighted: true },
      { label: 'Save and organise posts into lists', isHighlighted: true },
      { label: 'Personalised topic feed', isHighlighted: true },
      { label: 'Ad-free reading', isHighlighted: true },
      { label: '7-day free trial', isHighlighted: true },
    ],
    isHighlighted: false,
    isDefault: false,
    status: 'active',
    sortOrder: 1,
  },
  {
    createdBy,
    name: 'Yearly',
    description: 'Unlimited reading, billed yearly — two months free.',
    interval: 'yearly',
    priceAmount: 2400000,    // ₦24,000/yr (≈ ₦2,000/mo — 2 months free vs monthly)
    currency: 'NGN',
    trialDays: 7,
    features: [
      { label: 'Everything in Monthly', isHighlighted: true },
      { label: 'Two months free vs monthly billing', isHighlighted: true },
      { label: 'Unlimited access to all paid posts', isHighlighted: true },
      { label: 'Support writers through the earnings pool', isHighlighted: true },
      { label: 'Ad-free reading', isHighlighted: true },
      { label: '7-day free trial', isHighlighted: true },
    ],
    isHighlighted: true,     // recommended / best value
    isDefault: false,
    status: 'active',
    sortOrder: 2,
  },
];

// ─── DB connection ──────────────────────────────────────────────────────────

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
 * Seed plans. UPSERTS by name+interval so it's safe to re-run (won't wipe
 * activeSubscribersCount on existing plans). Pass --fresh to wipe first.
 */
async function seedPlans({ fresh = false } = {}) {
  await connectDB();
  try {
    if (fresh) {
      const deleted = await Plan.deleteMany({});
      console.log(`Cleared ${deleted.deletedCount} existing plans`);
    }

    let created = 0;
    let updated = 0;

    for (const p of plans) {
      const res = await Plan.updateOne(
        { name: p.name, interval: p.interval },
        {
          $set: {
            description: p.description,
            priceAmount: p.priceAmount,
            currency: p.currency,
            trialDays: p.trialDays,
            features: p.features,
            isHighlighted: p.isHighlighted,
            isDefault: p.isDefault,
            status: p.status,
            sortOrder: p.sortOrder,
          },
          $setOnInsert: {
            createdBy: p.createdBy,
            activeSubscribersCount: 0,
          },
        },
        { upsert: true }
      );
      if (res.upsertedCount) created++;
      else if (res.modifiedCount) updated++;
    }

    console.log(`\nSeed complete: ${created} created, ${updated} updated, ${plans.length} total.\n`);
    plans.forEach((p) => {
      const naira = (p.priceAmount / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' });
      const tags = [p.isDefault && 'default', p.isHighlighted && 'recommended'].filter(Boolean).join(', ');
      console.log(`  ${p.name} (${p.interval}) — ${naira}${tags ? ` [${tags}]` : ''}`);
    });

    if (!SEED_ADMIN_ID) {
      console.log('\nNote: createdBy used a throwaway ObjectId (no SEED_ADMIN_ID set).');
      console.log('Set SEED_ADMIN_ID in .env to attribute plans to a real admin, or edit later via the dashboard.');
    }
  } finally {
    await disconnectDB();
  }
}

async function listPlans() {
  await connectDB();
  try {
    const results = await Plan.find({}).sort({ sortOrder: 1 });
    console.log(`\n${results.length} plan(s):\n`);
    results.forEach((p) => {
      const naira = (p.priceAmount / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' });
      console.log(`  ${p.name} (${p.interval}) — ${naira} | status: ${p.status} | subs: ${p.activeSubscribersCount}`);
    });
    return results;
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
        await seedPlans({ fresh: args.includes('--fresh') });
        break;
      case 'list':
        await listPlans();
        break;
      default:
        console.log(`
seed-plans — Plan management CLI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Commands:
  seed [--fresh]    Upsert plans (--fresh wipes all plans first)
  list              List all plans

Examples:
  node scripts/seed-plans.js seed
  node scripts/seed-plans.js seed --fresh
  node scripts/seed-plans.js list

Optional: set SEED_ADMIN_ID in .env to attribute plans to a real admin user.
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

module.exports = { seedPlans, listPlans };