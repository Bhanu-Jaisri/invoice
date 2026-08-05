const express = require('express');
const router = express.Router();
const db = require('../db');

// Authentication middleware to extract user_id from headers
const authenticate = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: No user ID provided' });
    }
    req.userId = parseInt(userId, 10);
    next();
};

router.use(authenticate);

// Helper to parse dates supporting YYYY-MM-DD, DD-MM-YYYY, and DD/MM/YYYY
const parseDateString = (dateInput) => {
    if (!dateInput) return new Date();
    if (dateInput instanceof Date) return dateInput;

    const str = String(dateInput).trim();
    
    // Format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        const [y, m, d] = str.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    
    // Format DD-MM-YYYY or DD/MM/YYYY
    if (/^\d{2}[-/]\d{2}[-/]\d{4}/.test(str)) {
        const parts = str.split(/[-/]/).map(Number);
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }

    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
};

// Helper to compute Indian Financial Year date range (April 1 to March 31)
const getFinancialYearRange = (dateInput) => {
    const date = parseDateString(dateInput);
    
    const year = date.getFullYear();
    const month = date.getMonth(); // 0 = Jan, 2 = Mar, 3 = Apr (0-indexed)
    
    let startYear, endYear;
    if (month >= 3) { // April (3) to Dec (11)
        startYear = year;
        endYear = year + 1;
    } else { // Jan (0) to March (2)
        startYear = year - 1;
        endYear = year;
    }

    const fyStartStr = `${startYear}-04-01`;
    const fyEndStr = `${endYear}-03-31`;
    const fyShort = `${startYear}-${String(endYear).slice(-2)}`;
    const fyFull = `1 April ${startYear} to 31 March ${endYear}`;
    
    return { startYear, endYear, fyStartStr, fyEndStr, fyShort, fyFull };
};

// Get next invoice number (Resets sequence to 1 at start of each Financial Year on April 1)
router.get('/next-number', async (req, res) => {
    try {
        const { date } = req.query;
        const fy = getFinancialYearRange(date);

        const result = await db.query(
            `SELECT invoice_number FROM invoices 
             WHERE status != $1 AND user_id = $2 
               AND invoice_date::date >= $3::date AND invoice_date::date <= $4::date`, 
            ['Cancelled', req.userId, fy.fyStartStr, fy.fyEndStr]
        );
 
        const existingSeqs = result.rows.map(row => {
            const match = row.invoice_number.match(/\d+$/);
            return match ? parseInt(match[0], 10) : NaN;
        }).filter(seq => !isNaN(seq)).sort((a, b) => a - b);
 
        let nextSeq = 1;
        for (let i = 0; i < existingSeqs.length; i++) {
            if (existingSeqs[i] === nextSeq) {
                nextSeq++;
            } else if (existingSeqs[i] > nextSeq) {
                break;
            }
        }
 
        const nextNumber = `${nextSeq}`;
        res.json({ 
            nextNumber, 
            financialYear: fy.fyShort, 
            financialYearFull: fy.fyFull,
            fyStart: fy.fyStartStr,
            fyEnd: fy.fyEndStr
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error generating number' });
    }
});

// Get all invoices for the logged-in user
router.get('/', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM invoices WHERE user_id = $1 ORDER BY created_at DESC',
            [req.userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single invoice (must be owned by the user)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const invoiceResult = await db.query(
            `SELECT i.*, 
                    u.office_name, u.office_address, u.office_gstin, u.office_email, u.office_mobile, u.office_state, u.office_theme,
                    u.bank_name, u.bank_branch, u.account_name, u.account_no, u.ifsc_code, u.terms_conditions
             FROM invoices i 
             LEFT JOIN users u ON i.user_id = u.id 
             WHERE i.id = $1 AND i.user_id = $2`,
            [id, req.userId]
        );
        if (invoiceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const itemsResult = await db.query(
            'SELECT * FROM invoice_items WHERE invoice_id = $1',
            [id]
        );

        res.json({ ...invoiceResult.rows[0], items: itemsResult.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create new invoice linked to user
router.post('/', async (req, res) => {
    // Validate user profile completion before creating invoice
    try {
        const userCheck = await db.query(
            'SELECT office_name, office_address, office_gstin, office_email, office_mobile, office_state FROM users WHERE id = $1',
            [req.userId]
        );
        if (userCheck.rows.length === 0) {
            return res.status(400).json({ error: 'User profile not found' });
        }
        const u = userCheck.rows[0];
        if (!u.office_name || !u.office_address || !u.office_gstin || !u.office_email || !u.office_mobile || !u.office_state) {
            return res.status(400).json({ error: 'Please complete your office details (address, GSTIN, email, mobile, state) before creating invoices.' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server validation error' });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const {
            invoice_number,
            bill_number,
            customer_name,
            customer_address,
            customer_email,
            invoice_date,
            gstin,
            subtotal,
            cgst_rate,
            sgst_rate,
            igst_rate,
            cgst_amount,
            sgst_amount,
            igst_amount,
            round_off,
            total_amount,
            items
        } = req.body;

        const invoiceRes = await client.query(
            `INSERT INTO invoices (
                invoice_number, bill_number, customer_name, customer_address, customer_email, 
                invoice_date, gstin, subtotal, cgst_rate, sgst_rate, igst_rate, 
                cgst_amount, sgst_amount, igst_amount, round_off, total_amount, user_id
            )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING id`,
            [
                invoice_number, bill_number, customer_name, customer_address, customer_email, 
                invoice_date, gstin, subtotal, cgst_rate, sgst_rate, igst_rate, 
                cgst_amount, sgst_amount, igst_amount, round_off, total_amount, req.userId
            ]
        );

        const invoiceId = invoiceRes.rows[0].id;

        for (const item of items) {
            await client.query(
                `INSERT INTO invoice_items (invoice_id, description, hsn_sac, quantity, unit, price_per_unit, gst_rate, amount)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [invoiceId, item.description, item.hsn_sac, item.quantity, item.unit, item.price_per_unit, item.gst_rate, item.amount]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'Invoice created successfully', id: invoiceId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Error creating invoice: ' + err.message });
    } finally {
        client.release();
    }
});

// Update invoice (must be owned by the user)
router.put('/:id', async (req, res) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;

        const {
            invoice_number,
            bill_number,
            customer_name,
            customer_address,
            customer_email,
            invoice_date,
            gstin,
            subtotal,
            cgst_rate,
            sgst_rate,
            igst_rate,
            cgst_amount,
            sgst_amount,
            igst_amount,
            round_off,
            total_amount,
            items
        } = req.body;

        // Verify ownership
        const checkRes = await client.query(
            'SELECT id FROM invoices WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );
        if (checkRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Invoice not found' });
        }

        await client.query(
            `UPDATE invoices SET
                invoice_number = $1, bill_number = $2, customer_name = $3, customer_address = $4, customer_email = $5, 
                invoice_date = $6, gstin = $7, subtotal = $8, cgst_rate = $9, sgst_rate = $10, igst_rate = $11, 
                cgst_amount = $12, sgst_amount = $13, igst_amount = $14, round_off = $15, total_amount = $16
             WHERE id = $17 AND user_id = $18`,
            [
                invoice_number, bill_number, customer_name, customer_address, customer_email, 
                invoice_date, gstin, subtotal, cgst_rate, sgst_rate, igst_rate, 
                cgst_amount, sgst_amount, igst_amount, round_off, total_amount, id, req.userId
            ]
        );

        // Delete existing items
        await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);

        // Insert new items
        for (const item of items) {
            await client.query(
                `INSERT INTO invoice_items (invoice_id, description, hsn_sac, quantity, unit, price_per_unit, gst_rate, amount)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [id, item.description, item.hsn_sac, item.quantity, item.unit, item.price_per_unit, item.gst_rate, item.amount]
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'Invoice updated successfully', id: id });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Error updating invoice: ' + err.message });
    } finally {
        client.release();
    }
});

// Delete invoice (must be owned by the user)
router.delete('/:id', async (req, res) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const id = parseInt(req.params.id, 10);
        console.log(`[ROUTE] Deleting invoice ID: ${id} for user: ${req.userId}`);

        // Verify ownership
        const checkRes = await client.query(
            'SELECT id FROM invoices WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );
        if (checkRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Invoice not found' });
        }

        // Delete items first
        await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
        
        // Delete invoice
        await client.query('DELETE FROM invoices WHERE id = $1 AND user_id = $2', [id, req.userId]);

        await client.query('COMMIT');
        res.json({ message: 'Invoice deleted successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Error deleting invoice' });
    } finally {
        client.release();
    }
});

// Cancel invoice (must be owned by the user)
router.patch('/:id/cancel', async (req, res) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const id = parseInt(req.params.id, 10);
        console.log(`[ROUTE] Cancelling invoice ID: ${id} for user: ${req.userId}`);

        // Verify ownership and get invoice number
        const invoiceResult = await client.query(
            'SELECT invoice_number FROM invoices WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );
        if (invoiceResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const oldNumber = invoiceResult.rows[0].invoice_number;
        const cancelledNumber = `${oldNumber}-CANCELLED-${Date.now()}`;

        // Update status and rename number
        await client.query(
            'UPDATE invoices SET status = $1, invoice_number = $2 WHERE id = $3 AND user_id = $4',
            ['Cancelled', cancelledNumber, id, req.userId]
        );

        await client.query('COMMIT');
        res.json({ message: 'Invoice cancelled and number freed', newNumber: cancelledNumber });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Error cancelling invoice' });
    } finally {
        client.release();
    }
});

// Fetch customer details by GSTIN from previous invoices (must be owned by the user)
router.get('/customer-lookup/:gstin', async (req, res) => {
    try {
        const { gstin } = req.params;
        const result = await db.query(
            'SELECT customer_name, customer_address, customer_email FROM invoices WHERE gstin = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1',
            [gstin, req.userId]
        );

        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ message: 'GSTIN not found in history' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
