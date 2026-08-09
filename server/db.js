const { Pool } = require('pg');
require('dotenv').config();

let connectionString = process.env.DATABASE_URL;
if (connectionString) {
    connectionString = connectionString
        .replace(/([?&])channel_binding=[^&]*&?/, '$1')
        .replace(/([?&])sslmode=[^&]*&?/, '$1')
        .replace(/[?&]$/, '');
}

const poolConfig = connectionString
    ? {
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    }
    : {
        user: process.env.PGUSER || 'postgres',
        host: process.env.PGHOST || 'localhost',
        database: process.env.PGDATABASE || 'nrgjaisri',
        password: process.env.PGPASSWORD || '1234',
        port: parseInt(process.env.PGPORT || '5432', 10)
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
    process.exit(-1);
});

const query = (text, params = []) => {
    console.log(`[DB_QUERY] ${text.substring(0, 50)}${text.length > 50 ? '...' : ''} | Params: ${JSON.stringify(params)}`);
    return pool.query(text, params);
};

const initDb = async () => {
    const runQuery = async (label, sql) => {
        try {
            await pool.query(sql);
            console.log(`[DB INIT SUCCESS] ${label}`);
        } catch (err) {
            console.warn(`[DB INIT WARN] ${label}:`, err.message);
        }
    };

    // 1. Users Table
    await runQuery('Create users table', `
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
            bank_name TEXT,
            bank_branch TEXT,
            account_name TEXT,
            account_no TEXT,
            ifsc_code TEXT,
            terms_conditions TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 2. Customers Table
    await runQuery('Create customers table', `
        CREATE TABLE IF NOT EXISTS customers (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            mobile VARCHAR(50) NOT NULL,
            gstin VARCHAR(50),
            email VARCHAR(100),
            billing_address TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 3. Products Table
    await runQuery('Create products table', `
        CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            hsn_sac VARCHAR(50),
            unit VARCHAR(50) DEFAULT '1',
            price_per_unit DECIMAL(10, 2) DEFAULT 0,
            gst_rate DECIMAL(5, 2) DEFAULT 18,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 4. Received Invoices Table
    await runQuery('Create received_invoices table', `
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
        );
    `);

    // 5. Invoices Table
    await runQuery('Create invoices table', `
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
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
        );
    `);

    // 6. Invoice Items Table
    await runQuery('Create invoice_items table', `
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
        );
    `);

    // 7. Quotations Table
    await runQuery('Create quotations table', `
        CREATE TABLE IF NOT EXISTS quotations (
            id SERIAL PRIMARY KEY,
            quotation_number TEXT NOT NULL,
            customer_name TEXT NOT NULL,
            customer_email TEXT,
            customer_mobile TEXT,
            gstin TEXT,
            customer_address TEXT,
            customer_state TEXT,
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
            payment_amount DECIMAL(10, 2) DEFAULT 0
        );
    `);

    // 8. Quotation Items Table
    await runQuery('Create quotation_items table', `
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
        );
    `);

    // 9. Orders Table
    await runQuery('Create orders table', `
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
            payment_amount DECIMAL(10, 2) DEFAULT 0
        );
    `);

    // 10. Order Items Table
    await runQuery('Create order_items table', `
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
        );
    `);

    console.log('Connected to PostgreSQL database and verified all tables');
};

module.exports = {
    query,
    initDb,
    pool
};
