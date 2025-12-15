ALTER TABLE customer_invoice_items
  ADD COLUMN sales_tax_rate numeric(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN sales_tax_amount numeric(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN total_amount numeric(10, 2) NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS customer_invoices_project_period_key
  ON customer_invoices (project_id, period_start, period_end);

CREATE UNIQUE INDEX IF NOT EXISTS customer_invoices_invoice_number_key
  ON customer_invoices (invoice_number)
  WHERE invoice_number IS NOT NULL;
