ALTER TABLE maintenance_records
ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false;

UPDATE maintenance_records
SET is_paid = false
WHERE is_paid IS NULL;
