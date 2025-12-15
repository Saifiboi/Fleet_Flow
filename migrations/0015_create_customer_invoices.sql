CREATE TABLE customer_invoices (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id VARCHAR(255) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    adjustment DECIMAL(10,2) NOT NULL DEFAULT 0,
    sales_tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    sales_tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    invoice_number TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    due_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE customer_invoice_items (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id VARCHAR(255) NOT NULL REFERENCES customer_invoices(id) ON DELETE CASCADE,
    vehicle_id VARCHAR(255) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    month_label TEXT,
    present_days INTEGER NOT NULL DEFAULT 0,
    daily_rate DECIMAL(10,2) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
