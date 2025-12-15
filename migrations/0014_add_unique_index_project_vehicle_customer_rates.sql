DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'project_vehicle_customer_rates_project_id_vehicle_id_key'
  ) THEN
    CREATE UNIQUE INDEX project_vehicle_customer_rates_project_id_vehicle_id_key
      ON project_vehicle_customer_rates(project_id, vehicle_id);
  END IF;
END $$;
