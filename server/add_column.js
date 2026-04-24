const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'invoice_db.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run("ALTER TABLE invoices ADD COLUMN bill_number TEXT", (err) => {
        if (err) {
            if (err.message.includes('duplicate column')) {
                console.log('Column bill_number already exists');
            } else {
                console.error('Error adding column:', err.message);
            }
        } else {
            console.log('Added bill_number column to invoices table');
        }
    });
});

db.close();
