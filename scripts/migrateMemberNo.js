require('dotenv').config();

const db = require('../config/database');

const run = async () => {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS member_no_seq START 1;
    `);

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS member_no VARCHAR(20);
    `);

    await client.query(`
      WITH ordered_users AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, name, id) AS rn
        FROM users
        WHERE member_no IS NULL OR member_no = ''
      )
      UPDATE users u
      SET member_no = 'VB-' || LPAD(ordered_users.rn::text, 3, '0')
      FROM ordered_users
      WHERE u.id = ordered_users.id;
    `);

    await client.query(`
      SELECT setval(
        'member_no_seq',
        GREATEST(
          COALESCE((
            SELECT MAX(NULLIF(regexp_replace(member_no, '\\D', '', 'g'), '')::int)
            FROM users
          ), 0),
          1
        )
      );
    `);

    await client.query(`
      ALTER TABLE users
      ALTER COLUMN member_no SET DEFAULT ('VB-' || LPAD(nextval('member_no_seq')::text, 3, '0'));
    `);

    await client.query(`
      ALTER TABLE users
      ALTER COLUMN member_no SET NOT NULL;
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND indexname = 'users_member_no_unique_idx'
        ) THEN
          CREATE UNIQUE INDEX users_member_no_unique_idx ON users(member_no);
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND indexname = 'idx_users_member_no'
        ) THEN
          CREATE INDEX idx_users_member_no ON users(member_no);
        END IF;
      END $$;
    `);

    await client.query('COMMIT');

    console.log('✅ member_no migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ member_no migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await db.pool.end();
  }
};

run();
