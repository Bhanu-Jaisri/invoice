const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'invoice_db.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
        process.exit(1);
    }
    console.log('Connected to database for reset');
});

db.serialize(() => {
    db.run("DELETE FROM invoice_items", (err) => {
        if (err) console.error("Error clearing items", err);
        else console.log("Cleared invoice_items");
    });

    db.run("DELETE FROM invoices", (err) => {
        if (err) console.error("Error clearing invoices", err);
        else console.log("Cleared invoices");
    });
});

db.close((err) => {
    if (err) console.error(err);
    else console.log("Database connection closed");
});
