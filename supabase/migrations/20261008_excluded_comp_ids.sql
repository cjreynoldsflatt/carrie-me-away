-- Rental comps the user has ruled out for a specific sale listing's rent estimate
ALTER TABLE sale_listings ADD COLUMN IF NOT EXISTS excluded_comp_ids TEXT[] NOT NULL DEFAULT '{}';
