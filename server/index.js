const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

const invoiceRoutes = require('./routes/invoices');

// Routes
app.get('/api', (req, res) => {
    res.json({ message: 'Invoice API is up' });
});

// Initialize Database
db.initDb();
app.use('/api/invoices', invoiceRoutes);

app.get('/', (req, res) => {
    res.send('Invoice Dashboard API');
});

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});
