-- Run this once in the Supabase SQL Editor to set up the carrie-me-away schema.
-- Dashboard → SQL Editor → paste and run.

-- ── For-sale listings (cached from Rentcast) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS sale_listings (
  id                   TEXT PRIMARY KEY,
  address              TEXT NOT NULL,
  city                 TEXT NOT NULL,
  lat                  DOUBLE PRECISION NOT NULL,
  lng                  DOUBLE PRECISION NOT NULL,
  price                INTEGER NOT NULL,
  property_type        TEXT NOT NULL,
  beds                 DOUBLE PRECISION NOT NULL,
  baths                DOUBLE PRECISION NOT NULL,
  sqft                 INTEGER,
  year_built           INTEGER,
  days_on_market       INTEGER DEFAULT 0,
  hoa_monthly          DOUBLE PRECISION DEFAULT 0,
  units                INTEGER,                          -- multi-family unit count (null = single-unit)
  photo_url            TEXT,
  community            TEXT,
  listing_url          TEXT,
  -- Rent estimate from Rentcast AVM
  estimated_rent       DOUBLE PRECISION,
  rent_low             DOUBLE PRECISION,
  rent_high            DOUBLE PRECISION,
  rent_confidence      TEXT DEFAULT 'Low',
  -- Per-listing fixed values (not affected by global assumptions)
  property_tax_annual  DOUBLE PRECISION,
  repairs              DOUBLE PRECISION DEFAULT 10000,
  -- Rental signals derived from AVM comps
  rental_evidence      TEXT DEFAULT 'Unknown',
  rental_demand        TEXT DEFAULT 'Insufficient Data',
  appreciation_rate    DOUBLE PRECISION DEFAULT 0.03,
  -- Metadata
  fetched_at           TIMESTAMPTZ DEFAULT NOW(),
  avm_fetched_at       TIMESTAMPTZ,
  is_manual            BOOLEAN DEFAULT false
);

-- ── For-rent listings (cached from Rentcast) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS rental_listings (
  id             TEXT PRIMARY KEY,
  address        TEXT NOT NULL,
  city           TEXT NOT NULL,
  lat            DOUBLE PRECISION NOT NULL,
  lng            DOUBLE PRECISION NOT NULL,
  monthly_rent   DOUBLE PRECISION NOT NULL,
  beds           DOUBLE PRECISION NOT NULL,
  baths          DOUBLE PRECISION NOT NULL,
  sqft           INTEGER,
  days_on_market INTEGER DEFAULT 0,
  community      TEXT,
  property_type  TEXT NOT NULL,
  fetched_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Refresh throttle state (single row) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_state (
  id                 INTEGER PRIMARY KEY DEFAULT 1,
  last_refreshed_at  TIMESTAMPTZ
);

-- ── Row Level Security (permissive — personal app, no auth) ───────────────────
ALTER TABLE sale_listings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_state   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON sale_listings   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON rental_listings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON refresh_state   FOR ALL USING (true) WITH CHECK (true);
