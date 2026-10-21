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

// Helper to normalize and calculate amounts
const calculateAmounts = (body) => {
    const qty = parseFloat(body.quantity) || 0;
    const rate = parseFloat(body.rate_per_cardboard) || 0;
    const pastingCharges = parseFloat(body.pasting_charges) || 0;

    // Total Amount: if provided directly or computed from qty * rate + charges
    let total = parseFloat(body.total_amount);
    if (isNaN(total) || total < 0) {
        total = (qty * rate) + pastingCharges;
    }

    let status = (body.payment_status || 'Pending').trim();
    let paid = parseFloat(body.paid_amount) || 0;
    let pending = 0;

    if (status === 'Fully Paid') {
        paid = total > 0 ? (paid > 0 ? paid : total) : 0;
        pending = 0; // If fully paid, remaining amount is strictly 0
    } else {
        if (paid >= total && total > 0) {
            status = 'Fully Paid';
            pending = 0;
        } else if (paid > 0) {
            status = 'Partially Paid';
            pending = Math.max(0, total - paid);
        } else {
            status = 'Pending';
            paid = 0;
            pending = total;
        }
    }

    return {
        qty,
        rate,
        pastingCharges,
        total: parseFloat(total.toFixed(2)),
        status,
        paid: parseFloat(paid.toFixed(2)),
        pending: parseFloat(pending.toFixed(2))
    };
};

// GET /api/daily-pasting - List all pasting jobs
router.get('/', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM daily_pasting 
             WHERE user_id = $1 
             ORDER BY pasting_date DESC, id DESC`,
            [req.userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching daily pasting records:', err);
        res.status(500).json({ error: 'Failed to fetch daily pasting records' });
    }
});

// GET /api/daily-pasting/:id - Get single record
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'SELECT * FROM daily_pasting WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching daily pasting record:', err);
        res.status(500).json({ error: 'Failed to fetch record' });
    }
});

// POST /api/daily-pasting - Create record
router.post('/', async (req, res) => {
    try {
        const {
            customer_name,
            customer_mobile,
            cardboard_type,
            pasting_date,
            notes
        } = req.body;

        if (!customer_name || !customer_name.trim()) {
            return res.status(400).json({ error: 'Customer Name is required.' });
        }

        const {
            qty,
            rate,
            pastingCharges,
            total,
            status,
            paid,
            pending
        } = calculateAmounts(req.body);

        const dateVal = pasting_date ? pasting_date.split('T')[0] : new Date().toISOString().split('T')[0];

        const result = await db.query(
            `INSERT INTO daily_pasting (
                user_id,
                pasting_date,
                customer_name,
                customer_mobile,
                quantity,
                cardboard_type,
                rate_per_cardboard,
                pasting_charges,
                total_amount,
                payment_status,
                paid_amount,
                pending_amount,
                notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *`,
            [
                req.userId,
                dateVal,
                customer_name.trim(),
                customer_mobile ? customer_mobile.trim() : null,
                qty,
                cardboard_type ? cardboard_type.trim() : null,
                rate,
                pastingCharges,
                total,
                status,
                paid,
                pending,
                notes ? notes.trim() : null
            ]
        );

        res.status(201).json({
            message: 'Daily pasting record added successfully',
            record: result.rows[0]
        });
    } catch (err) {
        console.error('Error creating daily pasting record:', err);
        res.status(500).json({ error: 'Failed to create record: ' + err.message });
    }
});

// PUT /api/daily-pasting/:id - Update record
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            customer_name,
            customer_mobile,
            cardboard_type,
            pasting_date,
            notes
        } = req.body;

        if (!customer_name || !customer_name.trim()) {
            return res.status(400).json({ error: 'Customer Name is required.' });
        }

        const {
            qty,
            rate,
            pastingCharges,
            total,
            status,
            paid,
            pending
        } = calculateAmounts(req.body);

        const dateVal = pasting_date ? pasting_date.split('T')[0] : new Date().toISOString().split('T')[0];

        const result = await db.query(
            `UPDATE daily_pasting SET
                pasting_date = $1,
                customer_name = $2,
                customer_mobile = $3,
                quantity = $4,
                cardboard_type = $5,
                rate_per_cardboard = $6,
                pasting_charges = $7,
                total_amount = $8,
                payment_status = $9,
                paid_amount = $10,
                pending_amount = $11,
                notes = $12
             WHERE id = $13 AND user_id = $14
             RETURNING *`,
            [
                dateVal,
                customer_name.trim(),
                customer_mobile ? customer_mobile.trim() : null,
                qty,
                cardboard_type ? cardboard_type.trim() : null,
                rate,
                pastingCharges,
                total,
                status,
                paid,
                pending,
                notes ? notes.trim() : null,
                id,
                req.userId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }

        res.json({
            message: 'Daily pasting record updated successfully',
            record: result.rows[0]
        });
    } catch (err) {
        console.error('Error updating daily pasting record:', err);
        res.status(500).json({ error: 'Failed to update record: ' + err.message });
    }
});

// PATCH /api/daily-pasting/:id/mark-paid - Quick mark as Fully Paid
router.patch('/:id/mark-paid', async (req, res) => {
    try {
        const { id } = req.params;
        const current = await db.query(
            'SELECT * FROM daily_pasting WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );
        if (current.rows.length === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        const total = parseFloat(current.rows[0].total_amount) || 0;

        const result = await db.query(
            `UPDATE daily_pasting SET
                payment_status = 'Fully Paid',
                paid_amount = $1,
                pending_amount = 0
             WHERE id = $2 AND user_id = $3
             RETURNING *`,
            [total, id, req.userId]
        );

        res.json({
            message: 'Marked as Fully Paid successfully',
            record: result.rows[0]
        });
    } catch (err) {
        console.error('Error marking as fully paid:', err);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// DELETE /api/daily-pasting/:id - Delete record
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'DELETE FROM daily_pasting WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, req.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        res.json({ message: 'Record deleted successfully' });
    } catch (err) {
        console.error('Error deleting daily pasting record:', err);
        res.status(500).json({ error: 'Failed to delete record' });
    }
});

module.exports = router;
