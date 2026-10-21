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

// GET all worker salaries with optional search & filter
router.get('/', async (req, res) => {
    try {
        const { search, startDate, endDate, status } = req.query;
        let queryStr = `
            SELECT * FROM pasting_worker_salaries 
            WHERE user_id = $1
        `;
        const params = [req.userId];
        let pIndex = 2;

        if (search && search.trim()) {
            queryStr += ` AND (
                worker_name ILIKE $${pIndex} 
                OR notes ILIKE $${pIndex}
            )`;
            params.push(`%${search.trim()}%`);
            pIndex++;
        }

        if (status && status !== 'All') {
            queryStr += ` AND payment_status = $${pIndex}`;
            params.push(status);
            pIndex++;
        }

        if (startDate) {
            queryStr += ` AND salary_date >= $${pIndex}`;
            params.push(startDate);
            pIndex++;
        }

        if (endDate) {
            queryStr += ` AND salary_date <= $${pIndex}`;
            params.push(endDate);
            pIndex++;
        }

        queryStr += ` ORDER BY salary_date DESC, id DESC`;

        const result = await db.query(queryStr, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching pasting worker salaries:', err);
        res.status(500).json({ error: 'Failed to fetch pasting worker salaries' });
    }
});

// GET single entry
router.get('/:id', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM pasting_worker_salaries WHERE id = $1 AND user_id = $2`,
            [req.params.id, req.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Salary record not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching salary record:', err);
        res.status(500).json({ error: 'Failed to fetch salary record' });
    }
});

// POST create new entry
router.post('/', async (req, res) => {
    try {
        const {
            salary_date,
            worker_name,
            quantity,
            salary,
            payment_status,
            notes
        } = req.body;

        const dateVal = salary_date || new Date().toISOString().split('T')[0];
        const qtyVal = parseFloat(quantity) || 0;
        const salaryVal = parseFloat(salary) || 0;
        const statusVal = (payment_status || 'Paid').trim();
        const notesVal = notes || '';
        const workerVal = (worker_name || '').trim();

        const insertQuery = `
            INSERT INTO pasting_worker_salaries (
                user_id,
                salary_date,
                worker_name,
                quantity,
                salary,
                payment_status,
                notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const result = await db.query(insertQuery, [
            req.userId,
            dateVal,
            workerVal,
            qtyVal,
            salaryVal,
            statusVal,
            notesVal
        ]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating pasting worker salary:', err);
        res.status(500).json({ error: 'Failed to create worker salary record' });
    }
});

// PUT update entry
router.put('/:id', async (req, res) => {
    try {
        const {
            salary_date,
            worker_name,
            quantity,
            salary,
            payment_status,
            notes
        } = req.body;

        const dateVal = salary_date || new Date().toISOString().split('T')[0];
        const qtyVal = parseFloat(quantity) || 0;
        const salaryVal = parseFloat(salary) || 0;
        const statusVal = (payment_status || 'Paid').trim();
        const notesVal = notes || '';
        const workerVal = (worker_name || '').trim();

        const updateQuery = `
            UPDATE pasting_worker_salaries SET
                salary_date = $1,
                worker_name = $2,
                quantity = $3,
                salary = $4,
                payment_status = $5,
                notes = $6
            WHERE id = $7 AND user_id = $8
            RETURNING *
        `;

        const result = await db.query(updateQuery, [
            dateVal,
            workerVal,
            qtyVal,
            salaryVal,
            statusVal,
            notesVal,
            req.params.id,
            req.userId
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Salary record not found or unauthorized' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating worker salary record:', err);
        res.status(500).json({ error: 'Failed to update worker salary record' });
    }
});

// DELETE entry
router.delete('/:id', async (req, res) => {
    try {
        const result = await db.query(
            `DELETE FROM pasting_worker_salaries WHERE id = $1 AND user_id = $2 RETURNING id`,
            [req.params.id, req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Salary record not found or unauthorized' });
        }

        res.json({ message: 'Salary record deleted successfully', id: req.params.id });
    } catch (err) {
        console.error('Error deleting worker salary record:', err);
        res.status(500).json({ error: 'Failed to delete worker salary record' });
    }
});

module.exports = router;
