CREATE TABLE IF NOT EXISTS customer_invoice_payments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id varchar NOT NULL REFERENCES customer_invoices(id) ON DELETE CASCADE,
  amount numeric(10, 2) NOT NULL,
  method text NOT NULL DEFAULT 'cash',
  reference_number text,
  notes text,
  recorded_by text,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_invoice_payments_invoice_id_idx
  ON customer_invoice_payments (invoice_id);
