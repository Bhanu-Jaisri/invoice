const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.PGUSER || 'postgres',
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'nrgjaisri',
    password: process.env.PGPASSWORD || '1234',
    port: parseInt(process.env.PGPORT || '5432', 10)
});

const reset = async () => {
    try {
        await pool.query("DELETE FROM invoice_items");
        console.log("Cleared invoice_items");
        await pool.query("DELETE FROM invoices");
        console.log("Cleared invoices");
    } catch (err) {
        console.error("Error resetting database:", err);
    } finally {
        await pool.end();
    }
};

reset();
