ALTER TABLE payments
ADD COLUMN owner_id varchar;

UPDATE payments p
SET owner_id = v.owner_id
FROM assignments a
JOIN vehicles v ON v.id = a.vehicle_id
WHERE p.assignment_id = a.id AND p.owner_id IS NULL;

ALTER TABLE payments
ALTER COLUMN owner_id SET NOT NULL,
ADD CONSTRAINT payments_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES owners(id) ON UPDATE CASCADE;

CREATE TABLE payment_transactions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id varchar NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  amount numeric(10, 2) NOT NULL,
  method text NOT NULL DEFAULT 'cash',
  reference_number text,
  notes text,
  recorded_by text,
  transaction_date date NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX payment_transactions_payment_id_idx ON payment_transactions(payment_id);
CREATE INDEX payment_transactions_transaction_date_idx ON payment_transactions(transaction_date);
