// scripts/seed-superadmin.js
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
require('dotenv').config({ path: '.env' });

const { hashPassword: betterAuthHashPassword, verifyPassword } = require('better-auth/crypto');
const { betterAuth }     = require('better-auth');
const { mongodbAdapter } = require('better-auth/adapters/mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env');
  process.exit(1);
}

/* ── Minimal schemas ─────────────────────────────────────────────────────────
   We only define the two custom collections Better Auth doesn't own.
   The schema here must stay in sync with models/admin.ts.
   ────────────────────────────────────────────────────────────────────────── */

const PermissionsSchema = new mongoose.Schema(
  {
    canRemovePost:                { type: Boolean, default: false },
    canRestorePost:               { type: Boolean, default: false },
    canFeaturePost:               { type: Boolean, default: false },
    canRemoveComment:             { type: Boolean, default: false },
    canRestoreComment:            { type: Boolean, default: false },
    canViewUsers:                 { type: Boolean, default: false },
    canIssueTempBan:              { type: Boolean, default: false },
    canIssuePermanentBan:         { type: Boolean, default: false },
    canLiftBan:                   { type: Boolean, default: false },
    canShadowBan:                 { type: Boolean, default: false },
    canIssueWarning:              { type: Boolean, default: false },
    canDeleteUserAccount:         { type: Boolean, default: false },
    canApproveCreatorApplication: { type: Boolean, default: false },
    canRejectCreatorApplication:  { type: Boolean, default: false },
    canSuspendLounge:             { type: Boolean, default: false },
    canDeleteLounge:              { type: Boolean, default: false },
    canRemoveLoungeMessage:       { type: Boolean, default: false },
    canCreateCampaign:            { type: Boolean, default: false },
    canSendCampaign:              { type: Boolean, default: false },
    canViewCampaignStats:         { type: Boolean, default: false },
    canInviteAdmin:               { type: Boolean, default: false },
    canRevokeAdminRole:           { type: Boolean, default: false },
    canManagePlatformSettings:    { type: Boolean, default: false },
    canManageTags:                { type: Boolean, default: false },
    canViewEarningsReports:       { type: Boolean, default: false },
    canManagePayouts:             { type: Boolean, default: false },
    canViewAuditLog:              { type: Boolean, default: false },
    canViewErrorLog:              { type: Boolean, default: false },
    canExportLogs:                { type: Boolean, default: false },
  },
  { _id: false }
);

const StatsSchema = new mongoose.Schema(
  {
    bansIssued:       { type: Number, default: 0 },
    bansLifted:       { type: Number, default: 0 },
    postsRemoved:     { type: Number, default: 0 },
    postsRestored:    { type: Number, default: 0 },
    commentsRemoved:  { type: Number, default: 0 },
    warningsIssued:   { type: Number, default: 0 },
    campaignsSent:    { type: Number, default: 0 },
    loungeSuspended:  { type: Number, default: 0 },
    creatorsApproved: { type: Number, default: 0 },
    creatorsRejected: { type: Number, default: 0 },
  },
  { _id: false }
);

const DashboardNotificationsSchema = new mongoose.Schema(
  {
    emailOnEscalatedReport: { type: Boolean, default: true  },
    emailOnNewBanAppeal:    { type: Boolean, default: true  },
    emailOnCampaignFailure: { type: Boolean, default: true  },
    emailOnPayoutFailure:   { type: Boolean, default: false },
  },
  { _id: false }
);

const AdminSchema = new mongoose.Schema(
  {
    // ── Identity
    name:        { type: String },
    displayName: { type: String },
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    email:       { type: String, required: true, unique: true, lowercase: true, trim: true },

    // ── Role & status
    role:        { type: String, enum: ['support', 'admin', 'super_admin'], default: 'admin' },
    adminStatus: { type: String, enum: ['active', 'suspended', 'inactive'],   default: 'active' },
    isActive:    { type: Boolean, default: true  },
    isOnboarded: { type: Boolean, default: false },

    // ── Auth
    useSeedPhrase: { type: Boolean, default: true },
    lastLoginAt:   { type: Date },
    lastLoginIP:   { type: String },
    loginCount:    { type: Number, default: 0 },

    // ── Permissions
    permissions: { type: PermissionsSchema, default: () => superAdminPermissions() },

    // ── Context
    department: {
      type:    String,
      enum:    ['content', 'trust_and_safety', 'growth', 'engineering', 'support', 'other'],
      default: 'other',
    },
    internalNotes: { type: String },
    assignedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    assignedAt:    { type: Date },

    // ── Suspension
    suspendedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    suspendedAt:      { type: Date },
    suspensionReason: { type: String },

    // ── Stats
    stats: { type: StatsSchema, default: () => ({}) },

    // ── Dashboard notifications
    dashboardNotifications: { type: DashboardNotificationsSchema, default: () => ({}) },
  },
  { timestamps: true, collection: 'admins' }
);

const SeedphraseSchema = new mongoose.Schema(
  {
    userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    seedphrase:     { type: String, required: true },
    isActive:       { type: Boolean, default: true },
    failedAttempts: { type: Number,  default: 0 },
    expiresAt: {
      type:    Date,
      default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    lastUsedAt: Date,
  },
  { timestamps: true, collection: 'seed_phrases' }
);

const Admin      = mongoose.models.Admin      || mongoose.model('Admin',      AdminSchema);
const Seedphrase = mongoose.models.Seedphrase || mongoose.model('Seedphrase', SeedphraseSchema);

/* ── Permissions helper ──────────────────────────────────────────────────────
   super_admin gets every permission set to true.
   Mirrors the defaultPermissions('super_admin') in models/admin.ts.
   ────────────────────────────────────────────────────────────────────────── */
function superAdminPermissions() {
  return {
    canRemovePost:                true,
    canRestorePost:               true,
    canFeaturePost:               true,
    canRemoveComment:             true,
    canRestoreComment:            true,
    canViewUsers:                 true,
    canIssueTempBan:              true,
    canIssuePermanentBan:         true,
    canLiftBan:                   true,
    canShadowBan:                 true,
    canIssueWarning:              true,
    canDeleteUserAccount:         true,
    canApproveCreatorApplication: true,
    canRejectCreatorApplication:  true,
    canSuspendLounge:             true,
    canDeleteLounge:              true,
    canRemoveLoungeMessage:       true,
    canCreateCampaign:            true,
    canSendCampaign:              true,
    canViewCampaignStats:         true,
    canInviteAdmin:               true,
    canRevokeAdminRole:           true,
    canManagePlatformSettings:    true,
    canManageTags:                true,
    canViewEarningsReports:       true,
    canManagePayouts:             true,
    canViewAuditLog:              true,
    canViewErrorLog:              true,
    canExportLogs:                true,
  };
}

/* ── Bootstrap Better Auth ───────────────────────────────────────────────── */

function createAuth(db) {
  return betterAuth({
    secret:   process.env.BETTER_AUTH_SECRET,
    baseURL:  process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    database: mongodbAdapter(db),
    user: {
      additionalFields: {
        role:   { type: 'string', required: false, defaultValue: 'user' },
        avatar: { type: 'string', required: false, defaultValue: '' },
      },
    },
    emailAndPassword: { enabled: true, requireEmailVerification: false },
    socialProviders:  {},
    plugins:          [],
  });
}

/* ── Credential generators ───────────────────────────────────────────────── */

function generateSecurePassword(length = 16) {
  const lower   = 'abcdefghijklmnopqrstuvwxyz';
  const upper   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits  = '0123456789';
  const special = '!@#$%^&*';
  const all     = lower + upper + digits + special;
  const rand    = (s) => s[Math.floor(Math.random() * s.length)];

  let pw = [rand(lower), rand(upper), rand(digits), rand(special)];
  for (let i = 4; i < length; i++) pw.push(rand(all));
  return pw.sort(() => Math.random() - 0.5).join('');
}

function generateSeedPhrase(wordCount = 16) {
  const wordList = [
    "abandon","ability","able","about","above","absent","absorb","abstract","absurd","accident",
    "account","accuse","achieve","acid","acoustic","acquire","across","act","action","actor",
    "actress","actual","adapt","add","addict","address","adjust","admit","adult","advance",
    "advice","aerobic","affair","afford","afraid","after","again","age","agent","agree",
    "ahead","aim","air","airport","alarm","album","alcohol","alert","alien","allow",
    "almost","alone","alpha","already","alter","always","amazing","among","amount","anchor",
    "ancient","anger","angle","animal","ankle","answer","antique","anxiety","apart","apple",
    "approve","arch","arctic","area","arena","argue","armor","army","arrange","arrest",
    "arrow","artefact","artist","artwork","aspect","asset","assume","athlete","atom","attack",
    "attend","attract","auction","august","author","autumn","avocado","avoid","awake","aware",
    "awesome","awkward","axis","baby","bacon","badge","balance","bamboo","banana","barrel",
    "basket","battle","beach","bean","beauty","beef","believe","belt","bench","bicycle",
    "biology","bird","black","blade","blanket","blast","blind","blood","blossom","blue",
    "board","boat","boil","bomb","bone","bonus","book","boost","border","bounce",
    "bracket","brain","brand","brave","bread","brick","bridge","bright","broccoli","broken",
    "bronze","brother","bubble","budget","buffalo","build","bulk","bundle","bunker","burger",
    "butter","cabin","cable","cactus","cake","calm","camera","canal","candy","canoe",
    "canyon","capital","captain","carbon","cargo","carpet","castle","casual","catch","cattle",
    "cause","cave","celery","cement","century","cereal","chair","champion","chaos","chapter",
    "charge","chase","cheap","cheese","chef","cherry","chest","chicken","child","choice",
    "chronic","circle","citizen","civil","clarify","clay","clean","clever","client","cliff",
    "clinic","clock","cloth","cloud","clown","club","cluster","coach","coast","coconut",
    "coffee","coin","collect","color","column","combine","comic","company","concert","confirm",
    "congress","connect","control","cook","cool","copper","coral","corn","cotton","country",
    "cousin","coyote","crane","crater","cream","creek","cricket","crime","crystal","culture",
    "cupboard","curious","curtain","cushion","custom","cycle","damage","dance","danger","daughter",
    "dawn","deal","decade","decide","deer","define","degree","delay","deliver","demand",
    "dental","deputy","describe","desert","design","detect","develop","device","diamond","diesel",
    "differ","digital","dignity","dinner","dinosaur","discover","disease","display","distance","doctor",
    "document","dolphin","donate","donkey","double","dove","dragon","dream","dress","drill",
    "drink","drive","drop","drum","duck","dune","dust","dynamic","eagle","earth",
    "ecology","economy","edge","educate","effort","electric","elegant","elephant","elite","embrace",
    "emotion","employ","empower","enable","enemy","energy","engine","enjoy","enlist","enrich",
    "episode","equal","equip","erase","erosion","escape","essence","estate","eternal","evidence",
    "evolve","exchange","excite","exhaust","exile","exotic","expand","expire","explain","expose",
    "fabric","faculty","faith","fantasy","farm","fashion","father","favorite","festival","fever",
    "fiction","field","figure","film","filter","finger","fire","fiscal","fitness","flame",
    "flight","float","floor","flower","fluid","foam","focus","fog","follow","forest",
    "fortune","forum","fossil","foster","fox","fragile","frame","fresh","friend","frog",
    "frost","fruit","fuel","furnace","future","gadget","galaxy","gallery","garage","garden",
    "garlic","garment","gauge","gaze","genius","gentle","genuine","ghost","giant","gift",
    "giraffe","glass","glide","glimpse","globe","glory","glow","goddess","gold","gorilla",
    "gospel","govern","grace","grain","grape","grass","gravity","grid","grocery","guard",
    "guitar","gym","habit","hammer","hamster","harbor","harvest","hawk","hedgehog","helmet",
    "hero","hill","hockey","holiday","honey","hood","horn","horror","horse","hospital",
    "hover","human","humor","hungry","husband","hybrid","icon","identify","ignore","illegal",
    "illness","image","immune","impact","improve","income","indoor","infant","inhale","innocent",
    "input","inquiry","insect","inside","inspire","install","intact","invest","invite","involve",
    "island","isolate","jacket","jaguar","jealous","jeans","jelly","jewel","journey","jungle",
    "kangaroo","keen","ketchup","kidney","kingdom","kitchen","kitten","kiwi","knife","ladder",
    "language","laptop","laundry","lava","lawsuit","layer","leader","lecture","legend","leisure",
    "lemon","leopard","liberty","library","license","lizard","lobster","lottery","lounge","luggage",
    "lumber","lunar","luxury","lyrics","machine","magic","magnet","mammal","mandate","mango",
    "mansion","maple","marble","margin","marine","marriage","master","material","matrix","meadow",
    "mechanic","medal","melody","member","memory","mercury","metal","midnight","million","mimic",
    "miracle","mirror","mixture","monitor","monkey","monster","moral","mosquito","motion","motor",
    "mountain","movie","muffin","multiply","muscle","museum","mushroom","mystery","myth","napkin",
    "nation","nature","neglect","nephew","nerve","network","neutral","noble","nominee","noodle",
    "notable","nuclear","nurse","oblige","obscure","observe","obtain","ocean","offer","often",
    "olympic","onion","online","opera","oppose","option","orange","orbit","orchard","ordinary",
    "organ","orient","orphan","ostrich","outdoor","oyster","ozone","paddle","palace","panda",
    "panel","panic","panther","parade","parrot","patient","patrol","pattern","peanut","pelican",
    "penalty","people","pepper","perfect","permit","photo","physical","piano","picnic","pigeon",
    "pilot","pioneer","pistol","pizza","planet","plastic","pledge","plunge","poet","polar",
    "police","pond","pony","popular","portion","potato","pottery","poverty","powder","practice",
    "praise","prefer","prepare","pretty","prevent","pride","primary","prison","prize","process",
    "produce","profit","program","project","promote","proof","property","prosper","protect","provide",
    "pudding","pulse","pumpkin","punch","pupil","puppy","purchase","purity","purpose","puzzle",
    "pyramid","quantum","quarter","quick","quote","raccoon","radar","radio","ranch","random",
    "rapid","raven","rebel","rebuild","recall","receive","recipe","recycle","reflect","reform",
    "region","regret","reject","relax","release","relief","remain","render","renew","repair",
    "require","rescue","resource","response","retire","retreat","reunion","reveal","review","reward",
    "rhythm","ribbon","ridge","rifle","rigid","riot","ripple","ritual","rival","river",
    "roast","robot","rocket","romance","rookie","rotate","royal","rubber","runway","rural",
    "saddle","salmon","salon","salute","sample","satisfy","satoshi","sausage","scale","scatter",
    "scheme","school","science","scorpion","scout","screen","script","search","season","second",
    "secret","segment","seminar","senior","series","service","shadow","shallow","shell","sheriff",
    "shield","shine","ship","shiver","shock","shrimp","shuffle","sibling","siege","silent",
    "silk","silver","similar","siren","sister","situate","sketch","skill","skull","slam",
    "slender","slice","slight","slim","slogan","smooth","snack","snake","soccer","solar",
    "soldier","solution","source","spare","spatial","spawn","special","sphere","spider","spirit",
    "sponsor","spoon","spot","spread","spring","squirrel","stadium","stairs","stamp","state",
    "steak","steel","stereo","stick","stock","stomach","stone","strategy","strike","strong",
    "student","stumble","submit","subway","suffer","sugar","suggest","summit","supply","supreme",
    "surface","surge","surprise","suspect","sustain","swallow","swamp","swear","sweet","swift",
    "symbol","symptom","system","tackle","talent","target","tattoo","taxi","tenant","tennis",
    "theory","timber","tissue","title","toast","tobacco","toddler","token","tomato","tornado",
    "tortoise","tourist","tower","track","trade","traffic","tragic","transfer","trap","travel",
    "treat","trend","trial","tribe","trigger","trim","trophy","trumpet","trust","tuition",
    "tunnel","turkey","turtle","twenty","twist","typical","umbrella","uncover","uniform","unique",
    "universe","unusual","unveil","upgrade","uphold","urban","useful","utility","vacuum","valid",
    "valley","vanish","various","vault","velvet","vendor","venture","verify","vibrant","vicious",
    "victory","vintage","violin","virus","visual","vital","vivid","vocal","volcano","voyage",
    "walnut","warfare","warrior","wealth","weapon","wedding","welcome","whale","wheat","wheel",
    "whisper","wildlife","wisdom","witness","wonder","worship","worth","wrestle","zebra","zero",
  ];

  if (wordCount > wordList.length) throw new Error('wordCount exceeds word list size');
  return [...wordList].sort(() => Math.random() - 0.5).slice(0, wordCount).join(' ');
}

/* ── Existence check ─────────────────────────────────────────────────────── */

async function superadminExists(db) {
  return db.collection('user').findOne({
    $or: [
      { role: 'super_admin' },
      { email: (process.env.SUPERADMIN_EMAIL || 'superadmin@example.com').toLowerCase() },
    ],
  });
}

/* ── Core creation ───────────────────────────────────────────────────────── */

async function createSuperAdmin({ auth, db, email, name, displayName, password, seedPhrase }) {
  const normalizedEmail = email.toLowerCase();
  const now = new Date();

  // 1. Create user via Better Auth — ensures ID format + account record are correct
  const result = await auth.api.signUpEmail({
    body: { email: normalizedEmail, password, name, role: 'super_admin' },
    asResponse: false,
  });

  if (!result?.user?.id) throw new Error('Better Auth signUpEmail did not return a user ID');

  const userId = result.user.id;
  console.log(`   Created Better Auth user: ${userId}`);

  // 2. Patch role to super_admin (signUpEmail always creates with default role "user")
  await db.collection('user').updateOne(
    { _id: userId },
    { $set: { role: 'super_admin', emailVerified: true, avatar: '' } }
  );

  // 3. Create Admin document — full schema including permissions, stats, notifications
  const adminDoc = new Admin({
    userId,
    email:       normalizedEmail,
    name:        name.trim(),
    displayName: displayName.trim(),
    role:        'super_admin',
    adminStatus: 'active',
    isActive:    true,
    isOnboarded: true,      // super_admin is bootstrapped — no onboarding needed
    useSeedPhrase: true,
    department:  'other',
    assignedBy:  null,      // seeded — no assigning admin
    assignedAt:  now,
    permissions: superAdminPermissions(),
    stats:       {},
    dashboardNotifications: {},
    createdAt:   now,
    updatedAt:   now,
  });
  await adminDoc.save();
  console.log(`   Created Admin document: ${adminDoc._id}`);

  // 4. Create hashed Seedphrase
  const hashedSeedPhrase = await bcrypt.hash(seedPhrase, 12);
  const seedDoc = new Seedphrase({
    userId,
    seedphrase:     hashedSeedPhrase,
    isActive:       true,
    failedAttempts: 0,
    expiresAt:      new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
    createdAt:      now,
    updatedAt:      now,
  });
  await seedDoc.save();
  console.log(`   Created Seedphrase document`);

  return { success: true, userId, email: normalizedEmail, name, displayName, password, seedPhrase };
}

/* ── Verification ────────────────────────────────────────────────────────── */

async function verifySetup(db, email, password) {
  console.log('\n🔍 Verifying setup...');

  const user = await db.collection('user').findOne({ email: email.toLowerCase() });
  if (!user) return fail('User not found in DB');

  const userId = user._id?.toString?.() ?? user._id;

  const account = await db.collection('account').findOne({ userId, providerId: 'credential' });
  if (!account)          return fail(`No credential account found for userId: ${userId}`);
  if (!account.password) return fail('Password hash missing from account');

  const passwordOk = await verifyPassword({ hash: account.password, password });
  if (!passwordOk) return fail('verifyPassword failed — hash mismatch');

  const admin = await Admin.findOne({ userId });
  if (!admin) return fail('Admin document not found');

  // Spot-check a super_admin permission
  if (!admin.permissions?.canExportLogs) return fail('Admin permissions not fully seeded');

  const seed = await Seedphrase.findOne({ userId });
  if (!seed) return fail('Seedphrase document not found');

  console.log('✅ All records verified:');
  console.log(`   User       → id: ${user._id}, role: ${user.role}`);
  console.log(`   Account    → provider: ${account.providerId}, hash: ${account.password.slice(0, 20)}...`);
  console.log(`   Password   → verifyPassword: ✓`);
  console.log(`   Admin      → status: ${admin.adminStatus}, permissions: ✓`);
  console.log(`   Seedphrase → active: ${seed.isActive}, expires: ${seed.expiresAt?.toDateString()}`);

  return true;
}

function fail(msg) {
  console.log(`❌ ${msg}`);
  return false;
}

/* ── Display ─────────────────────────────────────────────────────────────── */

function displayCredentials(creds) {
  const line = '═'.repeat(70);
  const dash = '─'.repeat(70);
  console.log(`\n${line}`);
  console.log('🔐  SUPER ADMIN CREATED SUCCESSFULLY');
  console.log(`${line}\n`);
  console.log('📋  CREDENTIALS — SAVE THESE NOW, THEY WILL NOT BE SHOWN AGAIN:\n');
  console.log(`   📧  Email:        ${creds.email}`);
  console.log(`   👤  Name:         ${creds.name}`);
  console.log(`   🏷️   Display Name: ${creds.displayName}`);
  console.log(`   🔑  Password:     ${creds.password}`);
  console.log(`   🎫  Seed Phrase:  ${creds.seedPhrase}`);
  console.log(`\n${dash}`);
  console.log('⚠️   SECURITY NOTES:');
  console.log(`${dash}`);
  console.log('   • Store in a secure password manager immediately');
  console.log('   • Seed phrase required for every login (3-factor auth)');
  console.log('   • Change the password after first login');
  console.log('   • Seed phrase expires in 1 year');
  console.log(`${line}\n`);
}

function displayEnvHint(creds) {
  console.log('📝  Optional .env variables for re-seeding:\n');
  console.log(`   SUPERADMIN_EMAIL="${creds.email}"`);
  console.log(`   SUPERADMIN_PASSWORD="${creds.password}"`);
  console.log(`   SUPERADMIN_SEED_PHRASE="${creds.seedPhrase}"\n`);
}

/* ── Main ────────────────────────────────────────────────────────────────── */

async function main() {
  console.log('\n🚀  Seeding Super Admin for Nomeo Blog\n');

  const args = process.argv.slice(2);
  const flag = (n)   => args.includes(n);
  const opt  = (n)   => args.find((a) => a.startsWith(`${n}=`))?.split('=').slice(1).join('=');

  const options = {
    force:       flag('--force'),
    email:       opt('--email'),
    name:        opt('--name'),
    displayName: opt('--display-name'),
    password:    opt('--password'),
    seedPhrase:  opt('--seed'),
    wordCount:   parseInt(opt('--words') || '16', 10),
  };

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅  Connected to MongoDB');

    const db       = mongoose.connection.db;
    const existing = await superadminExists(db);

    if (existing && !options.force) {
      console.log('\n⚠️   A super admin already exists:');
      console.log(`    Email: ${existing.email}, ID: ${existing._id}`);
      console.log('\n    Re-run with --force to replace it.\n');
      return;
    }

    if (existing && options.force) {
      console.log('⚠️   --force: removing existing super admin records...');
      const existingId = existing._id?.toString?.() ?? String(existing._id);
      await Promise.all([
        db.collection('user').deleteOne({ _id: existing._id }),
        db.collection('account').deleteMany({ userId: existingId }),
        db.collection('session').deleteMany({ userId: existingId }),
        Admin.deleteOne({ userId: existingId }),
        Seedphrase.deleteOne({ userId: existingId }),
      ]);
      console.log('✅  Removed existing super admin\n');
    }

    const email       = options.email       || process.env.SUPERADMIN_EMAIL        || 'superadmin@nomeo.com';
    const name        = options.name        || process.env.SUPERADMIN_NAME         || 'System Super Administrator';
    const displayName = options.displayName || process.env.SUPERADMIN_DISPLAY_NAME || 'Super Admin';
    const password    = options.password    || process.env.SUPERADMIN_PASSWORD     || generateSecurePassword(16);
    const seedPhrase  = options.seedPhrase  || process.env.SUPERADMIN_SEED_PHRASE  || generateSeedPhrase(options.wordCount);

    if (!email.includes('@'))                              throw new Error(`Invalid email: ${email}`);
    if (password.length < 12)                              throw new Error('Password must be at least 12 characters');
    if (seedPhrase.trim().split(/\s+/).length < 12)        throw new Error('Seed phrase must have at least 12 words');

    const auth   = createAuth(db);
    const result = await createSuperAdmin({ auth, db, email, name, displayName, password, seedPhrase });

    displayCredentials(result);
    displayEnvHint(result);

    await verifySetup(db, email, password);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    console.log(`\n🔗  Login at: ${baseUrl}/admin/login`);
    console.log('✅  Done!\n');
  } catch (err) {
    console.error('\n❌  Seeding failed:', err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { createSuperAdmin, superadminExists, generateSeedPhrase, generateSecurePassword };