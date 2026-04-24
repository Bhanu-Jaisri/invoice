const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'invoice_db.sqlite');
const db = new sqlite3.Database(dbPath);

// Helper to convert PostgreSQL $1, $2 placeholders to SQLite ?
const convertQuery = (text) => {
    return text.replace(/\$\d+/g, '?');
};

const query = (text, params = []) => {
    return new Promise((resolve, reject) => {
        const sql = convertQuery(text);
        console.log(`[DB_QUERY] ${sql.substring(0, 50)}... | Params: ${JSON.stringify(params)}`);
        
        if (text.trim().toUpperCase().startsWith('SELECT')) {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve({ rows });
            });
        } else {
            db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ rows: [], rowCount: this.changes, lastID: this.lastID, id: this.lastID });
            });
        }
    });
};

const initDb = () => {
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_number TEXT NOT NULL UNIQUE,
                bill_number TEXT,
                customer_name TEXT NOT NULL,
                customer_address TEXT,
                customer_email TEXT,
                invoice_date TEXT NOT NULL,
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

        // Migration: Add columns if they don't exist
        const columnsToAdd = [
            { name: 'subtotal', type: 'DECIMAL(10, 2) DEFAULT 0' },
            { name: 'cgst_rate', type: 'DECIMAL(5, 2) DEFAULT 9' },
            { name: 'sgst_rate', type: 'DECIMAL(5, 2) DEFAULT 9' },
            { name: 'igst_rate', type: 'DECIMAL(5, 2) DEFAULT 0' },
            { name: 'cgst_amount', type: 'DECIMAL(10, 2) DEFAULT 0' },
            { name: 'sgst_amount', type: 'DECIMAL(10, 2) DEFAULT 0' },
            { name: 'igst_amount', type: 'DECIMAL(10, 2) DEFAULT 0' },
            { name: 'round_off', type: 'DECIMAL(10, 2) DEFAULT 0' }
        ];

        columnsToAdd.forEach(col => {
            db.run(`ALTER TABLE invoices ADD COLUMN ${col.name} ${col.type}`, (err) => {
                if (err) {
                    if (!err.message.includes('duplicate column name')) {
                        console.error(`Error adding column ${col.name}:`, err.message);
                    }
                } else {
                    console.log(`Added column ${col.name} to invoices table`);
                }
            });
        });

        db.run(`
            CREATE TABLE IF NOT EXISTS invoice_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        console.log('Connected to SQLite database and verified tables');
    });
};

// Shim the PG Pool/Client API for routes that use transactions
const pool = {
    connect: async () => {
        return {
            query: async (text, params = []) => {
                const res = await query(text, params);
                // Return rows directly for compatibility with pg's result.rows
                return { 
                    rows: res.rows, 
                    rowCount: res.rowCount, 
                    insertId: res.lastID,
                    id: res.lastID // Invoices route expects id in rows[0] sometimes
                };
            },
            release: () => {},
        };
    }
};

// Fix for router.post where it expects rows[0].id
// The query function above returns lastID. I need to make sure 
// INSERT queries return an object that can be accessed like result.rows[0].id
const originalQuery = query;
const patchedQuery = async (text, params = []) => {
    const res = await originalQuery(text, params);
    if (text.trim().toUpperCase().startsWith('INSERT')) {
        res.rows = [{ id: res.lastID }];
    }
    return res;
};

module.exports = {
    query: patchedQuery,
    initDb,
    pool: {
        connect: async () => {
            return {
                query: patchedQuery,
                release: () => {},
            };
        }
    }
};
