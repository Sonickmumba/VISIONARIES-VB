/**
 * Seed script — populates the database with realistic demo data.
 * Safe to re-run: all inserts use ON CONFLICT DO NOTHING.
 *
 * Usage: node scripts/seed.js
 */
require('dotenv').config();

const bcrypt = require('bcryptjs');
const db = require('../config/database');

// ─── Static UUIDs (deterministic so the script is idempotent) ───────────────

const IDS = {
  // Users
  admin:   'a0000000-0000-0000-0000-000000000001',
  alice:   'a0000000-0000-0000-0000-000000000002',
  brian:   'a0000000-0000-0000-0000-000000000003',
  chanda:  'a0000000-0000-0000-0000-000000000004',
  daisy:   'a0000000-0000-0000-0000-000000000005',
  evans:   'a0000000-0000-0000-0000-000000000006',
  faith:   'a0000000-0000-0000-0000-000000000007',
  grace:   'a0000000-0000-0000-0000-000000000008',
  henry:   'a0000000-0000-0000-0000-000000000009',
  irene:   'a0000000-0000-0000-0000-000000000010',
  james:   'a0000000-0000-0000-0000-000000000011',

  // Groups
  groupAlpha: 'b0000000-0000-0000-0000-000000000001',
  groupBeta:  'b0000000-0000-0000-0000-000000000002',

  // Cycles
  cycleAlpha: 'c0000000-0000-0000-0000-000000000001',
  cycleBeta:  'c0000000-0000-0000-0000-000000000002',

  // Loans
  loan1: 'd0000000-0000-0000-0000-000000000001', // alice   – disbursed
  loan2: 'd0000000-0000-0000-0000-000000000002', // brian   – repaid
  loan3: 'd0000000-0000-0000-0000-000000000003', // chanda  – pending
  loan4: 'd0000000-0000-0000-0000-000000000004', // evans   – approved
  loan5: 'd0000000-0000-0000-0000-000000000005', // grace   – disbursed

  // Loan repayments
  repayment1: 'e0000000-0000-0000-0000-000000000001',
  repayment2: 'e0000000-0000-0000-0000-000000000002',
  repayment3: 'e0000000-0000-0000-0000-000000000003',
};

const DEMO_PASSWORD = 'Demo@12345';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const hash = (password) => bcrypt.hash(password, 12);

async function upsertUser(client, { id, email, name, phone, role, nationalId }) {
  const passwordHash = await hash(DEMO_PASSWORD);
  await client.query(
    `INSERT INTO users (id, email, password_hash, name, phone, role, national_id, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)
     ON CONFLICT (id) DO NOTHING`,
    [id, email, passwordHash, name, phone, role, nationalId]
  );
}

// ─── Main seed ───────────────────────────────────────────────────────────────

async function seed() {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // ── 1. Users ──────────────────────────────────────────────────────────────
    console.log('👤 Seeding users…');

    const users = [
      { id: IDS.admin,  email: 'admin@vb.com',         name: 'Mwanje Tembo',     phone: '0971100001', role: 'admin',  nationalId: '200101/11/1' },
      { id: IDS.alice,  email: 'alice@vb.com',          name: 'Alice Banda',      phone: '0971100002', role: 'member', nationalId: '199805/22/2' },
      { id: IDS.brian,  email: 'brian@vb.com',          name: 'Brian Zulu',       phone: '0971100003', role: 'member', nationalId: '199612/33/3' },
      { id: IDS.chanda, email: 'chanda@vb.com',         name: 'Chanda Mutale',    phone: '0971100004', role: 'member', nationalId: '200003/44/4' },
      { id: IDS.daisy,  email: 'daisy@vb.com',          name: 'Daisy Phiri',      phone: '0971100005', role: 'member', nationalId: '199911/55/5' },
      { id: IDS.evans,  email: 'evans@vb.com',          name: 'Evans Mwansa',     phone: '0971100006', role: 'member', nationalId: '200207/66/6' },
      { id: IDS.faith,  email: 'faith@vb.com',          name: 'Faith Kabwe',      phone: '0971100007', role: 'member', nationalId: '200104/77/7' },
      { id: IDS.grace,  email: 'grace@vb.com',          name: 'Grace Mulenga',    phone: '0971100008', role: 'member', nationalId: '199708/88/8' },
      { id: IDS.henry,  email: 'henry@vb.com',          name: 'Henry Lungu',      phone: '0971100009', role: 'member', nationalId: '200309/99/9' },
      { id: IDS.irene,  email: 'irene@vb.com',          name: 'Irene Chisanga',   phone: '0971100010', role: 'member', nationalId: '199810/10/A' },
      { id: IDS.james,  email: 'james@vb.com',          name: 'James Mwila',      phone: '0971100011', role: 'member', nationalId: '200011/11/B' },
    ];

    for (const user of users) {
      await upsertUser(client, user);
    }

    // ── 2. Groups ─────────────────────────────────────────────────────────────
    console.log('👥 Seeding groups…');

    await client.query(
      `INSERT INTO groups (id, name, description, leader_id, is_active)
       VALUES
         ($1, 'Alpha Group', 'First savings circle – Lusaka Northmead', $2, true),
         ($3, 'Beta Group',  'Second savings circle – Lusaka Kabulonga', $4, true)
       ON CONFLICT (id) DO NOTHING`,
      [IDS.groupAlpha, IDS.alice, IDS.groupBeta, IDS.grace]
    );

    // ── 3. Group members ──────────────────────────────────────────────────────
    console.log('🔗 Seeding group membership…');

    const alphaMembers = [IDS.alice, IDS.brian, IDS.chanda, IDS.daisy, IDS.evans];
    const betaMembers  = [IDS.faith, IDS.grace, IDS.henry, IDS.irene, IDS.james];

    for (const userId of alphaMembers) {
      await client.query(
        `INSERT INTO group_members (group_id, user_id, is_active)
         VALUES ($1, $2, true)
         ON CONFLICT (group_id, user_id) DO NOTHING`,
        [IDS.groupAlpha, userId]
      );
    }

    for (const userId of betaMembers) {
      await client.query(
        `INSERT INTO group_members (group_id, user_id, is_active)
         VALUES ($1, $2, true)
         ON CONFLICT (group_id, user_id) DO NOTHING`,
        [IDS.groupBeta, userId]
      );
    }

    // ── 4. Cycles ─────────────────────────────────────────────────────────────
    console.log('🔄 Seeding cycles…');

    await client.query(
      `INSERT INTO cycles (id, group_id, name, start_date, end_date, status, total_savings, total_interest, total_fines)
       VALUES
         ($1, $2, 'Cycle 1 – 2026', '2026-01-01', '2026-06-30', 'active', 0, 0, 0),
         ($3, $4, 'Cycle 1 – 2026', '2026-01-01', '2026-06-30', 'active', 0, 0, 0)
       ON CONFLICT (id) DO NOTHING`,
      [IDS.cycleAlpha, IDS.groupAlpha, IDS.cycleBeta, IDS.groupBeta]
    );

    // ── 5. Savings ────────────────────────────────────────────────────────────
    console.log('💰 Seeding savings records…');

    // Format: [cycleId, userId, amount, month, year, status]
    const savingsRecords = [
      // Alpha group — Alice
      [IDS.cycleAlpha, IDS.alice,  30000, 1, 2026, 'verified'],
      [IDS.cycleAlpha, IDS.alice,  30000, 2, 2026, 'verified'],
      [IDS.cycleAlpha, IDS.alice,  30000, 3, 2026, 'pending'],
      // Alpha group — Brian
      [IDS.cycleAlpha, IDS.brian,  25000, 1, 2026, 'verified'],
      [IDS.cycleAlpha, IDS.brian,  25000, 2, 2026, 'verified'],
      [IDS.cycleAlpha, IDS.brian,  25000, 3, 2026, 'rejected'],
      // Alpha group — Chanda
      [IDS.cycleAlpha, IDS.chanda, 30000, 1, 2026, 'verified'],
      [IDS.cycleAlpha, IDS.chanda, 28000, 2, 2026, 'pending'],
      // Alpha group — Daisy
      [IDS.cycleAlpha, IDS.daisy,  22000, 1, 2026, 'verified'],
      [IDS.cycleAlpha, IDS.daisy,  22000, 2, 2026, 'verified'],
      [IDS.cycleAlpha, IDS.daisy,  22000, 3, 2026, 'pending'],
      // Alpha group — Evans
      [IDS.cycleAlpha, IDS.evans,  27000, 1, 2026, 'verified'],
      [IDS.cycleAlpha, IDS.evans,  27000, 2, 2026, 'verified'],
      // Beta group — Faith
      [IDS.cycleBeta,  IDS.faith,  30000, 1, 2026, 'verified'],
      [IDS.cycleBeta,  IDS.faith,  30000, 2, 2026, 'verified'],
      [IDS.cycleBeta,  IDS.faith,  30000, 3, 2026, 'pending'],
      // Beta group — Grace
      [IDS.cycleBeta,  IDS.grace,  30000, 1, 2026, 'verified'],
      [IDS.cycleBeta,  IDS.grace,  30000, 2, 2026, 'verified'],
      // Beta group — Henry
      [IDS.cycleBeta,  IDS.henry,  20000, 1, 2026, 'verified'],
      [IDS.cycleBeta,  IDS.henry,  20000, 2, 2026, 'verified'],
      [IDS.cycleBeta,  IDS.henry,  20000, 3, 2026, 'pending'],
      // Beta group — Irene
      [IDS.cycleBeta,  IDS.irene,  24000, 1, 2026, 'verified'],
      [IDS.cycleBeta,  IDS.irene,  24000, 2, 2026, 'pending'],
      // Beta group — James
      [IDS.cycleBeta,  IDS.james,  26000, 1, 2026, 'verified'],
      [IDS.cycleBeta,  IDS.james,  26000, 2, 2026, 'verified'],
      [IDS.cycleBeta,  IDS.james,  26000, 3, 2026, 'pending'],
    ];

    for (const [cycleId, userId, amount, month, year, status] of savingsRecords) {
      const verifiedAt = status === 'verified' ? new Date().toISOString() : null;
      const verifiedBy = status === 'verified' ? IDS.admin : null;

      await client.query(
        `INSERT INTO savings (cycle_id, user_id, amount, month, year, status, payment_date, verified_by, verified_at, interest_earned)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, $8, 0)
         ON CONFLICT (cycle_id, user_id, month, year) DO UPDATE SET
           amount = EXCLUDED.amount,
           status = EXCLUDED.status,
           verified_by = EXCLUDED.verified_by,
           verified_at = EXCLUDED.verified_at,
           interest_earned = EXCLUDED.interest_earned,
           payment_date = EXCLUDED.payment_date,
           updated_at = CURRENT_TIMESTAMP`,
        [cycleId, userId, amount, month, year, status, verifiedBy, verifiedAt]
      );
    }

    // ── 6. Loans ──────────────────────────────────────────────────────────────
    console.log('🏦 Seeding loans…');

    // interest = 15% of principal (aligned with HelpPage examples)
    const applyInterest = (principal) => {
      const interest = principal * 0.15;
      return { interest, total: principal + interest };
    };

    const loans = [
      {
        id: IDS.loan1, cycleId: IDS.cycleAlpha, userId: IDS.alice,
        amount: 25000, purpose: 'Working capital for small grocery shop',
        status: 'disbursed',
        approvedBy: IDS.admin, approvedDate: '2026-01-20',
        disbursedDate: '2026-01-22', dueDate: '2026-06-22',
        amountRepaid: 10000,
      },
      {
        id: IDS.loan2, cycleId: IDS.cycleAlpha, userId: IDS.brian,
        amount: 15000, purpose: 'School fees for children',
        status: 'repaid',
        approvedBy: IDS.admin, approvedDate: '2026-01-18',
        disbursedDate: '2026-01-20', dueDate: '2026-04-20',
        amountRepaid: 17250, repaymentDate: '2026-03-15',
      },
      {
        id: IDS.loan3, cycleId: IDS.cycleAlpha, userId: IDS.chanda,
        amount: 8000, purpose: 'Purchase of sewing machine',
        status: 'pending',
      },
      {
        id: IDS.loan4, cycleId: IDS.cycleBeta, userId: IDS.henry,
        amount: 20000, purpose: 'Agricultural inputs – maize seed & fertiliser',
        status: 'approved',
        approvedBy: IDS.admin, approvedDate: '2026-02-05',
        dueDate: '2026-07-05',
      },
      {
        id: IDS.loan5, cycleId: IDS.cycleBeta, userId: IDS.grace,
        amount: 6000, purpose: 'Stock for chitenge fabric business',
        status: 'disbursed',
        approvedBy: IDS.admin, approvedDate: '2026-02-10',
        disbursedDate: '2026-02-12', dueDate: '2026-07-12',
        amountRepaid: 1500,
      },
    ];

    for (const loan of loans) {
      const { interest, total } = applyInterest(loan.amount);

      await client.query(
        `INSERT INTO loans (
           id, cycle_id, user_id, amount, interest_amount, total_amount, purpose, status,
           approved_by, approved_date, disbursed_date, due_date, repayment_date, amount_repaid
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (id) DO UPDATE SET
           cycle_id = EXCLUDED.cycle_id,
           user_id = EXCLUDED.user_id,
           amount = EXCLUDED.amount,
           interest_amount = EXCLUDED.interest_amount,
           total_amount = EXCLUDED.total_amount,
           purpose = EXCLUDED.purpose,
           status = EXCLUDED.status,
           approved_by = EXCLUDED.approved_by,
           approved_date = EXCLUDED.approved_date,
           disbursed_date = EXCLUDED.disbursed_date,
           due_date = EXCLUDED.due_date,
           repayment_date = EXCLUDED.repayment_date,
           amount_repaid = EXCLUDED.amount_repaid,
           updated_at = CURRENT_TIMESTAMP`,
        [
          loan.id, loan.cycleId, loan.userId,
          loan.amount, interest, total, loan.purpose, loan.status,
          loan.approvedBy || null, loan.approvedDate || null,
          loan.disbursedDate || null, loan.dueDate || null,
          loan.repaymentDate || null, loan.amountRepaid || 0,
        ]
      );
    }

    // ── 7. Loan repayments ────────────────────────────────────────────────────
    console.log('💳 Seeding loan repayments…');

    await client.query(
      `DELETE FROM loan_repayments
       WHERE loan_id IN ($1, $2, $3)`,
      [IDS.loan1, IDS.loan2, IDS.loan5]
    );

    // Repayment for loan2 (Brian – repaid)
    await client.query(
      `INSERT INTO loan_repayments (id, loan_id, amount, status, verified_by, verified_at, notes)
       VALUES ($1, $2, $3, 'verified', $4, CURRENT_TIMESTAMP, 'Full repayment including interest')
       ON CONFLICT (id) DO UPDATE SET
         loan_id = EXCLUDED.loan_id,
         amount = EXCLUDED.amount,
         status = EXCLUDED.status,
         verified_by = EXCLUDED.verified_by,
         verified_at = EXCLUDED.verified_at,
         notes = EXCLUDED.notes,
         updated_at = CURRENT_TIMESTAMP`,
      [IDS.repayment1, IDS.loan2, 17250, IDS.admin]
    );

    // Partial repayment for loan1 (Alice – disbursed)
    await client.query(
      `INSERT INTO loan_repayments (id, loan_id, amount, status, verified_by, verified_at, notes)
       VALUES ($1, $2, $3, 'verified', $4, CURRENT_TIMESTAMP, 'First instalment')
       ON CONFLICT (id) DO UPDATE SET
         loan_id = EXCLUDED.loan_id,
         amount = EXCLUDED.amount,
         status = EXCLUDED.status,
         verified_by = EXCLUDED.verified_by,
         verified_at = EXCLUDED.verified_at,
         notes = EXCLUDED.notes,
         updated_at = CURRENT_TIMESTAMP`,
      [IDS.repayment2, IDS.loan1, 10000, IDS.admin]
    );

    // Partial repayment for loan5 (Grace – disbursed)
    await client.query(
      `INSERT INTO loan_repayments (id, loan_id, amount, status, notes)
       VALUES ($1, $2, $3, 'pending', 'First instalment – pending admin verification')
       ON CONFLICT (id) DO UPDATE SET
         loan_id = EXCLUDED.loan_id,
         amount = EXCLUDED.amount,
         status = EXCLUDED.status,
         notes = EXCLUDED.notes,
         updated_at = CURRENT_TIMESTAMP`,
      [IDS.repayment3, IDS.loan5, 1500]
    );

    // ── 8. Update cycle totals ─────────────────────────────────────────────────
    console.log('📊 Updating cycle totals…');

    await client.query(
      `UPDATE cycles
       SET total_savings = COALESCE((
             SELECT SUM(amount)
             FROM savings
             WHERE cycle_id = cycles.id AND status = 'verified'
           ), 0),
           total_interest = COALESCE((
             SELECT SUM(interest_amount)
             FROM loans
             WHERE cycle_id = cycles.id
               AND status IN ('repaid', 'defaulted')
           ), 0),
           updated_at = CURRENT_TIMESTAMP
       WHERE id IN ($1, $2)`,
      [IDS.cycleAlpha, IDS.cycleBeta]
    );

    // ── 9. Notifications ───────────────────────────────────────────────────────
    console.log('🔔 Seeding notifications…');

    await client.query(
      `DELETE FROM notifications
       WHERE user_id IN ($1,$2,$3,$4,$5,$6,$7,$8)
         AND title IN (
           'Loan Application',
           'New Savings Submission',
           'Loan Disbursed',
           'Savings Verified',
           'Loan Approved',
           'Repayment Pending',
           'Application Received'
         )`,
      [IDS.admin, IDS.alice, IDS.brian, IDS.chanda, IDS.evans, IDS.grace, IDS.henry, IDS.faith]
    );

    const notifications = [
      { userId: IDS.admin, type: 'system_alert',      title: 'Loan Application',        message: 'Chanda Mutale has applied for a loan of K8,000.00. Please review.' },
      { userId: IDS.admin, type: 'payment_due',        title: 'New Savings Submission',  message: 'Alice Banda submitted savings of K30,000.00 for March 2026.' },
      { userId: IDS.admin, type: 'payment_due',        title: 'New Savings Submission',  message: 'Brian Zulu submitted savings of K25,000.00 for March 2026 — flagged for review.' },
      { userId: IDS.alice, type: 'loan_approved',      title: 'Loan Disbursed',          message: 'Your loan of K25,000.00 has been disbursed. Due date: 22 Jun 2026.' },
      { userId: IDS.brian, type: 'payment_verified',   title: 'Savings Verified',        message: 'Your savings of K25,000.00 for Feb 2026 have been verified.' },
      { userId: IDS.henry, type: 'loan_approved',      title: 'Loan Approved',           message: 'Your loan application of K20,000.00 has been approved. Awaiting disbursement.' },
      { userId: IDS.grace, type: 'system_alert',       title: 'Repayment Pending',       message: 'Your loan repayment of K1,500.00 is pending verification.' },
      { userId: IDS.chanda, type: 'system_alert',      title: 'Application Received',    message: 'Your loan application for K8,000.00 is under review.' },
    ];

    for (const notif of notifications) {
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message, is_read)
         VALUES ($1, $2, $3, $4, false)`,
        [notif.userId, notif.type, notif.title, notif.message]
      );
    }

    // ── 10. Transactions (ledger) ──────────────────────────────────────────────
    console.log('📒 Seeding transaction ledger…');

    await client.query(
      `DELETE FROM transactions
       WHERE cycle_id IN ($1, $2)
         AND description IN (
           'Jan savings – Alice Banda',
           'Feb savings – Alice Banda',
           'Loan disbursement – Alice Banda',
           'Jan savings – Brian Zulu',
           'Feb savings – Brian Zulu',
           'Loan full repayment – Brian Zulu',
           'Jan savings – Chanda Mutale',
           'Jan savings – Daisy Phiri',
           'Feb savings – Daisy Phiri',
           'Jan savings – Evans Mwansa',
           'Jan savings – Faith Kabwe',
           'Feb savings – Faith Kabwe',
           'Jan savings – Grace Mulenga',
           'Loan disbursement – Grace Mulenga',
           'Jan savings – Henry Lungu',
           'Jan savings – Irene Chisanga',
           'Jan savings – James Mwila',
           'Feb savings – James Mwila'
         )`,
      [IDS.cycleAlpha, IDS.cycleBeta]
    );

    const txEntries = [
      { userId: IDS.alice,  cycleId: IDS.cycleAlpha, type: 'savings',           amount: 30000,  balance: 30000,  desc: 'Jan savings – Alice Banda' },
      { userId: IDS.alice,  cycleId: IDS.cycleAlpha, type: 'savings',           amount: 30000,  balance: 60000, desc: 'Feb savings – Alice Banda' },
      { userId: IDS.alice,  cycleId: IDS.cycleAlpha, type: 'loan_disbursement', amount: 25000,  balance: 85000, desc: 'Loan disbursement – Alice Banda' },
      { userId: IDS.brian,  cycleId: IDS.cycleAlpha, type: 'savings',           amount: 25000,  balance: 25000, desc: 'Jan savings – Brian Zulu' },
      { userId: IDS.brian,  cycleId: IDS.cycleAlpha, type: 'savings',           amount: 25000,  balance: 50000, desc: 'Feb savings – Brian Zulu' },
      { userId: IDS.brian,  cycleId: IDS.cycleAlpha, type: 'loan_repayment',    amount: 17250, balance: 0,   desc: 'Loan full repayment – Brian Zulu' },
      { userId: IDS.chanda, cycleId: IDS.cycleAlpha, type: 'savings',           amount: 30000,  balance: 30000, desc: 'Jan savings – Chanda Mutale' },
      { userId: IDS.daisy,  cycleId: IDS.cycleAlpha, type: 'savings',           amount: 22000,  balance: 22000, desc: 'Jan savings – Daisy Phiri' },
      { userId: IDS.daisy,  cycleId: IDS.cycleAlpha, type: 'savings',           amount: 22000,  balance: 44000, desc: 'Feb savings – Daisy Phiri' },
      { userId: IDS.evans,  cycleId: IDS.cycleAlpha, type: 'savings',           amount: 27000,  balance: 27000, desc: 'Jan savings – Evans Mwansa' },
      { userId: IDS.faith,  cycleId: IDS.cycleBeta,  type: 'savings',           amount: 30000,  balance: 30000, desc: 'Jan savings – Faith Kabwe' },
      { userId: IDS.faith,  cycleId: IDS.cycleBeta,  type: 'savings',           amount: 30000,  balance: 60000, desc: 'Feb savings – Faith Kabwe' },
      { userId: IDS.grace,  cycleId: IDS.cycleBeta,  type: 'savings',           amount: 30000,  balance: 30000, desc: 'Jan savings – Grace Mulenga' },
      { userId: IDS.grace,  cycleId: IDS.cycleBeta,  type: 'loan_disbursement', amount: 6000,   balance: 36000, desc: 'Loan disbursement – Grace Mulenga' },
      { userId: IDS.henry,  cycleId: IDS.cycleBeta,  type: 'savings',           amount: 20000,  balance: 20000, desc: 'Jan savings – Henry Lungu' },
      { userId: IDS.irene,  cycleId: IDS.cycleBeta,  type: 'savings',           amount: 24000,  balance: 24000, desc: 'Jan savings – Irene Chisanga' },
      { userId: IDS.james,  cycleId: IDS.cycleBeta,  type: 'savings',           amount: 26000,  balance: 26000, desc: 'Jan savings – James Mwila' },
      { userId: IDS.james,  cycleId: IDS.cycleBeta,  type: 'savings',           amount: 26000,  balance: 52000, desc: 'Feb savings – James Mwila' },
    ];

    for (const tx of txEntries) {
      await client.query(
        `INSERT INTO transactions (cycle_id, user_id, type, amount, balance_after, description, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [tx.cycleId, tx.userId, tx.type, tx.amount, tx.balance, tx.desc, IDS.admin]
      );
    }

    await client.query('COMMIT');

    console.log('\n✅ Seed complete!\n');
    console.log('Demo login credentials (all passwords: Demo@12345)');
    console.log('─────────────────────────────────────────────────────');
    console.log('  super_admin : Use the bootstrapped super admin email');
    console.log('  admin       : admin@vb.com');
    console.log('  member      : alice@vb.com  (also brian, chanda, daisy, evans, faith, grace, henry, irene, james  @vb.com)');
    console.log('─────────────────────────────────────────────────────\n');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', error.message);
    throw error;
  } finally {
    client.release();
    await db.pool.end();
  }
}

seed().catch(() => process.exit(1));
