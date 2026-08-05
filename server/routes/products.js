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

// Get all products for logged-in user
router.get('/', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM products WHERE user_id = $1 ORDER BY name ASC',
            [req.userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Get single product
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'SELECT * FROM products WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// Create new product
router.post('/', async (req, res) => {
    try {
        const { name, hsn_sac, unit, price_per_unit, gst_rate } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Product Name is required' });
        }

        const result = await db.query(
            `INSERT INTO products (user_id, name, hsn_sac, unit, price_per_unit, gst_rate)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                req.userId,
                name.trim(),
                hsn_sac ? hsn_sac.trim() : null,
                unit ? unit.trim() : '1',
                parseFloat(price_per_unit || 0),
                parseFloat(gst_rate || 18)
            ]
        );

        res.status(201).json({
            message: 'Product added successfully',
            product: result.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create product: ' + err.message });
    }
});

// Update product
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, hsn_sac, unit, price_per_unit, gst_rate } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Product Name is required' });
        }

        const result = await db.query(
            `UPDATE products SET
                name = $1,
                hsn_sac = $2,
                unit = $3,
                price_per_unit = $4,
                gst_rate = $5
             WHERE id = $6 AND user_id = $7
             RETURNING *`,
            [
                name.trim(),
                hsn_sac ? hsn_sac.trim() : null,
                unit ? unit.trim() : '1',
                parseFloat(price_per_unit || 0),
                parseFloat(gst_rate || 18),
                id,
                req.userId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({
            message: 'Product updated successfully',
            product: result.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update product: ' + err.message });
    }
});

// Delete product
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'DELETE FROM products WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, req.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

module.exports = router;
