const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');

// Helper to hash passwords using native Node crypto module
const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

// Register Route
router.post('/register', async (req, res) => {
    try {
        const { username, password, office_name } = req.body;
        if (!username || !password || !office_name) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const hashedPassword = hashPassword(password);

        const result = await db.query(
            'INSERT INTO users (username, password, office_name) VALUES ($1, $2, $3) RETURNING id, username, office_name',
            [username.trim().toLowerCase(), hashedPassword, office_name.trim()]
        );

        res.status(201).json({
            message: 'User registered successfully',
            user: result.rows[0]
        });
    } catch (err) {
        console.error(err);
        if (err.code === '23505') { // Unique key constraint in Postgres
            return res.status(400).json({ error: 'Username already exists' });
        }
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

// Login Route
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const hashedPassword = hashPassword(password);

        const result = await db.query(
            'SELECT id, username, password, office_name, office_address, office_gstin, office_email, office_mobile, office_state FROM users WHERE username = $1',
            [username.trim().toLowerCase()]
        );

        if (result.rows.length === 0 || result.rows[0].password !== hashedPassword) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        const user = result.rows[0];
        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                office_name: user.office_name,
                office_address: user.office_address,
                office_gstin: user.office_gstin,
                office_email: user.office_email,
                office_mobile: user.office_mobile,
                office_state: user.office_state
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

// Get Profile Route
router.get('/profile', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const result = await db.query(
            'SELECT id, username, office_name, office_address, office_gstin, office_email, office_mobile, office_state FROM users WHERE id = $1',
            [parseInt(userId, 10)]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update Profile Route
router.put('/profile', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { office_name, office_address, office_gstin, office_email, office_mobile, office_state } = req.body;

        if (!office_name || !office_address || !office_gstin || !office_email || !office_mobile || !office_state) {
            return res.status(400).json({ error: 'All fields are required to update office profile' });
        }

        const result = await db.query(
            `UPDATE users SET 
                office_name = $1, 
                office_address = $2, 
                office_gstin = $3, 
                office_email = $4, 
                office_mobile = $5, 
                office_state = $6 
             WHERE id = $7 
             RETURNING id, username, office_name, office_address, office_gstin, office_email, office_mobile, office_state`,
            [office_name.trim(), office_address.trim(), office_gstin.trim().toUpperCase(), office_email.trim(), office_mobile.trim(), office_state.trim(), parseInt(userId, 10)]
        );

        res.json({
            message: 'Profile updated successfully',
            user: result.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

module.exports = router;
