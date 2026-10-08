-- Starred listings (shown on map pins, cards and the detail header)
ALTER TABLE sale_listings ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;
