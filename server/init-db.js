const { initDb, pool } = require('./db');

console.log('Initializing database tables...');
initDb()
    .then(() => {
        console.log('All tables created successfully!');
        pool.end();
        process.exit(0);
    })
    .catch((err) => {
        console.error('Database initialization failed:', err);
        pool.end();
        process.exit(1);
    });
