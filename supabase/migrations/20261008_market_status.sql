-- Redfin status badge captured by the bookmarklet: 'Active', 'Coming soon · Oct 15', 'Pending', 'Sold · …', 'Off market'
ALTER TABLE sale_listings ADD COLUMN IF NOT EXISTS market_status TEXT;
