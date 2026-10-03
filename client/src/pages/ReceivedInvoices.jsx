import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUp, Plus, Search, FileText, Image as ImageIcon, Download, Trash2, Edit3, X, CheckCircle, Paperclip, Eye, DollarSign, Calendar, Tag, AlertCircle, FileSpreadsheet, CheckSquare, Square, Printer, Loader2, Users, Phone, Mail, MapPin } from 'lucide-react';

// Safe helper to extract local YYYY-MM-DD from any date string without timezone shift
const toYYYYMMDD = (val) => {
    if (!val) return '';
    if (typeof val === 'string') {
        const cleanStr = val.split('T')[0].trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
            return cleanStr;
        }
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

// Safe helper to format display date (e.g. "10 Aug 2026")
const formatDateDisplay = (val) => {
    const cleanStr = toYYYYMMDD(val);
    if (!cleanStr) return '-';
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
        const [yyyy, mm, dd] = parts;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mIdx = parseInt(mm, 10) - 1;
        const monthName = monthNames[mIdx] || mm;
        return `${dd} ${monthName} ${yyyy}`;
    }
    return cleanStr;
};

// Safe helper for DD/MM/YYYY date format
const formatDateDMY = (val) => {
    const cleanStr = toYYYYMMDD(val);
    if (!cleanStr) return '-';
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
        const [yyyy, mm, dd] = parts;
        return `${dd}/${mm}/${yyyy}`;
    }
    return cleanStr;
};

// Helper to get local today's date YYYY-MM-DD
const getTodayDateString = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const ReceivedInvoices = () => {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [gstFilter, setGstFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [previewFile, setPreviewFile] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [viewingInvoice, setViewingInvoice] = useState(null);

    const monthsList = [
        { code: '01', name: 'January' },
        { code: '02', name: 'February' },
        { code: '03', name: 'March' },
        { code: '04', name: 'April' },
        { code: '05', name: 'May' },
        { code: '06', name: 'June' },
        { code: '07', name: 'July' },
        { code: '08', name: 'August' },
        { code: '09', name: 'September' },
        { code: '10', name: 'October' },
        { code: '11', name: 'November' },
        { code: '12', name: 'December' }
    ];

    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState('ALL');
    const [selectedMonth, setSelectedMonth] = useState('ALL');

    const [formData, setFormData] = useState({
        vendor_name: '',
        vendor_gstin: '',
        vendor_address: '',
        vendor_email: '',
        invoice_number: '',
        invoice_date: getTodayDateString(),
        has_gst: true,
        total_amount: '',
        gst_rate: '18',
        gst_amount: '',
        notes: ''
    });

    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreviewUrl, setFilePreviewUrl] = useState(null);

    const fetchInvoices = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) return;
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/received-invoices`, {
                headers: { 'x-user-id': user.id }
            });
            if (res.ok) {
                const data = await res.json();
                setInvoices(data);
            }
        } catch (err) {
            console.error('Error fetching received invoices:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchVendors = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) return;
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/vendors`, {
                headers: { 'x-user-id': user.id }
            });
            if (res.ok) {
                const data = await res.json();
                setVendors(data);
            }
        } catch (err) {
            console.error('Error fetching vendors:', err);
        }
    };

    useEffect(() => {
        fetchInvoices();
        fetchVendors();
    }, []);

    const handleVendorSelect = (vendorIdOrName) => {
        const found = vendors.find(v => v.id === Number(vendorIdOrName) || v.name.toLowerCase() === String(vendorIdOrName).toLowerCase());
        if (found) {
            setFormData(prev => ({
                ...prev,
                vendor_name: found.name,
                vendor_gstin: found.gstin || '',
                vendor_email: found.email || '',
                vendor_address: found.address || ''
            }));
        }
    };

    // Extract available years dynamically from loaded received invoices
    const availableYearsSet = new Set([String(currentYear), '2025', '2024']);
    invoices.forEach(inv => {
        const cleanDate = toYYYYMMDD(inv.invoice_date);
        if (cleanDate) {
            availableYearsSet.add(cleanDate.split('-')[0]);
        }
    });
    const availableYears = Array.from(availableYearsSet).sort((a, b) => b - a);

    const openAddModal = () => {
        setEditingInvoice(null);
        setFormData({
            vendor_name: '',
            vendor_gstin: '',
            vendor_address: '',
            vendor_email: '',
            invoice_number: '',
            invoice_date: getTodayDateString(),
            has_gst: true,
            total_amount: '',
            gst_rate: '18',
            gst_amount: '',
            notes: ''
        });
        setSelectedFile(null);
        setFilePreviewUrl(null);
        setError('');
        setSuccess('');
        setIsModalOpen(true);
    };

    const openEditModal = (invoice) => {
        setEditingInvoice(invoice);
        setFormData({
            vendor_name: invoice.vendor_name || '',
            vendor_gstin: invoice.vendor_gstin || '',
            vendor_address: invoice.vendor_address || '',
            vendor_email: invoice.vendor_email || '',
            invoice_number: invoice.invoice_number || '',
            invoice_date: toYYYYMMDD(invoice.invoice_date),
            has_gst: invoice.has_gst !== false,
            total_amount: invoice.total_amount || '',
            gst_rate: invoice.gst_rate !== undefined && invoice.gst_rate !== null ? String(invoice.gst_rate) : '18',
            gst_amount: invoice.gst_amount || '0.00',
            notes: invoice.notes || ''
        });
        setSelectedFile(null);
        setFilePreviewUrl(invoice.file_path ? `${import.meta.env.VITE_API_URL}${invoice.file_path}` : null);
        setError('');
        setSuccess('');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingInvoice(null);
        setSelectedFile(null);
        setFilePreviewUrl(null);
        setError('');
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                setError('File size must be under 10MB');
                return;
            }
            setSelectedFile(file);
            setFilePreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!formData.vendor_name.trim()) {
            setError('Vendor / Supplier name is required.');
            return;
        }
        if (!formData.invoice_date) {
            setError('Invoice date is required.');
            return;
        }
        if (!formData.total_amount || isNaN(formData.total_amount) || parseFloat(formData.total_amount) <= 0) {
            setError('Please enter a valid total amount.');
            return;
        }

        setSaving(true);
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const url = editingInvoice
                ? `${import.meta.env.VITE_API_URL}/api/received-invoices/${editingInvoice.id}`
                : `${import.meta.env.VITE_API_URL}/api/received-invoices`;
            const method = editingInvoice ? 'PUT' : 'POST';

            const payload = new FormData();
            payload.append('vendor_name', formData.vendor_name);
            payload.append('vendor_gstin', formData.vendor_gstin || '');
            payload.append('vendor_address', formData.vendor_address || '');
            payload.append('vendor_email', formData.vendor_email || '');
            payload.append('invoice_number', formData.invoice_number);
            payload.append('invoice_date', formData.invoice_date);
            payload.append('has_gst', formData.has_gst);
            payload.append('total_amount', formData.total_amount);
            payload.append('gst_rate', formData.gst_rate);
            payload.append('gst_amount', formData.gst_amount);
            payload.append('notes', formData.notes || '');

            if (selectedFile) {
                payload.append('invoice_file', selectedFile);
            }

            const res = await fetch(url, {
                method,
                headers: {
                    'x-user-id': user.id
                },
                body: payload
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(editingInvoice ? 'Invoice updated successfully!' : 'Invoice uploaded & saved successfully!');
                fetchInvoices();
                fetchVendors();
                setTimeout(() => {
                    closeModal();
                }, 600);
            } else {
                setError(data.error || 'Failed to save invoice');
            }
        } catch (err) {
            console.error(err);
            setError('Server error occurred while saving invoice');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, vendor, invNo) => {
        if (!window.confirm(`Are you sure you want to delete invoice "${invNo || 'N/A'}" from "${vendor}"?`)) return;
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/received-invoices/${id}`, {
                method: 'DELETE',
                headers: { 'x-user-id': user.id }
            });
            if (res.ok) {
                setSelectedIds(prev => prev.filter(item => item !== id));
                fetchInvoices();
            } else {
                alert('Failed to delete invoice');
            }
        } catch (err) {
            console.error(err);
            alert('Error deleting invoice');
        }
    };

    const filteredInvoices = invoices.filter(inv => {
        const query = searchTerm.toLowerCase();
        const matchesQuery = (
            (inv.vendor_name && inv.vendor_name.toLowerCase().includes(query)) ||
            (inv.vendor_gstin && inv.vendor_gstin.toLowerCase().includes(query)) ||
            (inv.vendor_email && inv.vendor_email.toLowerCase().includes(query)) ||
            (inv.vendor_address && inv.vendor_address.toLowerCase().includes(query)) ||
            (inv.invoice_number && inv.invoice_number.toLowerCase().includes(query)) ||
            (inv.notes && inv.notes.toLowerCase().includes(query))
        );

        if (!matchesQuery) return false;

        if (gstFilter === 'WITH_GST' && !inv.has_gst) return false;
        if (gstFilter === 'WITHOUT_GST' && inv.has_gst) return false;

        if (inv.invoice_date) {
            const cleanDate = toYYYYMMDD(inv.invoice_date);
            if (cleanDate) {
                const [y, m] = cleanDate.split('-');
                if (selectedYear !== 'ALL' && y !== selectedYear) return false;
                if (selectedMonth !== 'ALL' && m !== selectedMonth) return false;
            }
        }

        return true;
    });

    // Selection helper functions
    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        const allFilteredIds = filteredInvoices.map(inv => inv.id);
        const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.includes(id));
        if (isAllSelected) {
            setSelectedIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
        } else {
            setSelectedIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
        }
    };

    const clearSelection = () => {
        setSelectedIds([]);
    };

    // Export to Excel (.csv format with UTF-8 BOM for Microsoft Excel)
    const handleExportExcel = () => {
        const targets = selectedIds.length > 0
            ? invoices.filter(inv => selectedIds.includes(inv.id))
            : filteredInvoices;

        if (targets.length === 0) {
            alert('No invoices available to export.');
            return;
        }

        const headers = [
            'S.No',
            'Date',
            'Vendor / Supplier Name',
            'Vendor GSTIN',
            'Vendor Email',
            'Vendor Address',
            'Invoice Number',
            'GST Status',
            'Total GST Rate (%)',
            'CGST Rate (%)',
            'CGST Amount (INR)',
            'SGST Rate (%)',
            'SGST Amount (INR)',
            'Total GST Amount (INR)',
            'Total Amount (INR)',
            'Notes / Remarks'
        ];

        let totalSpentVal = 0;
        let totalGstVal = 0;
        let totalCgstVal = 0;
        let totalSgstVal = 0;

        const rows = targets.map((inv, idx) => {
            const total = parseFloat(inv.total_amount || 0);
            const gst = inv.has_gst ? parseFloat(inv.gst_amount || 0) : 0;
            const rate = inv.has_gst ? parseFloat(inv.gst_rate || 0) : 0;
            const halfRate = (rate / 2).toFixed(1).replace(/\.0$/, '');
            const cgst = parseFloat((gst / 2).toFixed(2));
            const sgst = parseFloat((gst - cgst).toFixed(2));

            totalSpentVal += total;
            totalGstVal += gst;
            totalCgstVal += cgst;
            totalSgstVal += sgst;

            const dateStr = inv.invoice_date
                ? formatDateDMY(inv.invoice_date)
                : '';
            const gstStatus = inv.has_gst ? 'With GST' : 'Without GST';
            const notesStr = (inv.notes || '').replace(/"/g, '""');

            return [
                idx + 1,
                `"${dateStr}"`,
                `"${(inv.vendor_name || '').replace(/"/g, '""')}"`,
                `"${(inv.vendor_gstin || '').replace(/"/g, '""')}"`,
                `"${(inv.vendor_email || '').replace(/"/g, '""')}"`,
                `"${(inv.vendor_address || '').replace(/"/g, '""')}"`,
                `"${(inv.invoice_number || '').replace(/"/g, '""')}"`,
                `"${gstStatus}"`,
                inv.has_gst ? `${rate}%` : '0%',
                inv.has_gst ? `${halfRate}%` : '0%',
                cgst.toFixed(2),
                inv.has_gst ? `${halfRate}%` : '0%',
                sgst.toFixed(2),
                gst.toFixed(2),
                total.toFixed(2),
                `"${notesStr}"`
            ].join(',');
        });

        const summaryRow = [
            '',
            '',
            '"TOTAL SUMMARY"',
            '',
            '',
            '',
            `"${targets.length} Invoice(s)"`,
            '',
            '',
            '',
            totalCgstVal.toFixed(2),
            '',
            totalSgstVal.toFixed(2),
            totalGstVal.toFixed(2),
            totalSpentVal.toFixed(2),
            ''
        ].join(',');

        const csvContent = '\uFEFF' + [headers.join(','), ...rows, summaryRow].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().split('T')[0];
        link.href = url;
        link.setAttribute('download', `Received_Invoices_${timestamp}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Export to PDF Report
    const handleExportPDF = async () => {
        const targets = selectedIds.length > 0
            ? invoices.filter(inv => selectedIds.includes(inv.id))
            : filteredInvoices;

        if (targets.length === 0) {
            alert('No invoices available to export.');
            return;
        }

        setGeneratingPdf(true);
        try {
            const html2canvasModule = await import('html2canvas-pro');
            const html2canvas = html2canvasModule.default || html2canvasModule;
            const { jsPDF } = await import('jspdf');

            const user = JSON.parse(localStorage.getItem('user')) || {};
            const officeName = user.office_name || 'NRG JAISRI PRINTERS';
            const officeAddress = user.office_address || '';
            const officeGstin = user.office_gstin || '';
            const officeMobile = user.office_mobile || '';

            const totalSpentVal = targets.reduce((sum, i) => sum + (parseFloat(i.total_amount) || 0), 0);
            const totalGstVal = targets.reduce((sum, i) => sum + (i.has_gst ? (parseFloat(i.gst_amount) || 0) : 0), 0);

            const pdfContainer = document.createElement('div');
            pdfContainer.style.position = 'absolute';
            pdfContainer.style.left = '-9999px';
            pdfContainer.style.top = '-9999px';
            pdfContainer.style.width = '800px';
            pdfContainer.style.backgroundColor = '#ffffff';
            pdfContainer.style.padding = '32px';
            pdfContainer.style.fontFamily = 'Arial, sans-serif';
            pdfContainer.style.color = '#1f2937';

            const tableRowsHtml = targets.map((inv, idx) => {
                const total = parseFloat(inv.total_amount || 0);
                const gst = inv.has_gst ? parseFloat(inv.gst_amount || 0) : 0;
                const rate = inv.has_gst ? parseFloat(inv.gst_rate || 0) : 0;
                const halfRate = (rate / 2).toFixed(1).replace(/\.0$/, '');
                const cgst = parseFloat((gst / 2).toFixed(2));
                const sgst = parseFloat((gst - cgst).toFixed(2));

                const vendorDetailsHtml = `
                    <strong>${inv.vendor_name || ''}</strong>
                    ${inv.vendor_gstin ? `<br/><span style="font-size: 8px; color: #6b21a8; font-family: monospace;">GSTIN: ${inv.vendor_gstin}</span>` : ''}
                    ${inv.vendor_email ? `<br/><span style="font-size: 8px; color: #4b5563;">${inv.vendor_email}</span>` : ''}
                `;

                return `
                    <tr style="border-bottom: 1px solid #e5e7eb; font-size: 10px;">
                        <td style="padding: 8px 6px; font-weight: bold; color: #4b5563;">${idx + 1}</td>
                        <td style="padding: 8px 6px;">${inv.invoice_date ? formatDateDMY(inv.invoice_date) : '-'}</td>
                        <td style="padding: 8px 6px; color: #111827;">${vendorDetailsHtml}</td>
                        <td style="padding: 8px 6px; font-family: monospace;">${inv.invoice_number || '-'}</td>
                        <td style="padding: 8px 6px; color: #7e22ce;">${inv.has_gst ? `CGST (${halfRate}%): ₹${cgst.toFixed(2)}` : '-'}</td>
                        <td style="padding: 8px 6px; color: #7e22ce;">${inv.has_gst ? `SGST (${halfRate}%): ₹${sgst.toFixed(2)}` : '-'}</td>
                        <td style="padding: 8px 6px; text-align: right; color: #7e22ce; font-weight: bold;">₹${gst.toFixed(2)}</td>
                        <td style="padding: 8px 6px; text-align: right; font-weight: bold; color: #047857;">₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td style="padding: 8px 6px; font-size: 9px; color: #6b7280;">${inv.notes || '-'}</td>
                    </tr>
                `;
            }).join('');

            pdfContainer.innerHTML = `
                <div style="border-bottom: 2px solid #0923b5; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0923b5;">${officeName}</h1>
                        ${officeAddress ? `<p style="margin: 4px 0 0; font-size: 11px; color: #4b5563;">${officeAddress}</p>` : ''}
                        ${officeGstin ? `<p style="margin: 2px 0 0; font-size: 11px; color: #4b5563;">GSTIN: <strong>${officeGstin}</strong></p>` : ''}
                        ${officeMobile ? `<p style="margin: 2px 0 0; font-size: 11px; color: #4b5563;">Mobile: ${officeMobile}</p>` : ''}
                    </div>
                    <div style="text-align: right;">
                        <h2 style="margin: 0; font-size: 18px; font-weight: 800; color: #111827;">RECEIVED INVOICES REPORT</h2>
                        <p style="margin: 4px 0 0; font-size: 11px; color: #6b7280;">Date Generated: <strong>${new Date().toLocaleDateString('en-IN')}</strong></p>
                        <p style="margin: 2px 0 0; font-size: 11px; color: #6b7280;">Total Invoices: <strong>${targets.length}</strong></p>
                    </div>
                </div>

                <div style="display: flex; gap: 16px; margin-bottom: 20px;">
                    <div style="flex: 1; background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 8px;">
                        <span style="font-size: 10px; font-weight: bold; color: #166534; text-transform: uppercase;">Total Purchases</span>
                        <h3 style="margin: 4px 0 0; font-size: 18px; font-weight: 800; color: #15803d;">₹${totalSpentVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                    </div>
                    <div style="flex: 1; background-color: #faf5ff; border: 1px solid #e9d5ff; padding: 12px; border-radius: 8px;">
                        <span style="font-size: 10px; font-weight: bold; color: #6b21a8; text-transform: uppercase;">Total GST Claimable</span>
                        <h3 style="margin: 4px 0 0; font-size: 18px; font-weight: 800; color: #7e22ce;">₹${totalGstVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                    </div>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr style="background-color: #f3f4f6; border-bottom: 2px solid #d1d5db; font-size: 9px; text-transform: uppercase; color: #374151;">
                            <th style="padding: 8px 6px; text-align: left;">#</th>
                            <th style="padding: 8px 6px; text-align: left;">Date</th>
                            <th style="padding: 8px 6px; text-align: left;">Vendor Details</th>
                            <th style="padding: 8px 6px; text-align: left;">Invoice No</th>
                            <th style="padding: 8px 6px; text-align: left;">CGST (9%)</th>
                            <th style="padding: 8px 6px; text-align: left;">SGST (9%)</th>
                            <th style="padding: 8px 6px; text-align: right;">Total GST</th>
                            <th style="padding: 8px 6px; text-align: right;">Total Amount</th>
                            <th style="padding: 8px 6px; text-align: left;">Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRowsHtml}
                    </tbody>
                    <tfoot>
                        <tr style="background-color: #f9fafb; border-top: 2px solid #9ca3af; font-size: 11px; font-weight: bold;">
                            <td colspan="6" style="padding: 10px; text-align: right; color: #111827;">Grand Total (${targets.length} Invoices):</td>
                            <td style="padding: 10px; text-align: right; color: #7e22ce;">₹${totalGstVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td style="padding: 10px; text-align: right; color: #15803d;">₹${totalSpentVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>

                <div style="border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 10px; color: #9ca3af; text-align: center;">
                    This is a computer-generated Received Invoices Report from ${officeName}.
                </div>
            `;

            document.body.appendChild(pdfContainer);

            const canvas = await html2canvas(pdfContainer, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff'
            });

            document.body.removeChild(pdfContainer);

            const imgData = canvas.toDataURL('image/png', 1.0);
            const pdf = new jsPDF('portrait', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            const timestamp = new Date().toISOString().split('T')[0];
            pdf.save(`Received_Invoices_Report_${timestamp}.pdf`);
        } catch (err) {
            console.error('Error generating PDF report:', err);
            alert('Failed to generate PDF report: ' + err.message);
        } finally {
            setGeneratingPdf(false);
        }
    };

    // Summary calculations
    const totalSpent = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
    const totalGstClaimed = invoices.reduce((sum, inv) => sum + (inv.has_gst ? (parseFloat(inv.gst_amount) || 0) : 0), 0);

    const isAllFilteredSelected = filteredInvoices.length > 0 && filteredInvoices.every(inv => selectedIds.includes(inv.id));
    const selectedCount = selectedIds.length;
    const selectedInvoices = invoices.filter(inv => selectedIds.includes(inv.id));
    const selectedTotalSpent = selectedInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
                        <FileUp className="text-primary" size={24} />
                        <span>Received Invoices (Purchases & Expenses)</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">Upload, filter by month & year, select and export bills/invoices received from vendors.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                    <button
                        onClick={handleExportPDF}
                        disabled={generatingPdf || filteredInvoices.length === 0}
                        className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3.5 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all text-xs font-bold disabled:opacity-50"
                        title="Download PDF report of selected or all invoices"
                    >
                        {generatingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                        <span>{selectedCount > 0 ? `Export Selected PDF (${selectedCount})` : 'Export PDF'}</span>
                    </button>
                    <button
                        onClick={handleExportExcel}
                        disabled={filteredInvoices.length === 0}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3.5 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all text-xs font-bold disabled:opacity-50"
                        title="Download Excel / CSV report of selected or all invoices"
                    >
                        <FileSpreadsheet size={16} />
                        <span>{selectedCount > 0 ? `Export Selected Excel (${selectedCount})` : 'Export Excel'}</span>
                    </button>
                    <button
                        onClick={openAddModal}
                        className="bg-primary hover:bg-secondary text-white px-5 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-all font-bold shadow-sm text-xs"
                    >
                        <Plus size={18} />
                        <span>Upload New Invoice</span>
                    </button>
                </div>
            </div>

            {/* Summary Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Received Invoices</p>
                        <h3 className="text-2xl font-black text-gray-800 mt-1">{invoices.length}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 text-primary rounded-xl">
                        <FileText size={24} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Purchases (₹)</p>
                        <h3 className="text-2xl font-black text-emerald-600 mt-1">₹{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <DollarSign size={24} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total GST Claimable (₹)</p>
                        <h3 className="text-2xl font-black text-purple-600 mt-1">₹{totalGstClaimed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                    </div>
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                        <Tag size={24} />
                    </div>
                </div>
            </div>

            {/* Selection Banner when items are selected */}
            {selectedCount > 0 && (
                <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3 animate-fadeIn">
                    <div className="flex items-center space-x-2 text-purple-900 font-bold text-xs">
                        <CheckSquare className="text-purple-600" size={18} />
                        <span>{selectedCount} invoice(s) selected</span>
                        <span className="text-purple-600 font-normal">| Total Amount: ₹{selectedTotalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handleExportPDF}
                            disabled={generatingPdf}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1"
                        >
                            <FileText size={14} />
                            <span>Download PDF ({selectedCount})</span>
                        </button>
                        <button
                            onClick={handleExportExcel}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1"
                        >
                            <FileSpreadsheet size={14} />
                            <span>Download Excel ({selectedCount})</span>
                        </button>
                        <button
                            onClick={clearSelection}
                            className="text-gray-500 hover:text-gray-700 text-xs font-semibold px-2 py-1"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            )}

            {/* Search & Filter Options */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
                    <div className="relative w-full sm:w-72">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                            <Search size={18} />
                        </span>
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all shadow-xs"
                            placeholder="Search vendor, GSTIN, email, address, remarks..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Month Filter Dropdown */}
                    <div className="relative">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                        >
                            <option value="ALL">All Months</option>
                            {monthsList.map(m => (
                                <option key={m.code} value={m.code}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Year Filter Dropdown */}
                    <div className="relative">
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="w-full bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                        >
                            <option value="ALL">All Years</option>
                            {availableYears.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <button
                        onClick={() => setGstFilter('ALL')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${gstFilter === 'ALL' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                    >
                        All ({invoices.length})
                    </button>
                    <button
                        onClick={() => setGstFilter('WITH_GST')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${gstFilter === 'WITH_GST' ? 'bg-purple-600 text-white' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                    >
                        With GST ({invoices.filter(i => i.has_gst).length})
                    </button>
                    <button
                        onClick={() => setGstFilter('WITHOUT_GST')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${gstFilter === 'WITHOUT_GST' ? 'bg-gray-700 text-white' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                    >
                        Without GST ({invoices.filter(i => !i.has_gst).length})
                    </button>
                </div>
            </div>

            {/* Invoices Table */}
            {loading ? (
                <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-100">
                    Loading received invoices...
                </div>
            ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 space-y-3">
                    <FileUp size={48} className="mx-auto text-gray-300" />
                    <h3 className="text-base font-bold text-gray-700">No Received Invoices Found</h3>
                    <p className="text-xs text-gray-400">
                        {searchTerm || selectedMonth !== 'ALL' || selectedYear !== 'ALL' ? 'No invoices match your selected filters.' : 'Upload vendor bills and received invoices to store attachments.'}
                    </p>
                    {!(searchTerm || selectedMonth !== 'ALL' || selectedYear !== 'ALL') && (
                        <button
                            onClick={openAddModal}
                            className="mt-2 bg-primary hover:bg-secondary text-white px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5"
                        >
                            <Plus size={16} />
                            <span>Upload Invoice</span>
                        </button>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                                    <th className="p-4 w-10 text-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                                            checked={isAllFilteredSelected}
                                            onChange={toggleSelectAll}
                                            title="Select all visible invoices"
                                        />
                                    </th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Vendor / Supplier</th>
                                    <th className="p-4">GST Amount</th>
                                    <th className="p-4">Total Amount</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs">
                                {filteredInvoices.map(inv => {
                                    const isSelected = selectedIds.includes(inv.id);
                                    return (
                                        <tr key={inv.id} className={`hover:bg-gray-50/50 transition-colors ${isSelected ? 'bg-purple-50/40' : ''}`}>
                                            <td className="p-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelect(inv.id)}
                                                />
                                            </td>
                                            <td className="p-4 text-gray-600 font-medium whitespace-nowrap">
                                                {formatDateDisplay(inv.invoice_date)}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-gray-800">{inv.vendor_name || 'N/A'}</div>
                                                {inv.vendor_gstin && (
                                                    <div className="text-[10px] font-mono text-purple-700 font-semibold mt-0.5">GSTIN: {inv.vendor_gstin}</div>
                                                )}
                                                {inv.vendor_email && (
                                                    <div className="text-[10px] text-gray-500 mt-0.5">{inv.vendor_email}</div>
                                                )}
                                            </td>
                                            <td className="p-4 font-bold text-purple-700 whitespace-nowrap">
                                                {inv.has_gst ? (
                                                    <div>
                                                        <div>₹{parseFloat(inv.gst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                                        <div className="text-[10px] text-purple-600 font-normal mt-0.5">
                                                            CGST ({(parseFloat(inv.gst_rate || 0) / 2).toFixed(1).replace(/\.0$/, '')}%): ₹{(parseFloat(inv.gst_amount || 0) / 2).toFixed(2)} | SGST ({(parseFloat(inv.gst_rate || 0) / 2).toFixed(1).replace(/\.0$/, '')}%): ₹{(parseFloat(inv.gst_amount || 0) - parseFloat((parseFloat(inv.gst_amount || 0) / 2).toFixed(2))).toFixed(2)}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    '₹0.00'
                                                )}
                                            </td>
                                            <td className="p-4 font-bold text-emerald-700 whitespace-nowrap">
                                                ₹{parseFloat(inv.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end items-center space-x-2">
                                                    <button
                                                        onClick={() => setViewingInvoice(inv)}
                                                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-colors inline-flex items-center space-x-1"
                                                        title="View Details & File Attachment"
                                                    >
                                                        <Eye size={14} />
                                                        <span>View</span>
                                                    </button>
                                                    <button
                                                        onClick={() => openEditModal(inv)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Edit Invoice"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(inv.id, inv.vendor_name, inv.invoice_number)}
                                                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                        title="Delete Invoice"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add / Edit Received Invoice Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-xl max-h-[90vh] rounded-2xl shadow-xl overflow-hidden flex flex-col animate-fadeIn">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 shrink-0">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                                <FileUp size={20} className="text-primary" />
                                <span>{editingInvoice ? 'Edit Received Invoice' : 'Upload Received Invoice'}</span>
                            </h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
                                        <AlertCircle size={16} />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {success && (
                                    <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs flex items-center space-x-2">
                                        <CheckCircle size={16} />
                                        <span>{success}</span>
                                    </div>
                                )}

                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-xs font-bold text-gray-700">
                                            Vendor / Supplier Name <span className="text-red-500">*</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => navigate('/vendors')}
                                            className="text-primary hover:underline text-[11px] font-semibold flex items-center space-x-1"
                                        >
                                            <Users size={12} />
                                            <span>Manage Vendors</span>
                                        </button>
                                    </div>
                                    <input
                                        required
                                        type="text"
                                        list="vendors-datalist"
                                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                        placeholder="Type or select vendor name (e.g. ABC Paper Mills Ltd)"
                                        value={formData.vendor_name}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setFormData(prev => {
                                                const updated = { ...prev, vendor_name: val };
                                                const match = vendors.find(v => (v.name || '').trim().toLowerCase() === (val || '').trim().toLowerCase());
                                                if (match) {
                                                    updated.vendor_gstin = match.gstin || '';
                                                    updated.vendor_email = match.email || '';
                                                    updated.vendor_address = match.address || '';
                                                }
                                                return updated;
                                            });
                                        }}
                                    />
                                    <datalist id="vendors-datalist">
                                        {vendors.map(v => (
                                            <option key={v.id} value={v.name}>
                                                {v.gstin ? `GSTIN: ${v.gstin}` : ''} {v.email ? `| Email: ${v.email}` : ''}
                                            </option>
                                        ))}
                                    </datalist>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Vendor GSTIN <span className="text-gray-400 font-normal">(Optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm uppercase focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-mono"
                                            placeholder="e.g. 33AAAAA0000A1Z5"
                                            value={formData.vendor_gstin}
                                            onChange={(e) => setFormData({ ...formData, vendor_gstin: e.target.value.toUpperCase() })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Vendor Email ID <span className="text-gray-400 font-normal">(Optional)</span>
                                        </label>
                                        <input
                                            type="email"
                                            className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                            placeholder="e.g. vendor@supplier.com"
                                            value={formData.vendor_email}
                                            onChange={(e) => setFormData({ ...formData, vendor_email: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Vendor Address <span className="text-gray-400 font-normal">(Optional)</span>
                                    </label>
                                    <textarea
                                        rows="2"
                                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                                        placeholder="e.g. No. 12, Industrial Estate, Guindy, Chennai, Tamil Nadu - 600032"
                                        value={formData.vendor_address}
                                        onChange={(e) => setFormData({ ...formData, vendor_address: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Invoice Number <span className="text-gray-400 font-normal">(Optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                            placeholder="e.g. INV-2026-0042 (Optional)"
                                            value={formData.invoice_number}
                                            onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Invoice Date <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="date"
                                            className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                            value={formData.invoice_date}
                                            onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Total Amount (₹) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-bold text-gray-800"
                                        placeholder="0.00"
                                        value={formData.total_amount}
                                        onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                                    />
                                </div>

                                {/* GST Toggle Option */}
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">GST Tax Option</span>
                                        <div className="flex items-center space-x-4">
                                            <label className="flex items-center space-x-1.5 text-xs font-bold cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="gst_option"
                                                    checked={formData.has_gst}
                                                    onChange={() => setFormData({ ...formData, has_gst: true })}
                                                    className="text-primary focus:ring-primary"
                                                />
                                                <span className={formData.has_gst ? 'text-primary' : 'text-gray-600'}>With GST</span>
                                            </label>
                                            <label className="flex items-center space-x-1.5 text-xs font-bold cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="gst_option"
                                                    checked={!formData.has_gst}
                                                    onChange={() => setFormData({ ...formData, has_gst: false })}
                                                    className="text-primary focus:ring-primary"
                                                />
                                                <span className={!formData.has_gst ? 'text-gray-800' : 'text-gray-600'}>Without GST</span>
                                            </label>
                                        </div>
                                    </div>

                                    {formData.has_gst && (
                                        <div className="space-y-3 pt-2 border-t border-gray-200/60">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                        GST Rate (%) <span className="text-gray-400 font-normal">(Manual Type)</span>
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            step="any"
                                                            min="0"
                                                            max="100"
                                                            className="w-full px-3.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                                            placeholder="e.g. 18, 12, 5, 28"
                                                            value={formData.gst_rate}
                                                            onChange={(e) => setFormData({ ...formData, gst_rate: e.target.value })}
                                                        />
                                                        <span className="absolute right-3 top-1.5 text-xs text-gray-400 font-bold">%</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1.5 mt-2 flex-wrap gap-y-1">
                                                        <span className="text-[10px] text-gray-400 font-medium">Quick presets:</span>
                                                        {['0', '5', '12', '18', '28'].map(rate => (
                                                            <button
                                                                key={rate}
                                                                type="button"
                                                                onClick={() => setFormData({ ...formData, gst_rate: rate })}
                                                                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                                                                    formData.gst_rate === rate
                                                                        ? 'bg-purple-600 text-white'
                                                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                                }`}
                                                            >
                                                                {rate}%
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                        GST Amount (₹) <span className="text-purple-600 font-bold">(Manual Entry)</span>
                                                    </label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1.5 text-xs text-purple-700 font-bold">₹</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            className="w-full pl-7 pr-3.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-purple-700 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                                            placeholder="0.00"
                                                            value={formData.gst_amount}
                                                            onChange={(e) => setFormData({ ...formData, gst_amount: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* CGST & SGST Calculated Breakdown Box */}
                                            {parseFloat(formData.gst_rate || 0) > 0 && (
                                                <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl flex items-center justify-between text-xs font-bold text-purple-900 mt-2">
                                                    <div className="flex items-center space-x-1.5">
                                                        <span className="bg-purple-600 text-white px-2 py-0.5 rounded text-[10px]">
                                                            CGST ({(parseFloat(formData.gst_rate || 0) / 2).toFixed(1).replace(/\.0$/, '')}%)
                                                        </span>
                                                        <span>₹{(parseFloat(formData.gst_amount || 0) / 2).toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1.5">
                                                        <span className="bg-purple-600 text-white px-2 py-0.5 rounded text-[10px]">
                                                            SGST ({(parseFloat(formData.gst_rate || 0) / 2).toFixed(1).replace(/\.0$/, '')}%)
                                                        </span>
                                                        <span>₹{(parseFloat(formData.gst_amount || 0) - parseFloat((parseFloat(formData.gst_amount || 0) / 2).toFixed(2))).toFixed(2)}</span>
                                                    </div>
                                                    <div className="text-[11px] text-purple-700">
                                                        Total GST: ₹{formData.gst_amount || '0.00'}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Upload Invoice File Attachment */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Upload Invoice File (PDF / Image)
                                    </label>
                                    <div className="border-2 border-dashed border-gray-300 hover:border-primary p-4 rounded-xl text-center bg-gray-50/50 transition-colors">
                                        <input
                                            type="file"
                                            id="invoice-file-input"
                                            accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                                            className="hidden"
                                            onChange={handleFileChange}
                                        />
                                        <label htmlFor="invoice-file-input" className="cursor-pointer flex flex-col items-center space-y-1.5">
                                            <Paperclip className="text-gray-400" size={24} />
                                            <span className="text-xs font-semibold text-primary hover:underline">
                                                {selectedFile ? selectedFile.name : 'Click to browse or attach PDF / Image file'}
                                            </span>
                                            <span className="text-[10px] text-gray-400">Supported formats: PDF, JPG, PNG, WEBP (Max 10MB)</span>
                                        </label>
                                    </div>
                                    {filePreviewUrl && !selectedFile && (
                                        <div className="mt-2 text-xs text-gray-600 flex items-center justify-between bg-blue-50 p-2 rounded-lg">
                                            <span>Current File Attached:</span>
                                            <a href={filePreviewUrl} target="_blank" rel="noopener noreferrer" className="text-primary font-bold hover:underline flex items-center space-x-1">
                                                <Eye size={14} />
                                                <span>View Attached File</span>
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {/* Notes / Remarks */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Notes / Remarks</label>
                                    <textarea
                                        rows="2"
                                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                                        placeholder="Add any notes or payment status remarks for this purchase invoice..."
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-primary hover:bg-secondary text-white px-5 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : editingInvoice ? 'Update Invoice' : 'Save Received Invoice'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Received Invoice Details Modal */}
            {viewingInvoice && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-8 animate-fadeIn">
                        {/* Modal Header */}
                        <div className="p-6 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                                <div className="p-2.5 bg-white/10 rounded-xl">
                                    <FileText size={22} className="text-blue-300" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold">{viewingInvoice.vendor_name || 'N/A'}</h2>
                                    <p className="text-xs text-gray-300 font-mono">
                                        {viewingInvoice.invoice_number ? `Invoice No: ${viewingInvoice.invoice_number}` : 'No Invoice Number Specified'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setViewingInvoice(null)}
                                className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                            {/* Vendor Information Details Card */}
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                                <div className="flex flex-wrap justify-between items-start gap-2">
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Vendor / Supplier</span>
                                        <span className="text-sm font-bold text-gray-900 mt-0.5 block">{viewingInvoice.vendor_name || 'N/A'}</span>
                                    </div>
                                    {viewingInvoice.vendor_gstin && (
                                        <div className="bg-purple-100 text-purple-800 px-2.5 py-1 rounded-lg text-xs font-bold font-mono">
                                            GSTIN: {viewingInvoice.vendor_gstin}
                                        </div>
                                    )}
                                </div>
                                {viewingInvoice.vendor_email && (
                                    <div className="text-xs text-gray-600">
                                        <span className="font-semibold text-gray-500">Email ID:</span> {viewingInvoice.vendor_email}
                                    </div>
                                )}
                                {viewingInvoice.vendor_address && (
                                    <div className="text-xs text-gray-600 whitespace-pre-line">
                                        <span className="font-semibold text-gray-500">Address:</span> {viewingInvoice.vendor_address}
                                    </div>
                                )}
                            </div>

                            {/* Summary Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Invoice Date</span>
                                    <span className="text-xs font-bold text-gray-800 mt-1 block">
                                        {formatDateDisplay(viewingInvoice.invoice_date)}
                                    </span>
                                </div>

                                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">GST Option & Rate</span>
                                    <span className="mt-1 inline-block">
                                        {viewingInvoice.has_gst ? (
                                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                                With GST ({viewingInvoice.gst_rate}%)
                                            </span>
                                        ) : (
                                            <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                                Without GST
                                            </span>
                                        )}
                                    </span>
                                </div>

                                <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-100 col-span-2 sm:col-span-3 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Total GST Amount</span>
                                        <span className="text-sm font-black text-purple-800">
                                            ₹{parseFloat(viewingInvoice.gst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    {viewingInvoice.has_gst && (
                                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-purple-200/60 text-xs">
                                            <div className="bg-white p-2.5 rounded-lg border border-purple-200/60 flex justify-between items-center">
                                                <span className="text-[10px] text-purple-600 font-bold">CGST ({(parseFloat(viewingInvoice.gst_rate || 0) / 2).toFixed(1).replace(/\.0$/, '')}%)</span>
                                                <span className="font-bold text-purple-900">
                                                    ₹{(parseFloat(viewingInvoice.gst_amount || 0) / 2).toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="bg-white p-2.5 rounded-lg border border-purple-200/60 flex justify-between items-center">
                                                <span className="text-[10px] text-purple-600 font-bold">SGST ({(parseFloat(viewingInvoice.gst_rate || 0) / 2).toFixed(1).replace(/\.0$/, '')}%)</span>
                                                <span className="font-bold text-purple-900">
                                                    ₹{(parseFloat(viewingInvoice.gst_amount || 0) - parseFloat((parseFloat(viewingInvoice.gst_amount || 0) / 2).toFixed(2))).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-100 col-span-2 sm:col-span-3">
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Total Purchase Amount</span>
                                    <span className="text-xl font-black text-emerald-700 mt-1 block">
                                        ₹{parseFloat(viewingInvoice.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            {/* Remarks / Notes */}
                            {viewingInvoice.notes && (
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Remarks / Notes</h4>
                                    <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{viewingInvoice.notes}</p>
                                </div>
                            )}

                            {/* Attached File Section */}
                            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center space-x-1.5">
                                        <Paperclip size={14} className="text-primary" />
                                        <span>Attached Invoice File</span>
                                    </h4>
                                    {viewingInvoice.file_path && (
                                        <a
                                            href={`${import.meta.env.VITE_API_URL}${viewingInvoice.file_path}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-bold text-primary hover:underline inline-flex items-center space-x-1"
                                        >
                                            <Eye size={14} />
                                            <span>Open Original File</span>
                                        </a>
                                    )}
                                </div>

                                {viewingInvoice.file_path ? (
                                    <div className="mt-2">
                                        {viewingInvoice.file_type && viewingInvoice.file_type.startsWith('image/') ? (
                                            <div className="rounded-xl overflow-hidden border border-gray-200 bg-white p-2 text-center">
                                                <img
                                                    src={`${import.meta.env.VITE_API_URL}${viewingInvoice.file_path}`}
                                                    alt={viewingInvoice.original_filename || 'Invoice attachment'}
                                                    className="max-h-96 mx-auto object-contain rounded-lg shadow-sm"
                                                />
                                                <p className="text-[11px] text-gray-400 mt-2">{viewingInvoice.original_filename || 'Attached Image'}</p>
                                            </div>
                                        ) : viewingInvoice.file_type === 'application/pdf' ? (
                                            <div className="rounded-xl overflow-hidden border border-gray-200 bg-white p-2">
                                                <iframe
                                                    src={`${import.meta.env.VITE_API_URL}${viewingInvoice.file_path}`}
                                                    title="Invoice PDF Preview"
                                                    className="w-full h-80 rounded-lg border-0"
                                                />
                                                <div className="mt-2 text-center">
                                                    <a
                                                        href={`${import.meta.env.VITE_API_URL}${viewingInvoice.file_path}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs font-bold text-primary hover:underline inline-flex items-center space-x-1"
                                                    >
                                                        <Download size={14} />
                                                        <span>Download PDF Attachment</span>
                                                    </a>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-white rounded-xl border border-gray-200 flex items-center justify-between">
                                                <span className="text-xs font-medium text-gray-700">{viewingInvoice.original_filename || 'Attachment File'}</span>
                                                <a
                                                    href={`${import.meta.env.VITE_API_URL}${viewingInvoice.file_path}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-secondary transition-colors"
                                                >
                                                    Download Attachment
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 italic">No document or image file attached to this invoice.</p>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                            <button
                                onClick={() => {
                                    const invToEdit = viewingInvoice;
                                    setViewingInvoice(null);
                                    openEditModal(invToEdit);
                                }}
                                className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5"
                            >
                                <Edit3 size={16} />
                                <span>Edit Invoice</span>
                            </button>

                            <button
                                onClick={() => setViewingInvoice(null)}
                                className="bg-gray-800 hover:bg-gray-900 text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReceivedInvoices;

