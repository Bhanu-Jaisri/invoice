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
                office_theme VARCHAR(50) DEFAULT 'blue',
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
            ALTER TABLE users ADD COLUMN IF NOT EXISTS office_theme VARCHAR(50) DEFAULT 'blue';
            ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name TEXT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_branch TEXT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS account_name TEXT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS account_no TEXT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS ifsc_code TEXT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_conditions TEXT;
        `);

        // 2. Create Customers Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                mobile VARCHAR(50) NOT NULL,
                gstin VARCHAR(50),
                email VARCHAR(100),
                billing_address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Create Products Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                hsn_sac VARCHAR(50),
                unit VARCHAR(50) DEFAULT '1',
                price_per_unit DECIMAL(10, 2) DEFAULT 0,
                gst_rate DECIMAL(5, 2) DEFAULT 18,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 4. Create Received Invoices Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS received_invoices (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                vendor_name VARCHAR(255) NOT NULL,
                invoice_number VARCHAR(100) NOT NULL,
                invoice_date DATE NOT NULL,
                has_gst BOOLEAN DEFAULT TRUE,
                total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                gst_amount DECIMAL(12, 2) DEFAULT 0.00,
                gst_rate DECIMAL(5, 2) DEFAULT 18.00,
                notes TEXT,
                file_path VARCHAR(500),
                file_type VARCHAR(50),
                original_filename VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 5. Create Invoices Table
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

        // Drop global unique constraint and composite unique constraint to allow sequence reset per Financial Year
        try {
            await pool.query('ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_key');
            await pool.query('ALTER TABLE invoices DROP CONSTRAINT IF EXISTS unique_user_invoice');
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

        // 5. Create Quotations Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS quotations (
                id SERIAL PRIMARY KEY,
                quotation_number TEXT NOT NULL,
                customer_name TEXT NOT NULL,
                customer_email TEXT,
                customer_mobile TEXT,
                gstin TEXT,
                customer_address TEXT,
                quotation_date DATE NOT NULL,
                item_type TEXT,
                hsn_sac TEXT,
                quantity REAL,
                unit TEXT,
                price_per_unit DECIMAL(10, 2),
                gst_rate DECIMAL(5, 2) DEFAULT 0,
                subtotal DECIMAL(10, 2),
                cgst_amount DECIMAL(10, 2) DEFAULT 0,
                sgst_amount DECIMAL(10, 2) DEFAULT 0,
                igst_amount DECIMAL(10, 2) DEFAULT 0,
                total_amount DECIMAL(10, 2),
                status TEXT DEFAULT 'Active',
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                size TEXT,
                slip_number TEXT,
                if_spl TEXT,
                bottom_color TEXT,
                top_color TEXT,
                sheeter TEXT,
                approval_status TEXT DEFAULT 'Pending',
                delivery_status TEXT DEFAULT 'Not Delivered',
                calendars_delivered INTEGER DEFAULT 0,
                slips_delivered INTEGER DEFAULT 0,
                queries TEXT,
                payment_status TEXT DEFAULT 'Not Received',
                payment_amount DECIMAL(10, 2) DEFAULT 0,
                CONSTRAINT unique_user_quotation UNIQUE (user_id, quotation_number)
            )
        `);

        // Migration query to add fields to quotations if table already exists
        await pool.query(`
            ALTER TABLE quotations 
            ADD COLUMN IF NOT EXISTS size TEXT,
            ADD COLUMN IF NOT EXISTS slip_number TEXT,
            ADD COLUMN IF NOT EXISTS if_spl TEXT,
            ADD COLUMN IF NOT EXISTS bottom_color TEXT,
            ADD COLUMN IF NOT EXISTS top_color TEXT,
            ADD COLUMN IF NOT EXISTS sheeter TEXT,
            ADD COLUMN IF NOT EXISTS customer_state TEXT,
            ADD COLUMN IF NOT EXISTS hsn_sac TEXT,
            ADD COLUMN IF NOT EXISTS item_type TEXT,
            ADD COLUMN IF NOT EXISTS quantity REAL,
            ADD COLUMN IF NOT EXISTS unit TEXT,
            ADD COLUMN IF NOT EXISTS price_per_unit DECIMAL(10, 2),
            ADD COLUMN IF NOT EXISTS gst_rate DECIMAL(5, 2),
            ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10, 2),
            ADD COLUMN IF NOT EXISTS cgst_amount DECIMAL(10, 2),
            ADD COLUMN IF NOT EXISTS sgst_amount DECIMAL(10, 2),
            ADD COLUMN IF NOT EXISTS igst_amount DECIMAL(10, 2),
            ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2),
            ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active',
            ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'Pending',
            ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'Not Delivered',
            ADD COLUMN IF NOT EXISTS calendars_delivered INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS slips_delivered INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS queries TEXT,
            ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Not Received',
            ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10, 2) DEFAULT 0,
            ALTER COLUMN item_type DROP NOT NULL,
            ALTER COLUMN quantity DROP NOT NULL,
            ALTER COLUMN price_per_unit DROP NOT NULL,
            ALTER COLUMN subtotal DROP NOT NULL,
            ALTER COLUMN total_amount DROP NOT NULL,
            ALTER COLUMN customer_mobile DROP NOT NULL
        `);

        // 6. Create Quotation Items Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS quotation_items (
                id SERIAL PRIMARY KEY,
                quotation_id INTEGER NOT NULL REFERENCES quotations (id) ON DELETE CASCADE,
                item_type TEXT NOT NULL,
                hsn_sac TEXT,
                quantity REAL NOT NULL,
                unit TEXT,
                price_per_unit DECIMAL(10, 2) NOT NULL,
                gst_rate DECIMAL(5, 2),
                amount DECIMAL(10, 2) NOT NULL,
                size TEXT,
                slip_number TEXT,
                if_spl TEXT,
                bottom_color TEXT,
                top_color TEXT,
                sheeter TEXT,
                designs TEXT,
                designs_total_qty REAL
            )
        `);

        // Migration query to add designs columns if table already exists
        await pool.query(`
            ALTER TABLE quotation_items 
            ADD COLUMN IF NOT EXISTS designs TEXT,
            ADD COLUMN IF NOT EXISTS designs_total_qty REAL
        `);

        // 7. Create Orders Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                order_number TEXT NOT NULL,
                customer_name TEXT NOT NULL,
                customer_email TEXT,
                customer_mobile TEXT,
                gstin TEXT,
                customer_address TEXT,
                customer_state TEXT,
                order_date DATE NOT NULL,
                item_type TEXT,
                hsn_sac TEXT,
                quantity REAL,
                unit TEXT,
                price_per_unit DECIMAL(10, 2),
                gst_rate DECIMAL(5, 2) DEFAULT 0,
                subtotal DECIMAL(10, 2),
                cgst_amount DECIMAL(10, 2) DEFAULT 0,
                sgst_amount DECIMAL(10, 2) DEFAULT 0,
                igst_amount DECIMAL(10, 2) DEFAULT 0,
                total_amount DECIMAL(10, 2),
                status TEXT DEFAULT 'Active',
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                size TEXT,
                slip_number TEXT,
                if_spl TEXT,
                bottom_color TEXT,
                top_color TEXT,
                sheeter TEXT,
                source_quotation_id INTEGER,
                approval_status TEXT DEFAULT 'Pending',
                delivery_status TEXT DEFAULT 'Not Delivered',
                calendars_delivered INTEGER DEFAULT 0,
                slips_delivered INTEGER DEFAULT 0,
                queries TEXT,
                payment_status TEXT DEFAULT 'Not Received',
                payment_amount DECIMAL(10, 2) DEFAULT 0,
                CONSTRAINT unique_user_order UNIQUE (user_id, order_number)
            )
        `);

        // Migration query to add fields to orders if table already exists
        await pool.query(`
            ALTER TABLE orders 
            ADD COLUMN IF NOT EXISTS size TEXT,
            ADD COLUMN IF NOT EXISTS slip_number TEXT,
            ADD COLUMN IF NOT EXISTS if_spl TEXT,
            ADD COLUMN IF NOT EXISTS bottom_color TEXT,
            ADD COLUMN IF NOT EXISTS top_color TEXT,
            ADD COLUMN IF NOT EXISTS sheeter TEXT,
            ADD COLUMN IF NOT EXISTS customer_state TEXT,
            ADD COLUMN IF NOT EXISTS hsn_sac TEXT,
            ADD COLUMN IF NOT EXISTS item_type TEXT,
            ADD COLUMN IF NOT EXISTS quantity REAL,
            ADD COLUMN IF NOT EXISTS unit TEXT,
            ADD COLUMN IF NOT EXISTS price_per_unit DECIMAL(10, 2),
            ADD COLUMN IF NOT EXISTS gst_rate DECIMAL(5, 2),
            ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10, 2),
            ADD COLUMN IF NOT EXISTS cgst_amount DECIMAL(10, 2),
            ADD COLUMN IF NOT EXISTS sgst_amount DECIMAL(10, 2),
            ADD COLUMN IF NOT EXISTS igst_amount DECIMAL(10, 2),
            ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2),
            ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active',
            ADD COLUMN IF NOT EXISTS source_quotation_id INTEGER,
            ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'Pending',
            ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'Not Delivered',
            ADD COLUMN IF NOT EXISTS calendars_delivered INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS slips_delivered INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS queries TEXT,
            ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Not Received',
            ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10, 2) DEFAULT 0
        `);

        // 8. Create Order Items Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
                item_type TEXT NOT NULL,
                hsn_sac TEXT,
                quantity REAL NOT NULL,
                unit TEXT,
                price_per_unit DECIMAL(10, 2) NOT NULL,
                gst_rate DECIMAL(5, 2),
                amount DECIMAL(10, 2) NOT NULL,
                size TEXT,
                slip_number TEXT,
                if_spl TEXT,
                bottom_color TEXT,
                top_color TEXT,
                sheeter TEXT,
                designs TEXT,
                designs_total_qty REAL
            )
        `);

        // Migration query to add designs columns if table already exists
        await pool.query(`
            ALTER TABLE order_items 
            ADD COLUMN IF NOT EXISTS designs TEXT,
            ADD COLUMN IF NOT EXISTS designs_total_qty REAL
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
