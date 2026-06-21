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
// NOTE: interval enum expanded to include quarterly + biannually. Make sure
// your plan.ts enum matches: ['monthly', 'quarterly', 'biannually', 'yearly'].

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
    interval: {
      type: String,
      enum: ['monthly', 'quarterly', 'biannually', 'yearly'],
      required: true,
    },
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
// Nomeo is a READER subscription. Being a free reader (with monthly free-read
// credits) is the DEFAULT state — not a plan. Membership is a conscious action,
// so every plan here is PAID. Four billing intervals with a progressive
// discount: the longer the commitment, the lower the effective monthly price.
//
// Base ₦2,500/mo. Prices in kobo (₦ smallest unit):
//   Monthly     1mo  ₦2,500   (250000)   — ₦2,500/mo
//   Quarterly   3mo  ₦7,125   (712500)   — 5% off  → ₦2,375/mo
//   Biannually  6mo  ₦13,500  (1350000)  — 10% off → ₦2,250/mo
//   Annually    12mo ₦24,900  (2490000)  — 17% off → ₦2,075/mo

const MEMBER_BENEFITS = [
  { label: 'Unlimited access to all paid posts', isHighlighted: true },
  { label: 'Support writers through the earnings pool', isHighlighted: true },
  { label: 'Follow unlimited writers', isHighlighted: true },
  { label: 'Save and organise posts into lists', isHighlighted: true },
  { label: 'Personalised topic feed', isHighlighted: true },
  { label: 'Ad-free reading', isHighlighted: true },
];

const createdBy = SEED_ADMIN_ID
  ? new mongoose.Types.ObjectId(SEED_ADMIN_ID)
  : new mongoose.Types.ObjectId(); // throwaway; replace via dashboard later

const plans = [
  {
    createdBy,
    name: 'Monthly',
    description: 'Unlimited reading, billed monthly. Cancel anytime.',
    interval: 'monthly',
    priceAmount: 250000, // ₦2,500
    currency: 'NGN',
    trialDays: 0,
    features: [
      ...MEMBER_BENEFITS,
    ],
    isHighlighted: false,
    isDefault: false,
    status: 'active',
    sortOrder: 0,
  },
  {
    createdBy,
    name: 'Quarterly',
    description: 'Unlimited reading, billed every 3 months — save 5%.',
    interval: 'quarterly',
    priceAmount: 712500, // ₦7,125 (₦2,375/mo)
    currency: 'NGN',
    trialDays: 0,
    features: [
      { label: 'Everything in Monthly', isHighlighted: true },
      { label: 'Save 5% vs monthly billing', isHighlighted: true },
      ...MEMBER_BENEFITS,
    ],
    isHighlighted: false,
    isDefault: false,
    status: 'active',
    sortOrder: 1,
  },
  {
    createdBy,
    name: 'Biannually',
    description: 'Unlimited reading, billed every 6 months — save 10%.',
    interval: 'biannually',
    priceAmount: 1350000, // ₦13,500 (₦2,250/mo)
    currency: 'NGN',
    trialDays: 0,
    features: [
      { label: 'Everything in Monthly', isHighlighted: true },
      { label: 'Save 10% vs monthly billing', isHighlighted: true },
      ...MEMBER_BENEFITS,
    ],
    isHighlighted: false,
    isDefault: false,
    status: 'active',
    sortOrder: 2,
  },
  {
    createdBy,
    name: 'Annually',
    description: 'Unlimited reading, billed yearly — save 17% (best value).',
    interval: 'yearly',
    priceAmount: 2490000, // ₦24,900 (₦2,075/mo)
    currency: 'NGN',
    trialDays: 0,
    features: [
      { label: 'Everything in Monthly', isHighlighted: true },
      { label: 'Save 17% vs monthly billing — best value', isHighlighted: true },
      ...MEMBER_BENEFITS,
    ],
    isHighlighted: true, // recommended / best value
    isDefault: false,
    status: 'active',
    sortOrder: 3,
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