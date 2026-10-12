-- Multi-family unit mix: bedrooms per unit (0 = studio). Each unit is priced from apartment/condo
-- rental comps with its own bedroom count (lib/rent-comps estimateUnitFromComps).
ALTER TABLE sale_listings ADD COLUMN IF NOT EXISTS unit_beds INTEGER[];
