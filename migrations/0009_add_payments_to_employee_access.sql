UPDATE "users"
SET "employee_access" = array_append(employee_access, 'payments')
WHERE role = 'employee'
  AND NOT (employee_access @> ARRAY['payments'])
  AND employee_access @> ARRAY['vehicles', 'projects', 'assignments', 'attendance', 'maintenance'];
