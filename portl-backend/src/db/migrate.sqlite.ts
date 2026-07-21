import { sqlite } from "./index";

export function runMigrationsSqlite() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS societies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
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
      phone TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      role TEXT NOT NULL CHECK (role IN ('resident','guard','admin')),
      flat_id TEXT,
      flat_label TEXT,
      tower_name TEXT,
      avatar_url TEXT,
      language_pref TEXT DEFAULT 'en',
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    );

    CREATE TABLE IF NOT EXISTS push_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expo_push_token TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('visitor','notice','complaint','poll','general')),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      meta TEXT,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    );

    CREATE TABLE IF NOT EXISTS visitors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('guest','delivery','cab','service','other')),
      company TEXT,
      purpose TEXT,
      photo_url TEXT,
      flat_id TEXT,
      flat_label TEXT NOT NULL,
      tower_name TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','arrived','exited','left_at_gate')),
      registered_by_guard_id TEXT,
      approved_by_user_id TEXT,
      requested_at TEXT NOT NULL DEFAULT (current_timestamp),
      entry_time TEXT,
      exit_time TEXT
    );

    CREATE TABLE IF NOT EXISTS guest_passes (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      generated_by_user_id TEXT NOT NULL,
      guest_name TEXT NOT NULL,
      note TEXT,
      valid_from TEXT NOT NULL,
      valid_to TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      flat_label TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('Plumbing','Electrical','Security','Housekeeping','Parking','Other')),
      description TEXT,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','assigned','in_progress','resolved','closed')),
      raised_by_user_id TEXT NOT NULL,
      flat_label TEXT NOT NULL,
      assigned_to TEXT,
      created_at TEXT NOT NULL DEFAULT (current_timestamp),
      updated_at TEXT NOT NULL DEFAULT (current_timestamp)
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
      status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    );

    CREATE TABLE IF NOT EXISTS notices (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General' CHECK (category IN ('Maintenance','Event','Alert','General')),
      attachment_url TEXT,
      created_by_user_id TEXT NOT NULL,
      pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    );

    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      created_by_user_id TEXT NOT NULL,
      closes_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
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
      created_at TEXT NOT NULL DEFAULT (current_timestamp),
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
      status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid','unpaid')),
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      bill_id TEXT NOT NULL,
      flat_label TEXT NOT NULL,
      amount_paid INTEGER NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'razorpay',
      razorpay_order_id TEXT,
      razorpay_payment_id TEXT,
      status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created','paid','failed')),
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    );

    CREATE INDEX IF NOT EXISTS idx_visitors_flat ON visitors(flat_label);
    CREATE INDEX IF NOT EXISTS idx_visitors_status ON visitors(status);
    CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
    CREATE INDEX IF NOT EXISTS idx_bookings_amenity_date ON bookings(amenity_id, date);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);
  `);
}
