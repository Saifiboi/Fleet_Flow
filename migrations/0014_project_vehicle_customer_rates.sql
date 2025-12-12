CREATE TABLE IF NOT EXISTS project_vehicle_customer_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  rate numeric(10,2) NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(project_id, vehicle_id)
);

-- Backfill any existing assignment pricing into the dedicated rate table
INSERT INTO project_vehicle_customer_rates (project_id, customer_id, vehicle_id, rate)
SELECT a.project_id, p.customer_id, a.vehicle_id, a.customer_rate
FROM assignments a
JOIN projects p ON p.id = a.project_id
ON CONFLICT (project_id, vehicle_id) DO NOTHING;

ALTER TABLE assignments DROP COLUMN IF EXISTS customer_rate;
