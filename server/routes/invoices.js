const express = require('express');
const router = express.Router();
const db = require('../db');

// Get next invoice number
router.get('/next-number', async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date) : new Date();
        // The user wants simple numbering (1, 2, 3...)
        // We look for any existing numbers in the sequence.
        // We use a regex to find the numeric part at the end of existing invoice numbers
        // to support transition from "INV 2026 X" to just "X"
        const result = await db.query(
            'SELECT invoice_number FROM invoices WHERE status != $1', 
            ['Cancelled']
        );
 
        const existingSeqs = result.rows.map(row => {
            // Find digits at the end of the string
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
        res.json({ nextNumber });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error generating number' });
    }
});

// Get all invoices
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM invoices ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single invoice
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const invoiceResult = await db.query('SELECT * FROM invoices WHERE id = $1', [id]);
        if (invoiceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const itemsResult = await db.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [id]);

        res.json({ ...invoiceResult.rows[0], items: itemsResult.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create new invoice
router.post('/', async (req, res) => {
    const client = await require('../db').pool.connect();
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
                cgst_amount, sgst_amount, igst_amount, round_off, total_amount
            )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING id`,
            [
                invoice_number, bill_number, customer_name, customer_address, customer_email, 
                invoice_date, gstin, subtotal, cgst_rate, sgst_rate, igst_rate, 
                cgst_amount, sgst_amount, igst_amount, round_off, total_amount
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

// Delete invoice
router.delete('/:id', async (req, res) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const id = parseInt(req.params.id, 10);
        console.log(`[ROUTE] Deleting invoice ID: ${id}`);

        // Delete items first
        await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
        
        // Delete invoice
        const result = await client.query('DELETE FROM invoices WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Invoice not found' });
        }

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

// Cancel invoice (renames number to free it up)
router.patch('/:id/cancel', async (req, res) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const id = parseInt(req.params.id, 10);
        console.log(`[ROUTE] Cancelling invoice ID: ${id}`);

        // Get current invoice number
        const invoiceResult = await client.query('SELECT invoice_number FROM invoices WHERE id = $1', [id]);
        if (invoiceResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const oldNumber = invoiceResult.rows[0].invoice_number;
        const cancelledNumber = `${oldNumber}-CANCELLED-${Date.now()}`;

        // Update status and rename number
        await client.query(
            'UPDATE invoices SET status = $1, invoice_number = $2 WHERE id = $3',
            ['Cancelled', cancelledNumber, id]
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

// Fetch customer details by GSTIN from previous invoices
router.get('/customer-lookup/:gstin', async (req, res) => {
    try {
        const { gstin } = req.params;
        const result = await db.query(
            'SELECT customer_name, customer_address, customer_email FROM invoices WHERE gstin = $1 ORDER BY created_at DESC LIMIT 1',
            [gstin]
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
