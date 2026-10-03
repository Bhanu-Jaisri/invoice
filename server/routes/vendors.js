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

// Get all vendors for user
router.get('/', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM vendors WHERE user_id = $1 ORDER BY name ASC',
            [req.userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching vendors:', err);
        res.status(500).json({ error: 'Failed to fetch vendors' });
    }
});

// Get single vendor
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'SELECT * FROM vendors WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vendor not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching vendor:', err);
        res.status(500).json({ error: 'Failed to fetch vendor' });
    }
});

// Create or Upsert vendor
router.post('/', async (req, res) => {
    try {
        const { name, mobile, gstin, email, address } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Vendor Name is required' });
        }

        const vendorName = name.trim();
        const vendorMobile = mobile && mobile.trim() ? mobile.trim() : null;
        const vendorGstin = gstin && gstin.trim() ? gstin.trim().toUpperCase() : null;
        const vendorEmail = email && email.trim() ? email.trim() : null;
        const vendorAddress = address && address.trim() ? address.trim() : null;

        // Check if vendor with same name exists for this user
        const existing = await db.query(
            'SELECT * FROM vendors WHERE LOWER(name) = LOWER($1) AND user_id = $2',
            [vendorName, req.userId]
        );

        if (existing.rows.length > 0) {
            // Update existing vendor with non-empty details
            const current = existing.rows[0];
            const updatedResult = await db.query(
                `UPDATE vendors SET
                    name = $1,
                    mobile = COALESCE($2, mobile),
                    gstin = COALESCE($3, gstin),
                    email = COALESCE($4, email),
                    address = COALESCE($5, address)
                 WHERE id = $6 AND user_id = $7
                 RETURNING *`,
                [
                    vendorName,
                    vendorMobile,
                    vendorGstin,
                    vendorEmail,
                    vendorAddress,
                    current.id,
                    req.userId
                ]
            );
            return res.json({
                message: 'Vendor details updated',
                vendor: updatedResult.rows[0]
            });
        }

        // Insert new vendor
        const result = await db.query(
            `INSERT INTO vendors (user_id, name, mobile, gstin, email, address)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [req.userId, vendorName, vendorMobile, vendorGstin, vendorEmail, vendorAddress]
        );

        res.status(201).json({
            message: 'Vendor created successfully',
            vendor: result.rows[0]
        });
    } catch (err) {
        console.error('Error creating vendor:', err);
        res.status(500).json({ error: 'Failed to create vendor: ' + err.message });
    }
});

// Update vendor
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, mobile, gstin, email, address } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Vendor Name is required' });
        }

        const result = await db.query(
            `UPDATE vendors SET
                name = $1,
                mobile = $2,
                gstin = $3,
                email = $4,
                address = $5
             WHERE id = $6 AND user_id = $7
             RETURNING *`,
            [
                name.trim(),
                mobile && mobile.trim() ? mobile.trim() : null,
                gstin && gstin.trim() ? gstin.trim().toUpperCase() : null,
                email && email.trim() ? email.trim() : null,
                address && address.trim() ? address.trim() : null,
                id,
                req.userId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        res.json({
            message: 'Vendor updated successfully',
            vendor: result.rows[0]
        });
    } catch (err) {
        console.error('Error updating vendor:', err);
        res.status(500).json({ error: 'Failed to update vendor' });
    }
});

// Delete vendor
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'DELETE FROM vendors WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        res.json({ message: 'Vendor deleted successfully' });
    } catch (err) {
        console.error('Error deleting vendor:', err);
        res.status(500).json({ error: 'Failed to delete vendor' });
    }
});

module.exports = router;
