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
    const month = date.getMonth(); // 0 = Jan, 2 = Mar, 3 = Apr...
    
    let startYear, endYear;
    if (month >= 3) {
        startYear = year;
        endYear = year + 1;
    } else {
        startYear = year - 1;
        endYear = year;
    }

    const fyStartStr = `${startYear}-04-01`;
    const fyEndStr = `${endYear}-03-31`;
    const fyShort = `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
    
    return { startYear, endYear, fyStartStr, fyEndStr, fyShort };
};

// Get next order number (Resets sequence to 1 at start of each Financial Year on April 1)
router.get('/next-number', async (req, res) => {
    try {
        const { date } = req.query;
        const fy = getFinancialYearRange(date);
        const targetDate = parseDateString(date);
        const day = String(targetDate.getDate()).padStart(2, '0');
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const year = targetDate.getFullYear();
        const dateStr = `${day}${month}${year}`;

        // Get all orders created within this financial year
        const result = await db.query(
            `SELECT order_number FROM orders 
             WHERE user_id = $1 AND order_date::date >= $2::date AND order_date::date <= $3::date`,
            [req.userId, fy.fyStartStr, fy.fyEndStr]
        );

        const existingSeqs = result.rows.map(row => {
            const parts = row.order_number.split('/');
            const seqStr = parts[parts.length - 1];
            const num = parseInt(seqStr, 10);
            if (!isNaN(num)) return num;
            const match = row.order_number.match(/\d+$/);
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

        const seqFormatted = String(nextSeq).padStart(2, '0');
        const prefix = `OD/${dateStr}/`;
        const nextNumber = `${prefix}${seqFormatted}`;
        res.json({ nextNumber, financialYear: fy.fyShort });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to generate order number' });
    }
});

// Get all orders for the logged-in user (joined with nested items)
router.get('/', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT o.*, 
                    COALESCE(
                        json_agg(oi.* ORDER BY oi.id ASC) FILTER (WHERE oi.id IS NOT NULL), 
                        '[]'
                    ) as items
             FROM orders o
             LEFT JOIN order_items oi ON o.id = oi.order_id
             WHERE o.user_id = $1
             GROUP BY o.id
             ORDER BY o.created_at DESC`,
            [req.userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to retrieve orders' });
    }
});

// Get single order (must be owned by the user, joined with items and office details)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            `SELECT o.*, 
                    u.office_name, u.office_address, u.office_gstin, u.office_email, u.office_mobile, u.office_state, u.office_theme,
                    u.bank_name, u.bank_branch, u.account_name, u.account_no, u.ifsc_code, u.terms_conditions
             FROM orders o 
             LEFT JOIN users u ON o.user_id = u.id 
             WHERE o.id = $1 AND o.user_id = $2`,
            [id, req.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const order = result.rows[0];

        const itemsResult = await db.query(
            'SELECT * FROM order_items WHERE order_id = $1 ORDER BY id ASC',
            [id]
        );
        order.items = itemsResult.rows;

        res.json(order);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to retrieve order' });
    }
});

// Create new order linked to user with multi-item transactions
router.post('/', async (req, res) => {
    try {
        // Validate user profile completion before creating order
        const userCheck = await db.query(
            'SELECT office_name, office_address, office_gstin, office_email, office_mobile, office_state FROM users WHERE id = $1',
            [req.userId]
        );
        if (userCheck.rows.length === 0) {
            return res.status(400).json({ error: 'User profile not found' });
        }
        const u = userCheck.rows[0];
        if (!u.office_name || !u.office_address || !u.office_gstin || !u.office_email || !u.office_mobile || !u.office_state) {
            return res.status(400).json({ error: 'Please complete your office details (address, GSTIN, email, mobile, state) before creating orders.' });
        }

        const {
            order_number,
            customer_name,
            customer_email,
            customer_mobile,
            gstin,
            customer_address,
            customer_state,
            order_date,
            subtotal,
            cgst_amount,
            sgst_amount,
            igst_amount,
            total_amount,
            source_quotation_id,
            approval_status,
            delivery_status,
            calendars_delivered,
            slips_delivered,
            queries,
            payment_status,
            payment_amount,
            items
        } = req.body;

        if (!customer_name || !order_date || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Customer name, order date, and at least one item are required.' });
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
            `INSERT INTO orders (
                order_number, customer_name, customer_email, customer_mobile, gstin, customer_address, customer_state,
                order_date, item_type, hsn_sac, quantity, unit, price_per_unit, gst_rate, 
                subtotal, cgst_amount, sgst_amount, igst_amount, total_amount, user_id,
                size, slip_number, if_spl, bottom_color, top_color, sheeter, source_quotation_id,
                approval_status, delivery_status, calendars_delivered, slips_delivered,
                queries, payment_status, payment_amount
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34
            ) RETURNING id`,
            [
                order_number, customer_name, customer_email, customer_mobile, gstin, customer_address, customer_state || '',
                order_date, item_type, hsn_sac, quantity, unit, price_per_unit, gst_rate,
                parseFloat(subtotal), parseFloat(cgst_amount || 0), parseFloat(sgst_amount || 0), parseFloat(igst_amount || 0), parseFloat(total_amount), req.userId,
                size, slip_number, if_spl, bottom_color, top_color, sheeter, source_quotation_id || null,
                approval_status || 'Pending', delivery_status || 'Not Delivered', parseInt(calendars_delivered || 0, 10), parseInt(slips_delivered || 0, 10),
                queries || null, payment_status || 'Not Received', payment_amount ? parseFloat(payment_amount) : 0
            ]
        );

        const orderId = parentResult.rows[0].id;

        // Insert order items
        for (const item of items) {
            const itemTypeLabel = item.item_category === 'Other' ? item.custom_item_type : item.item_category;
            await db.query(
                `INSERT INTO order_items (
                    order_id, item_type, hsn_sac, quantity, unit, price_per_unit, gst_rate, amount,
                    size, slip_number, if_spl, bottom_color, top_color, sheeter, designs, designs_total_qty
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
                [
                    orderId,
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
        res.status(201).json({ message: 'Order created successfully', orderId });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        if (err.code === '23505') {
            return res.status(400).json({ error: `Order number already exists.` });
        }
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

// Update order linked to user with multi-item transactions
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Validate user profile completion before updating order
        const userCheck = await db.query(
            'SELECT office_name, office_address, office_gstin, office_email, office_mobile, office_state FROM users WHERE id = $1',
            [req.userId]
        );
        if (userCheck.rows.length === 0) {
            return res.status(400).json({ error: 'User profile not found' });
        }
        const u = userCheck.rows[0];
        if (!u.office_name || !u.office_address || !u.office_gstin || !u.office_email || !u.office_mobile || !u.office_state) {
            return res.status(400).json({ error: 'Please complete your office details before editing orders.' });
        }

        const {
            order_number,
            customer_name,
            customer_email,
            customer_mobile,
            gstin,
            customer_address,
            customer_state,
            order_date,
            subtotal,
            cgst_amount,
            sgst_amount,
            igst_amount,
            total_amount,
            source_quotation_id,
            approval_status,
            delivery_status,
            calendars_delivered,
            slips_delivered,
            queries,
            payment_status,
            payment_amount,
            items
        } = req.body;

        if (!customer_name || !order_date || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Customer name, order date, and at least one item are required.' });
        }

        // Verify ownership
        const checkRes = await db.query(
            'SELECT id FROM orders WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );
        if (checkRes.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
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
            `UPDATE orders SET
                order_number = $1, customer_name = $2, customer_email = $3, customer_mobile = $4, gstin = $5, 
                customer_address = $6, customer_state = $7, order_date = $8, item_type = $9, hsn_sac = $10, 
                quantity = $11, unit = $12, price_per_unit = $13, gst_rate = $14, subtotal = $15, 
                cgst_amount = $16, sgst_amount = $17, igst_amount = $18, total_amount = $19,
                size = $20, slip_number = $21, if_spl = $22, bottom_color = $23, top_color = $24, sheeter = $25,
                source_quotation_id = $26, approval_status = $27, delivery_status = $28, calendars_delivered = $29, slips_delivered = $30,
                queries = $31, payment_status = $32, payment_amount = $33
             WHERE id = $34 AND user_id = $35`,
            [
                order_number, customer_name, customer_email, customer_mobile || null, gstin || null,
                customer_address || null, customer_state || null, order_date, item_type, hsn_sac,
                quantity, unit, price_per_unit, gst_rate, parseFloat(subtotal),
                parseFloat(cgst_amount || 0), parseFloat(sgst_amount || 0), parseFloat(igst_amount || 0), parseFloat(total_amount),
                size, slip_number, if_spl, bottom_color, top_color, sheeter, source_quotation_id || null,
                approval_status || 'Pending', delivery_status || 'Not Delivered', parseInt(calendars_delivered || 0, 10), parseInt(slips_delivered || 0, 10),
                queries || null, payment_status || 'Not Received', payment_amount ? parseFloat(payment_amount) : 0,
                id, req.userId
            ]
        );

        // Delete existing items
        await db.query('DELETE FROM order_items WHERE order_id = $1', [id]);

        // Insert new items
        for (const item of items) {
            const itemTypeLabel = item.item_category === 'Other' ? item.custom_item_type : item.item_category;
            await db.query(
                `INSERT INTO order_items (
                    order_id, item_type, hsn_sac, quantity, unit, price_per_unit, gst_rate, amount,
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
        res.json({ message: 'Order updated successfully', orderId: id });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        if (err.code === '23505') {
            return res.status(400).json({ error: `Order number already exists.` });
        }
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

// Cancel order (must be owned by the user)
router.patch('/:id/cancel', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);

        // Verify ownership and get order number
        const checkRes = await db.query(
            'SELECT order_number FROM orders WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );
        if (checkRes.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const oldNumber = checkRes.rows[0].order_number;
        const cancelledNumber = `${oldNumber}-CANCELLED-${Date.now()}`;

        await db.query('BEGIN');

        // Update status and rename number to free it up
        await db.query(
            'UPDATE orders SET status = $1, order_number = $2 WHERE id = $3 AND user_id = $4',
            ['Cancelled', cancelledNumber, id, req.userId]
        );

        await db.query('COMMIT');
        res.json({ message: 'Order cancelled successfully', newNumber: cancelledNumber });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

// Delete order
router.delete('/:id', async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM orders WHERE id = $1 AND user_id = $2 RETURNING id',
            [req.params.id, req.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json({ message: 'Order deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

module.exports = router;
