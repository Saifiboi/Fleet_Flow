CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id VARCHAR REFERENCES owners(id) ON DELETE SET NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'owner')),
    created_at TIMESTAMP DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_owner_id ON users(owner_id);
