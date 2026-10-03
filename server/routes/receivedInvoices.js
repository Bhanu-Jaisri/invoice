const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Storage Setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'received-inv-' + uniqueSuffix + ext);
    }
});

// File filter (PDF & Images)
const fileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF and image files (JPG, PNG, WEBP) are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: fileFilter
});

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

// Get all received invoices
router.get('/', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM received_invoices WHERE user_id = $1 ORDER BY invoice_date DESC, id DESC',
            [req.userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch received invoices' });
    }
});

// Get single received invoice
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'SELECT * FROM received_invoices WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Received invoice not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch received invoice' });
    }
});

// Helper function to save/update vendor details in vendors table
const upsertVendor = async (userId, name, gstin, address, email) => {
    if (!name || !name.trim()) return;
    try {
        const vName = name.trim();
        const vGstin = gstin && gstin.trim() ? gstin.trim().toUpperCase() : null;
        const vAddress = address && address.trim() ? address.trim() : null;
        const vEmail = email && email.trim() ? email.trim() : null;

        const existing = await db.query(
            'SELECT * FROM vendors WHERE LOWER(name) = LOWER($1) AND user_id = $2',
            [vName, userId]
        );

        if (existing.rows.length > 0) {
            const current = existing.rows[0];
            await db.query(
                `UPDATE vendors SET
                    gstin = COALESCE($1, gstin),
                    address = COALESCE($2, address),
                    email = COALESCE($3, email)
                 WHERE id = $4 AND user_id = $5`,
                [vGstin, vAddress, vEmail, current.id, userId]
            );
        } else {
            await db.query(
                `INSERT INTO vendors (user_id, name, gstin, address, email)
                 VALUES ($1, $2, $3, $4, $5)`,
                [userId, vName, vGstin, vAddress, vEmail]
            );
        }
    } catch (err) {
        console.error('Error auto-upserting vendor:', err);
    }
};

// Create received invoice
router.post('/', upload.single('invoice_file'), async (req, res) => {
    try {
        const { vendor_name, vendor_gstin, vendor_address, vendor_email, invoice_number, invoice_date, has_gst, total_amount, gst_amount, gst_rate, notes } = req.body;

        if (!vendor_name || !vendor_name.trim()) {
            return res.status(400).json({ error: 'Vendor/Supplier Name is required' });
        }
        if (!invoice_date) {
            return res.status(400).json({ error: 'Invoice Date is required' });
        }
        if (!total_amount || isNaN(total_amount)) {
            return res.status(400).json({ error: 'Valid Total Amount is required' });
        }

        const isGst = has_gst === 'true' || has_gst === true || has_gst === '1';
        let filePath = null;
        let fileType = null;
        let originalFilename = null;

        if (req.file) {
            filePath = `/uploads/${req.file.filename}`;
            fileType = req.file.mimetype;
            originalFilename = req.file.originalname;
        }

        const invNum = invoice_number && invoice_number.trim() ? invoice_number.trim() : null;

        const result = await db.query(
            `INSERT INTO received_invoices 
             (user_id, vendor_name, vendor_gstin, vendor_address, vendor_email, invoice_number, invoice_date, has_gst, total_amount, gst_amount, gst_rate, notes, file_path, file_type, original_filename)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
             RETURNING *`,
            [
                req.userId,
                vendor_name.trim(),
                vendor_gstin && vendor_gstin.trim() ? vendor_gstin.trim() : null,
                vendor_address && vendor_address.trim() ? vendor_address.trim() : null,
                vendor_email && vendor_email.trim() ? vendor_email.trim() : null,
                invNum,
                invoice_date,
                isGst,
                parseFloat(total_amount),
                isGst ? parseFloat(gst_amount || 0) : 0,
                isGst ? parseFloat(gst_rate || 18) : 0,
                notes ? notes.trim() : null,
                filePath,
                fileType,
                originalFilename
            ]
        );

        // Auto-save/update vendor details in vendors directory
        await upsertVendor(req.userId, vendor_name, vendor_gstin, vendor_address, vendor_email);

        res.status(201).json({
            message: 'Received invoice uploaded successfully',
            invoice: result.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save received invoice: ' + err.message });
    }
});

// Update received invoice
router.put('/:id', upload.single('invoice_file'), async (req, res) => {
    try {
        const { id } = req.params;
        const { vendor_name, vendor_gstin, vendor_address, vendor_email, invoice_number, invoice_date, has_gst, total_amount, gst_amount, gst_rate, notes } = req.body;

        const existingRes = await db.query(
            'SELECT * FROM received_invoices WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );

        if (existingRes.rows.length === 0) {
            return res.status(404).json({ error: 'Received invoice not found' });
        }

        const existing = existingRes.rows[0];

        let filePath = existing.file_path;
        let fileType = existing.file_type;
        let originalFilename = existing.original_filename;

        // If new file is uploaded, remove old file and set new path
        if (req.file) {
            if (existing.file_path) {
                const oldFullPath = path.join(__dirname, '..', existing.file_path);
                if (fs.existsSync(oldFullPath)) {
                    try { fs.unlinkSync(oldFullPath); } catch (e) {}
                }
            }
            filePath = `/uploads/${req.file.filename}`;
            fileType = req.file.mimetype;
            originalFilename = req.file.originalname;
        }

        const isGst = has_gst === 'true' || has_gst === true || has_gst === '1';
        const invNum = invoice_number !== undefined ? (invoice_number && invoice_number.trim() ? invoice_number.trim() : null) : existing.invoice_number;

        const result = await db.query(
            `UPDATE received_invoices SET
                vendor_name = $1,
                vendor_gstin = $2,
                vendor_address = $3,
                vendor_email = $4,
                invoice_number = $5,
                invoice_date = $6,
                has_gst = $7,
                total_amount = $8,
                gst_amount = $9,
                gst_rate = $10,
                notes = $11,
                file_path = $12,
                file_type = $13,
                original_filename = $14
             WHERE id = $15 AND user_id = $16
             RETURNING *`,
            [
                vendor_name ? vendor_name.trim() : existing.vendor_name,
                vendor_gstin !== undefined ? (vendor_gstin ? vendor_gstin.trim() : null) : existing.vendor_gstin,
                vendor_address !== undefined ? (vendor_address ? vendor_address.trim() : null) : existing.vendor_address,
                vendor_email !== undefined ? (vendor_email ? vendor_email.trim() : null) : existing.vendor_email,
                invNum,
                invoice_date || existing.invoice_date,
                isGst,
                parseFloat(total_amount || existing.total_amount),
                isGst ? parseFloat(gst_amount || 0) : 0,
                isGst ? parseFloat(gst_rate || 18) : 0,
                notes !== undefined ? (notes ? notes.trim() : null) : existing.notes,
                filePath,
                fileType,
                originalFilename,
                id,
                req.userId
            ]
        );

        // Auto-save/update vendor details in vendors directory
        await upsertVendor(req.userId, vendor_name || existing.vendor_name, vendor_gstin, vendor_address, vendor_email);

        res.json({
            message: 'Received invoice updated successfully',
            invoice: result.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update received invoice: ' + err.message });
    }
});

// Delete received invoice
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'DELETE FROM received_invoices WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Received invoice not found' });
        }

        const deleted = result.rows[0];
        if (deleted.file_path) {
            const fullPath = path.join(__dirname, '..', deleted.file_path);
            if (fs.existsSync(fullPath)) {
                try { fs.unlinkSync(fullPath); } catch (e) {}
            }
        }

        res.json({ message: 'Received invoice deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete received invoice' });
    }
});

module.exports = router;
