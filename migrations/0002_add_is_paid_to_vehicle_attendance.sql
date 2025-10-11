ALTER TABLE vehicle_attendance
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false;

-- Ensure existing attendance records are flagged as unpaid by default
UPDATE vehicle_attendance
SET is_paid = false
WHERE is_paid IS NULL;
