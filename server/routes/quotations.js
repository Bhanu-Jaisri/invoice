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

// Get next quotation number
router.get('/next-number', async (req, res) => {
    try {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        const dateStr = `${day}${month}${year}`; // e.g. "20062026"

        // Search for quotation numbers that match this date
        const prefix = `QT/${dateStr}/`;
        const result = await db.query(
            'SELECT quotation_number FROM quotations WHERE quotation_number LIKE $1 AND user_id = $2',
            [`${prefix}%`, req.userId]
        );

        const existingSeqs = result.rows.map(row => {
            const parts = row.quotation_number.split('/');
            const seqStr = parts[parts.length - 1];
            return parseInt(seqStr, 10);
        }).filter(seq => !isNaN(seq)).sort((a, b) => a - b);

        let nextSeq = 1;
        for (let i = 0; i < existingSeqs.length; i++) {
            if (existingSeqs[i] === nextSeq) {
                nextSeq++;
            } else if (existingSeqs[i] > nextSeq) {
                break;
            }
        }

        const seqFormatted = String(nextSeq).padStart(2, '0');
        const nextNumber = `${prefix}${seqFormatted}`;
        res.json({ nextNumber });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to generate quotation number' });
    }
});

// Get all quotations for the logged-in user (joined with nested items)
router.get('/', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT q.*, 
                    COALESCE(
                        json_agg(qi.* ORDER BY qi.id ASC) FILTER (WHERE qi.id IS NOT NULL), 
                        '[]'
                    ) as items
             FROM quotations q
             LEFT JOIN quotation_items qi ON q.id = qi.quotation_id
             WHERE q.user_id = $1
             GROUP BY q.id
             ORDER BY q.created_at DESC`,
            [req.userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to retrieve quotations' });
    }
});

// Get single quotation (must be owned by the user, joined with items and office details)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            `SELECT q.*, 
                    u.office_name, u.office_address, u.office_gstin, u.office_email, u.office_mobile, u.office_state, u.office_theme 
             FROM quotations q 
             LEFT JOIN users u ON q.user_id = u.id 
             WHERE q.id = $1 AND q.user_id = $2`,
            [id, req.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Quotation not found' });
        }

        const quotation = result.rows[0];

        const itemsResult = await db.query(
            'SELECT * FROM quotation_items WHERE quotation_id = $1 ORDER BY id ASC',
            [id]
        );
        quotation.items = itemsResult.rows;

        res.json(quotation);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to retrieve quotation' });
    }
});

// Create new quotation linked to user with multi-item transactions
router.post('/', async (req, res) => {
    try {
        // Validate user profile completion before creating quotation
        const userCheck = await db.query(
            'SELECT office_name, office_address, office_gstin, office_email, office_mobile, office_state FROM users WHERE id = $1',
            [req.userId]
        );
        if (userCheck.rows.length === 0) {
            return res.status(400).json({ error: 'User profile not found' });
        }
        const u = userCheck.rows[0];
        if (!u.office_name || !u.office_address || !u.office_gstin || !u.office_email || !u.office_mobile || !u.office_state) {
            return res.status(400).json({ error: 'Please complete your office details (address, GSTIN, email, mobile, state) before creating quotations.' });
        }

        const {
            quotation_number,
            customer_name,
            customer_email,
            customer_mobile,
            gstin,
            customer_address,
            customer_state,
            quotation_date,
            subtotal,
            cgst_amount,
            sgst_amount,
            igst_amount,
            total_amount,
            approval_status,
            delivery_status,
            calendars_delivered,
            slips_delivered,
            queries,
            payment_status,
            payment_amount,
            items
        } = req.body;

        if (!customer_name || !quotation_date || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Customer name, quotation date, and at least one item are required.' });
        }

        // Start transactional block
        await db.query('BEGIN');

        // Extract first item values for flat backward-compatibility fields on parent table
        const firstItem = items[0];
        const item_type = firstItem.item_type || firstItem.item_category || '';
        const hsn_sac = firstItem.hsn_sac || '';
        const quantity = parseFloat(firstItem.quantity || 0);
        const unit = firstItem.unit || '1';
        const price_per_unit = parseFloat(firstItem.price_per_unit || 0);
        const gst_rate = parseFloat(firstItem.gst_rate || 0);
        const size = firstItem.size || null;
        const slip_number = firstItem.slip_number || null;
        const if_spl = firstItem.if_spl || null;
        const bottom_color = firstItem.bottom_color || null;
        const top_color = firstItem.top_color || null;
        const sheeter = firstItem.sheeter || null;

        const parentResult = await db.query(
            `INSERT INTO quotations (
                quotation_number, customer_name, customer_email, customer_mobile, gstin, customer_address, customer_state,
                quotation_date, item_type, hsn_sac, quantity, unit, price_per_unit, gst_rate, 
                subtotal, cgst_amount, sgst_amount, igst_amount, total_amount, user_id,
                size, slip_number, if_spl, bottom_color, top_color, sheeter,
                approval_status, delivery_status, calendars_delivered, slips_delivered,
                queries, payment_status, payment_amount
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33
            ) RETURNING id`,
            [
                quotation_number, customer_name, customer_email, customer_mobile, gstin, customer_address, customer_state || '',
                quotation_date, item_type, hsn_sac, quantity, unit, price_per_unit, gst_rate,
                parseFloat(subtotal), parseFloat(cgst_amount || 0), parseFloat(sgst_amount || 0), parseFloat(igst_amount || 0), parseFloat(total_amount), req.userId,
                size, slip_number, if_spl, bottom_color, top_color, sheeter,
                approval_status || 'Pending', delivery_status || 'Not Delivered', parseInt(calendars_delivered || 0, 10), parseInt(slips_delivered || 0, 10),
                queries || null, payment_status || 'Not Received', payment_amount ? parseFloat(payment_amount) : 0
            ]
        );

        const quotationId = parentResult.rows[0].id;

        // Insert quotation items
        for (const item of items) {
            const itemTypeLabel = item.item_category === 'Other' ? item.custom_item_type : item.item_category;
            await db.query(
                `INSERT INTO quotation_items (
                    quotation_id, item_type, hsn_sac, quantity, unit, price_per_unit, gst_rate, amount,
                    size, slip_number, if_spl, bottom_color, top_color, sheeter, designs, designs_total_qty
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
                [
                    quotationId,
                    itemTypeLabel,
                    item.hsn_sac || null,
                    parseFloat(item.quantity),
                    item.unit || '1',
                    parseFloat(item.price_per_unit),
                    parseFloat(item.gst_rate || 0),
                    parseFloat(item.quantity) * parseFloat(item.price_per_unit),
                    item.size || null,
                    item.slip_number || null,
                    item.if_spl || null,
                    item.bottom_color || null,
                    item.top_color || null,
                    item.sheeter || null,
                    item.designs ? JSON.stringify(item.designs) : null,
                    item.designs_total_qty ? parseFloat(item.designs_total_qty) : null
                ]
            );
        }

        await db.query('COMMIT');
        res.status(201).json({ message: 'Quotation created successfully', quotationId });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        if (err.code === '23505') {
            return res.status(400).json({ error: `Quotation number already exists.` });
        }
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

// Update quotation linked to user with multi-item transactions
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Validate user profile completion before updating quotation
        const userCheck = await db.query(
            'SELECT office_name, office_address, office_gstin, office_email, office_mobile, office_state FROM users WHERE id = $1',
            [req.userId]
        );
        if (userCheck.rows.length === 0) {
            return res.status(400).json({ error: 'User profile not found' });
        }
        const u = userCheck.rows[0];
        if (!u.office_name || !u.office_address || !u.office_gstin || !u.office_email || !u.office_mobile || !u.office_state) {
            return res.status(400).json({ error: 'Please complete your office details before editing quotations.' });
        }

        const {
            quotation_number,
            customer_name,
            customer_email,
            customer_mobile,
            gstin,
            customer_address,
            customer_state,
            quotation_date,
            subtotal,
            cgst_amount,
            sgst_amount,
            igst_amount,
            total_amount,
            approval_status,
            delivery_status,
            calendars_delivered,
            slips_delivered,
            queries,
            payment_status,
            payment_amount,
            items
        } = req.body;

        if (!customer_name || !quotation_date || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Customer name, quotation date, and at least one item are required.' });
        }

        // Verify ownership
        const checkRes = await db.query(
            'SELECT id FROM quotations WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );
        if (checkRes.rows.length === 0) {
            return res.status(404).json({ error: 'Quotation not found' });
        }

        // Start transactional block
        await db.query('BEGIN');

        // Extract first item values for flat backward-compatibility fields on parent table
        const firstItem = items[0];
        const item_type = firstItem.item_type || firstItem.item_category || '';
        const hsn_sac = firstItem.hsn_sac || '';
        const quantity = parseFloat(firstItem.quantity || 0);
        const unit = firstItem.unit || '1';
        const price_per_unit = parseFloat(firstItem.price_per_unit || 0);
        const gst_rate = parseFloat(firstItem.gst_rate || 0);
        const size = firstItem.size || null;
        const slip_number = firstItem.slip_number || null;
        const if_spl = firstItem.if_spl || null;
        const bottom_color = firstItem.bottom_color || null;
        const top_color = firstItem.top_color || null;
        const sheeter = firstItem.sheeter || null;

        await db.query(
            `UPDATE quotations SET
                quotation_number = $1, customer_name = $2, customer_email = $3, customer_mobile = $4, gstin = $5, 
                customer_address = $6, customer_state = $7, quotation_date = $8, item_type = $9, hsn_sac = $10, 
                quantity = $11, unit = $12, price_per_unit = $13, gst_rate = $14, subtotal = $15, 
                cgst_amount = $16, sgst_amount = $17, igst_amount = $18, total_amount = $19,
                size = $20, slip_number = $21, if_spl = $22, bottom_color = $23, top_color = $24, sheeter = $25,
                approval_status = $26, delivery_status = $27, calendars_delivered = $28, slips_delivered = $29,
                queries = $30, payment_status = $31, payment_amount = $32
             WHERE id = $33 AND user_id = $34`,
            [
                quotation_number, customer_name, customer_email, customer_mobile || null, gstin || null,
                customer_address || null, customer_state || null, quotation_date, item_type, hsn_sac,
                quantity, unit, price_per_unit, gst_rate, parseFloat(subtotal),
                parseFloat(cgst_amount || 0), parseFloat(sgst_amount || 0), parseFloat(igst_amount || 0), parseFloat(total_amount),
                size, slip_number, if_spl, bottom_color, top_color, sheeter,
                approval_status || 'Pending', delivery_status || 'Not Delivered', parseInt(calendars_delivered || 0, 10), parseInt(slips_delivered || 0, 10),
                queries || null, payment_status || 'Not Received', payment_amount ? parseFloat(payment_amount) : 0,
                id, req.userId
            ]
        );

        // Delete existing items
        await db.query('DELETE FROM quotation_items WHERE quotation_id = $1', [id]);

        // Insert new items
        for (const item of items) {
            const itemTypeLabel = item.item_category === 'Other' ? item.custom_item_type : item.item_category;
            await db.query(
                `INSERT INTO quotation_items (
                    quotation_id, item_type, hsn_sac, quantity, unit, price_per_unit, gst_rate, amount,
                    size, slip_number, if_spl, bottom_color, top_color, sheeter, designs, designs_total_qty
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
                [
                    id,
                    itemTypeLabel || item.item_type || '',
                    item.hsn_sac || null,
                    parseFloat(item.quantity),
                    item.unit || '1',
                    parseFloat(item.price_per_unit),
                    parseFloat(item.gst_rate || 0),
                    parseFloat(item.quantity) * parseFloat(item.price_per_unit),
                    item.size || null,
                    item.slip_number || null,
                    item.if_spl || null,
                    item.bottom_color || null,
                    item.top_color || null,
                    item.sheeter || null,
                    item.designs ? JSON.stringify(item.designs) : null,
                    item.designs_total_qty ? parseFloat(item.designs_total_qty) : null
                ]
            );
        }

        await db.query('COMMIT');
        res.json({ message: 'Quotation updated successfully', quotationId: id });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        if (err.code === '23505') {
            return res.status(400).json({ error: `Quotation number already exists.` });
        }
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

// Cancel quotation (must be owned by the user)
router.patch('/:id/cancel', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);

        // Verify ownership and get quotation number
        const checkRes = await db.query(
            'SELECT quotation_number FROM quotations WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );
        if (checkRes.rows.length === 0) {
            return res.status(404).json({ error: 'Quotation not found' });
        }

        const oldNumber = checkRes.rows[0].quotation_number;
        const cancelledNumber = `${oldNumber}-CANCELLED-${Date.now()}`;

        await db.query('BEGIN');

        // Update status and rename number to free it up
        await db.query(
            'UPDATE quotations SET status = $1, quotation_number = $2 WHERE id = $3 AND user_id = $4',
            ['Cancelled', cancelledNumber, id, req.userId]
        );

        await db.query('COMMIT');
        res.json({ message: 'Quotation cancelled successfully', newNumber: cancelledNumber });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

// Delete quotation
router.delete('/:id', async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM quotations WHERE id = $1 AND user_id = $2 RETURNING id',
            [req.params.id, req.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Quotation not found' });
        }
        res.json({ message: 'Quotation deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

module.exports = router;
