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
        await pool.query(`
            CREATE TABLE IF NOT EXISTS invoices (
                id SERIAL PRIMARY KEY,
                invoice_number TEXT NOT NULL UNIQUE,
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
                round_off DECIMAL(10, 2) DEFAULT 0
            )
        `);

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
