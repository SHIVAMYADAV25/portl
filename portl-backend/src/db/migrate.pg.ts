import { pgPool } from "./index";

export async function runMigrationsPg() {
  const client = await pgPool.connect();
  try {
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE role AS ENUM ('resident','guard','admin');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN
        CREATE TYPE visitor_category AS ENUM ('guest','delivery','cab','service','other');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN
        CREATE TYPE visitor_status AS ENUM ('pending','approved','rejected','arrived','exited','left_at_gate');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN
        CREATE TYPE complaint_category AS ENUM ('Plumbing','Electrical','Security','Housekeeping','Parking','Other');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN
        CREATE TYPE complaint_status AS ENUM ('open','assigned','in_progress','resolved','closed');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN
        CREATE TYPE booking_status AS ENUM ('confirmed','cancelled');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN
        CREATE TYPE notice_category AS ENUM ('Maintenance','Event','Alert','General');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN
        CREATE TYPE bill_status AS ENUM ('paid','unpaid');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM ('created','paid','failed');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN
        CREATE TYPE notification_type AS ENUM ('visitor','notice','complaint','poll','general');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN
        CREATE TYPE user_status AS ENUM ('pending_invitation','active','disabled');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN
        CREATE TYPE owner_tenant AS ENUM ('owner','tenant');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      CREATE TABLE IF NOT EXISTS societies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS towers (
        id TEXT PRIMARY KEY,
        society_id TEXT NOT NULL,
        name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS flats (
        id TEXT PRIMARY KEY,
        tower_id TEXT NOT NULL,
        number TEXT NOT NULL,
        label TEXT NOT NULL,
        owner_name TEXT
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        password_hash TEXT,
        role role NOT NULL,
        status user_status NOT NULL DEFAULT 'active',
        society_id TEXT NOT NULL DEFAULT '',
        invited_by_user_id TEXT,
        flat_id TEXT,
        flat_label TEXT,
        tower_name TEXT,
        owner_or_tenant owner_tenant,
        gate TEXT,
        shift TEXT,
        avatar_url TEXT,
        language_pref TEXT DEFAULT 'en',
        created_at TIMESTAMP NOT NULL DEFAULT now()
      );
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS status user_status NOT NULL DEFAULT 'active';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS society_id TEXT NOT NULL DEFAULT '';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by_user_id TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS owner_or_tenant owner_tenant;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS gate TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS shift TEXT;

      CREATE TABLE IF NOT EXISTS invitations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        society_id TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS push_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expo_push_token TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type notification_type NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        meta TEXT,
        read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS visitors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category visitor_category NOT NULL,
        company TEXT,
        purpose TEXT,
        photo_url TEXT,
        flat_id TEXT,
        flat_label TEXT NOT NULL,
        tower_name TEXT,
        status visitor_status NOT NULL DEFAULT 'pending',
        registered_by_guard_id TEXT,
        approved_by_user_id TEXT,
        requested_at TIMESTAMP NOT NULL DEFAULT now(),
        entry_time TIMESTAMP,
        exit_time TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS guest_passes (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        generated_by_user_id TEXT NOT NULL,
        guest_name TEXT NOT NULL,
        note TEXT,
        valid_from TIMESTAMP NOT NULL,
        valid_to TIMESTAMP NOT NULL,
        used BOOLEAN NOT NULL DEFAULT false,
        flat_label TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS complaints (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category complaint_category NOT NULL,
        description TEXT,
        status complaint_status NOT NULL DEFAULT 'open',
        raised_by_user_id TEXT NOT NULL,
        flat_label TEXT NOT NULL,
        assigned_to TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS amenities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT 'grid',
        location TEXT,
        open_time TEXT NOT NULL DEFAULT '06:00',
        close_time TEXT NOT NULL DEFAULT '22:00',
        slot_minutes INTEGER NOT NULL DEFAULT 60
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        amenity_id TEXT NOT NULL,
        flat_label TEXT NOT NULL,
        booked_by_user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        status booking_status NOT NULL DEFAULT 'confirmed',
        created_at TIMESTAMP NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS notices (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        category notice_category NOT NULL DEFAULT 'General',
        attachment_url TEXT,
        created_by_user_id TEXT NOT NULL,
        pinned BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS polls (
        id TEXT PRIMARY KEY,
        question TEXT NOT NULL,
        created_by_user_id TEXT NOT NULL,
        closes_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS poll_options (
        id TEXT PRIMARY KEY,
        poll_id TEXT NOT NULL,
        label TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS votes (
        id TEXT PRIMARY KEY,
        poll_id TEXT NOT NULL,
        option_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        UNIQUE(poll_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS staff (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        phone TEXT NOT NULL,
        rating REAL,
        photo_url TEXT
      );

      CREATE TABLE IF NOT EXISTS bills (
        id TEXT PRIMARY KEY,
        flat_label TEXT NOT NULL,
        title TEXT NOT NULL,
        amount INTEGER NOT NULL,
        period TEXT,
        due_date TEXT NOT NULL,
        status bill_status NOT NULL DEFAULT 'unpaid',
        created_at TIMESTAMP NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        bill_id TEXT NOT NULL,
        flat_label TEXT NOT NULL,
        amount_paid INTEGER NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'razorpay',
        razorpay_order_id TEXT,
        razorpay_payment_id TEXT,
        status payment_status NOT NULL DEFAULT 'created',
        created_at TIMESTAMP NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_visitors_flat ON visitors(flat_label);
      CREATE INDEX IF NOT EXISTS idx_visitors_status ON visitors(status);
      CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
      CREATE INDEX IF NOT EXISTS idx_bookings_amenity_date ON bookings(amenity_id, date);
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_invitations_token_hash ON invitations(token_hash);
    `);
  } finally {
    client.release();
  }
}
