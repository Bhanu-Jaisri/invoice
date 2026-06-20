const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.PGUSER || 'postgres',
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'nrgjaisri',
    password: process.env.PGPASSWORD || '1234',
    port: parseInt(process.env.PGPORT || '5432', 10)
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
    process.exit(-1);
});

const query = (text, params = []) => {
    console.log(`[DB_QUERY] ${text.substring(0, 50)}${text.length > 50 ? '...' : ''} | Params: ${JSON.stringify(params)}`);
    return pool.query(text, params);
};

const initDb = async () => {
    try {
        // 1. Create Users Table first
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                office_name VARCHAR(255) NOT NULL,
                office_address TEXT,
                office_gstin VARCHAR(50),
                office_email VARCHAR(100),
                office_mobile VARCHAR(20),
                office_state VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Migrate users table to add new columns if they do not exist
        await pool.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS office_address TEXT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS office_gstin VARCHAR(50);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS office_email VARCHAR(100);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS office_mobile VARCHAR(20);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS office_state VARCHAR(100);
        `);

        // 2. Create Invoices Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS invoices (
                id SERIAL PRIMARY KEY,
                invoice_number TEXT NOT NULL,
                bill_number TEXT,
                customer_name TEXT NOT NULL,
                customer_address TEXT,
                customer_email TEXT,
                invoice_date DATE NOT NULL,
                gstin TEXT,
                total_amount DECIMAL(10, 2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'Active',
                subtotal DECIMAL(10, 2) DEFAULT 0,
                cgst_rate DECIMAL(5, 2) DEFAULT 9,
                sgst_rate DECIMAL(5, 2) DEFAULT 9,
                igst_rate DECIMAL(5, 2) DEFAULT 0,
                cgst_amount DECIMAL(10, 2) DEFAULT 0,
                sgst_amount DECIMAL(10, 2) DEFAULT 0,
                igst_amount DECIMAL(10, 2) DEFAULT 0,
                round_off DECIMAL(10, 2) DEFAULT 0,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT unique_user_invoice UNIQUE (user_id, invoice_number)
            )
        `);

        // 3. Migrate invoices table to add user_id column if it doesn't exist
        await pool.query(`
            ALTER TABLE invoices ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
        `);

        // Drop the global unique constraint on invoice_number and replace it with a user-scoped composite unique constraint
        try {
            await pool.query('ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_key');
            await pool.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_invoice') THEN
                        ALTER TABLE invoices ADD CONSTRAINT unique_user_invoice UNIQUE (user_id, invoice_number);
                    END IF;
                END
                $$;
            `);
        } catch (constraintErr) {
            console.warn('Warning during unique constraint migration:', constraintErr.message);
        }

        // 4. Create Invoice Items Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS invoice_items (
                id SERIAL PRIMARY KEY,
                invoice_id INTEGER NOT NULL REFERENCES invoices (id) ON DELETE CASCADE,
                description TEXT NOT NULL,
                hsn_sac TEXT,
                quantity REAL NOT NULL,
                unit TEXT,
                price_per_unit DECIMAL(10, 2) NOT NULL,
                gst_rate DECIMAL(5, 2),
                amount DECIMAL(10, 2) NOT NULL
            )
        `);
        console.log('Connected to PostgreSQL database and verified tables');
    } catch (err) {
        console.error('Error initializing PostgreSQL database:', err);
    }
};

module.exports = {
    query,
    initDb,
    pool
};
