ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "employee_manage_access" TEXT[] NOT NULL DEFAULT ARRAY[]::text[];

CREATE TABLE IF NOT EXISTS "employee_projects" (
  "user_id" VARCHAR NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "project_id" VARCHAR NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  CONSTRAINT employee_projects_pk PRIMARY KEY ("user_id", "project_id")
);
