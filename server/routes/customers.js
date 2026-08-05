const express = require('express');
const router = express.Router();
const db = require('../db');

// Auth middleware
const authenticate = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: No user ID provided' });
    }
    req.userId = parseInt(userId, 10);
    next();
};

router.use(authenticate);

// Get all customers for logged-in user
router.get('/', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM customers WHERE user_id = $1 ORDER BY name ASC',
            [req.userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

// Get single customer
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'SELECT * FROM customers WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch customer' });
    }
});

// Create new customer
router.post('/', async (req, res) => {
    try {
        const { name, mobile, gstin, email, billing_address } = req.body;

        // Validation: Customer Name & Mobile Number are required
        if (!name || !name.trim() || !mobile || !mobile.trim()) {
            return res.status(400).json({ error: 'Customer Name and Mobile Number are required' });
        }

        const result = await db.query(
            `INSERT INTO customers (user_id, name, mobile, gstin, email, billing_address)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                req.userId,
                name.trim(),
                mobile.trim(),
                gstin ? gstin.trim().toUpperCase() : null,
                email ? email.trim() : null,
                billing_address ? billing_address.trim() : null
            ]
        );

        res.status(201).json({
            message: 'Customer added successfully',
            customer: result.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create customer: ' + err.message });
    }
});

// Update customer
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, mobile, gstin, email, billing_address } = req.body;

        if (!name || !name.trim() || !mobile || !mobile.trim()) {
            return res.status(400).json({ error: 'Customer Name and Mobile Number are required' });
        }

        const result = await db.query(
            `UPDATE customers SET
                name = $1,
                mobile = $2,
                gstin = $3,
                email = $4,
                billing_address = $5
             WHERE id = $6 AND user_id = $7
             RETURNING *`,
            [
                name.trim(),
                mobile.trim(),
                gstin ? gstin.trim().toUpperCase() : null,
                email ? email.trim() : null,
                billing_address ? billing_address.trim() : null,
                id,
                req.userId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.json({
            message: 'Customer updated successfully',
            customer: result.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update customer: ' + err.message });
    }
});

// Delete customer
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'DELETE FROM customers WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, req.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json({ message: 'Customer deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete customer' });
    }
});

module.exports = router;
