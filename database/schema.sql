CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(50) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'operator', 'analyst', 'consultant', 'auditor')),
    email           VARCHAR(100) UNIQUE NOT NULL,
    is_active       BOOLEAN DEFAULT true,
    last_login      TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);


-- ОТДЕЛЫ БАНКА

CREATE TABLE IF NOT EXISTS departments (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);


-- СОТРУДНИКИ

CREATE TABLE IF NOT EXISTS employees (
    id              SERIAL PRIMARY KEY,
    last_name       VARCHAR(50) NOT NULL,
    first_name      VARCHAR(50) NOT NULL,
    middle_name     VARCHAR(50),
    position        VARCHAR(100) NOT NULL,
    department_id   INTEGER REFERENCES departments(id),
    phone           VARCHAR(20),
    email           VARCHAR(100),
    hire_date       DATE NOT NULL,
    salary          NUMERIC(12, 2) NOT NULL,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);


-- КЛИЕНТЫ

CREATE TABLE IF NOT EXISTS clients (
    id              SERIAL PRIMARY KEY,
    last_name       VARCHAR(50) NOT NULL,
    first_name      VARCHAR(50) NOT NULL,
    middle_name     VARCHAR(50),
    birth_date      DATE NOT NULL,
    passport_series VARCHAR(4) NOT NULL,
    passport_number VARCHAR(6) NOT NULL,
    phone           VARCHAR(20) NOT NULL,
    email           VARCHAR(100),
    address         TEXT NOT NULL,
    inn             VARCHAR(12),
    is_active       BOOLEAN DEFAULT true,
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(passport_series, passport_number)
);

CREATE INDEX IF NOT EXISTS idx_clients_passport ON clients(passport_series, passport_number);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_last_name ON clients(last_name);


-- СЧЕТА

CREATE TABLE IF NOT EXISTS accounts (
    id              SERIAL PRIMARY KEY,
    client_id       INTEGER NOT NULL REFERENCES clients(id),
    account_number  VARCHAR(20) UNIQUE NOT NULL,
    account_type    VARCHAR(20) NOT NULL CHECK (account_type IN ('checking', 'savings', 'deposit', 'credit')),
    currency        VARCHAR(3) NOT NULL DEFAULT 'RUB',
    balance         NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    interest_rate   NUMERIC(5, 2) DEFAULT 0.00,
    is_active       BOOLEAN DEFAULT true,
    opened_by       INTEGER REFERENCES users(id),
    closed_at       TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    CHECK (balance >= 0 OR account_type = 'credit')
);

CREATE INDEX IF NOT EXISTS idx_accounts_client ON accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_accounts_number ON accounts(account_number);


-- ТРАНЗАКЦИИ

CREATE TABLE IF NOT EXISTS transactions (
    id                  SERIAL PRIMARY KEY,
    account_id          INTEGER NOT NULL REFERENCES accounts(id),
    transaction_type    VARCHAR(20) NOT NULL CHECK (
        transaction_type IN ('deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'loan_payment', 'fee', 'interest')
    ),
    amount              NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    balance_after       NUMERIC(15, 2),
    related_account_id  INTEGER REFERENCES accounts(id),
    description         TEXT,
    created_by          INTEGER REFERENCES users(id),
    created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);


-- КРЕДИТЫ

CREATE TABLE IF NOT EXISTS loans (
    id                  SERIAL PRIMARY KEY,
    client_id           INTEGER NOT NULL REFERENCES clients(id),
    amount              NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    remaining_amount    NUMERIC(15, 2) NOT NULL,
    interest_rate       NUMERIC(5, 2) NOT NULL CHECK (interest_rate > 0),
    term_months         INTEGER NOT NULL CHECK (term_months > 0),
    monthly_payment     NUMERIC(15, 2) NOT NULL,
    loan_type           VARCHAR(20) NOT NULL CHECK (loan_type IN ('consumer', 'mortgage', 'auto', 'business')),
    purpose             TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'active', 'paid', 'rejected', 'overdue')),
    start_date          DATE,
    end_date            DATE,
    manager_id          INTEGER REFERENCES users(id),
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loans_client ON loans(client_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);


-- ПЛАТЕЖИ ПО КРЕДИТАМ

CREATE TABLE IF NOT EXISTS loan_payments (
    id          SERIAL PRIMARY KEY,
    loan_id     INTEGER NOT NULL REFERENCES loans(id),
    amount      NUMERIC(15, 2) NOT NULL,
    account_id  INTEGER REFERENCES accounts(id),
    created_by  INTEGER REFERENCES users(id),
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loan_payments_loan ON loan_payments(loan_id);


-- ЖУРНАЛ АУДИТА

CREATE TABLE IF NOT EXISTS audit_log (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id),
    action      VARCHAR(50) NOT NULL,
    table_name  VARCHAR(50),
    record_id   INTEGER,
    old_values  JSONB,
    new_values  JSONB,
    ip_address  INET,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(created_at);


-- ТРИГГЕР: автообновление updated_at

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON loans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ПРЕДСТАВЛЕНИЯ (VIEWS) для отчётности

CREATE OR REPLACE VIEW client_summary AS
SELECT
    c.id, c.last_name, c.first_name, c.middle_name, c.phone, c.email,
    COUNT(DISTINCT a.id) FILTER (WHERE a.is_active) as active_accounts,
    COALESCE(SUM(a.balance) FILTER (WHERE a.is_active), 0) as total_balance,
    COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'active') as active_loans,
    COALESCE(SUM(l.remaining_amount) FILTER (WHERE l.status = 'active'), 0) as total_debt,
    c.created_at
FROM clients c
LEFT JOIN accounts a ON a.client_id = c.id
LEFT JOIN loans l ON l.client_id = c.id
WHERE c.is_active = true
GROUP BY c.id;

CREATE OR REPLACE VIEW account_details AS
SELECT
    a.id, a.account_number, a.account_type, a.currency, a.balance,
    a.is_active, a.created_at,
    c.last_name || ' ' || c.first_name || ' ' || COALESCE(c.middle_name,'') as client_name,
    c.id as client_id, c.phone as client_phone
FROM accounts a
JOIN clients c ON c.id = a.client_id;

CREATE OR REPLACE VIEW loan_status_report AS
SELECT
    l.id, l.amount, l.remaining_amount, l.interest_rate,
    l.term_months, l.monthly_payment, l.loan_type, l.status,
    l.end_date, l.created_at,
    c.last_name || ' ' || c.first_name as client_name, c.phone,
    (l.amount - l.remaining_amount) as paid_amount,
    ROUND((l.amount - l.remaining_amount) / l.amount * 100, 2) as paid_percent
FROM loans l
JOIN clients c ON c.id = l.client_id;
