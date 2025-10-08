-- Create vehicle_attendance table
CREATE TABLE IF NOT EXISTS vehicle_attendance (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id varchar NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  project_id varchar REFERENCES projects(id) ON DELETE SET NULL,
  attendance_date date NOT NULL,
  status text NOT NULL DEFAULT 'present',
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

