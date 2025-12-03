ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_role_check";
ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK (role IN ('admin', 'owner', 'employee'));
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "employee_access" TEXT[] NOT NULL DEFAULT ARRAY[]::text[];
UPDATE "users"
SET "employee_access" = ARRAY['vehicles', 'projects', 'assignments', 'attendance', 'maintenance']
WHERE role = 'employee' AND (employee_access IS NULL OR array_length(employee_access, 1) = 0);
