ALTER TABLE payments
  ADD COLUMN period_start date,
  ADD COLUMN period_end date,
  ADD COLUMN attendance_total numeric(10,2) DEFAULT 0 NOT NULL,
  ADD COLUMN deduction_total numeric(10,2) DEFAULT 0 NOT NULL,
  ADD COLUMN total_days integer DEFAULT 0 NOT NULL,
  ADD COLUMN maintenance_count integer DEFAULT 0 NOT NULL;
