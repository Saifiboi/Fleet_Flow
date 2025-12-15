CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  address text,
  created_at timestamp DEFAULT now() NOT NULL
);

ALTER TABLE projects ADD COLUMN customer_id uuid;

WITH default_customer AS (
  INSERT INTO customers (name)
  VALUES ('Unassigned Customer')
  RETURNING id
)
UPDATE projects SET customer_id = (SELECT id FROM default_customer) WHERE customer_id IS NULL;

ALTER TABLE projects ALTER COLUMN customer_id SET NOT NULL;

ALTER TABLE projects
  ADD CONSTRAINT projects_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT;
