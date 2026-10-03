import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, Search, FileText, Trash2, XCircle, Pencil, FileCheck, ShoppingBag, TrendingUp, Calendar, BookOpen, CreditCard, FileUp, Tag, CheckCircle, AlertCircle, Filter, ArrowUpRight, ArrowDownRight, Download, FileSpreadsheet, CheckSquare, Square, Loader2, X, SlidersHorizontal } from 'lucide-react';

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

const formatDate = (dateString) => {
    const cleanStr = toYYYYMMDD(dateString);
    if (!cleanStr) return '';
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
        const [yyyy, mm, dd] = parts;
        return `${dd}-${mm}-${yyyy}`;
    }
    return cleanStr;
};

const getTodayDateString = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const COLUMN_CONFIGS = {
    'invoices': [
        { key: 'invoice_number', label: 'Invoice #', default: true },
        { key: 'invoice_date', label: 'Invoice Date', default: true },
        { key: 'customer_name', label: 'Customer Name', default: true },
        { key: 'customer_mobile', label: 'Customer Mobile', default: false },
        { key: 'customer_email', label: 'Customer Email', default: false },
        { key: 'gstin', label: 'Customer GSTIN', default: true },
        { key: 'customer_address', label: 'Customer Address', default: false },
        { key: 'subtotal', label: 'Subtotal (₹)', default: false },
        { key: 'cgst_amount', label: 'CGST Amount (₹)', default: true },
        { key: 'sgst_amount', label: 'SGST Amount (₹)', default: true },
        { key: 'igst_amount', label: 'IGST Amount (₹)', default: true },
        { key: 'total_gst', label: 'Total GST (₹)', default: true },
        { key: 'round_off', label: 'Round Off (₹)', default: false },
        { key: 'total_amount', label: 'Total Amount (₹)', default: true },
        { key: 'status', label: 'Status', default: true }
    ],
    'received-invoices': [
        { key: 'invoice_date', label: 'Invoice Date', default: true },
        { key: 'vendor_name', label: 'Vendor / Supplier Name', default: true },
        { key: 'vendor_gstin', label: 'Vendor GSTIN', default: true },
        { key: 'vendor_email', label: 'Vendor Email', default: false },
        { key: 'vendor_address', label: 'Vendor Address', default: false },
        { key: 'invoice_number', label: 'Invoice / Bill #', default: true },
        { key: 'has_gst', label: 'GST Option', default: true },
        { key: 'gst_rate', label: 'GST Rate (%)', default: false },
        { key: 'cgst_amount', label: 'CGST Amount (₹)', default: true },
        { key: 'sgst_amount', label: 'SGST Amount (₹)', default: true },
        { key: 'gst_amount', label: 'Total GST Claimable (₹)', default: true },
        { key: 'total_amount', label: 'Total Purchase Amount (₹)', default: true },
        { key: 'notes', label: 'Notes / Remarks', default: false }
    ],
    'quotations': [
        { key: 'quotation_number', label: 'Quotation #', default: true },
        { key: 'quotation_date', label: 'Date', default: true },
        { key: 'customer_name', label: 'Customer Name', default: true },
        { key: 'customer_mobile', label: 'Mobile', default: true },
        { key: 'customer_email', label: 'Email', default: false },
        { key: 'gstin', label: 'GSTIN', default: false },
        { key: 'item_type', label: 'Item Type', default: true },
        { key: 'quantity', label: 'Quantity', default: true },
        { key: 'price_per_unit', label: 'Price/Unit', default: true },
        { key: 'total_amount', label: 'Total Amount (₹)', default: true },
        { key: 'approval_status', label: 'Approval Status', default: true }
    ],
    'orders': [
        { key: 'order_number', label: 'Order #', default: true },
        { key: 'order_date', label: 'Order Date', default: true },
        { key: 'customer_name', label: 'Customer Name', default: true },
        { key: 'customer_mobile', label: 'Mobile', default: true },
        { key: 'customer_email', label: 'Email', default: false },
        { key: 'gstin', label: 'GSTIN', default: false },
        { key: 'customer_address', label: 'Address', default: false },
        { key: 'item_type', label: 'Item Type', default: true },
        { key: 'size', label: 'Size', default: true },
        { key: 'slip_number', label: 'Slip #', default: true },
        { key: 'quantity', label: 'Quantity', default: true },
        { key: 'price_per_unit', label: 'Price/Unit', default: true },
        { key: 'total_amount', label: 'Total Amount (₹)', default: true },
        { key: 'approval_status', label: 'Approval Status', default: true },
        { key: 'delivery_status', label: 'Delivery Status', default: true },
        { key: 'payment_status', label: 'Payment Status', default: true },
        { key: 'advance_amount', label: 'Advance Amount (₹)', default: true }
    ]
};

const Dashboard = () => {
    const location = useLocation();
    const [invoices, setInvoices] = useState([]);
    const [quotations, setQuotations] = useState([]);
    const [orders, setOrders] = useState([]);
    const [receivedInvoices, setReceivedInvoices] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);

    // Year & Month Filter state for GST Settlement
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(String(currentYear));
    const [selectedMonth, setSelectedMonth] = useState('ALL');

    // Custom Column Export State
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportReportType, setExportReportType] = useState('invoices');
    const [selectedColumns, setSelectedColumns] = useState([]);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    const openExportModal = (type = 'invoices') => {
        const rType = type === 'overview' ? 'invoices' : type;
        setExportReportType(rType);
        const configs = COLUMN_CONFIGS[rType] || [];
        const defaults = configs.filter(c => c.default).map(c => c.key);
        setSelectedColumns(defaults);
        setIsExportModalOpen(true);
    };

    const handleReportTypeChange = (newType) => {
        setExportReportType(newType);
        const configs = COLUMN_CONFIGS[newType] || [];
        const defaults = configs.filter(c => c.default).map(c => c.key);
        setSelectedColumns(defaults);
    };

    const toggleColumn = (key) => {
        setSelectedColumns(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const selectAllColumns = () => {
        const configs = COLUMN_CONFIGS[exportReportType] || [];
        setSelectedColumns(configs.map(c => c.key));
    };

    const deselectAllColumns = () => {
        setSelectedColumns([]);
    };

    const getCellValue = (item, key, type) => {
        switch (key) {
            case 'invoice_number': return item.invoice_number || item.bill_number || '-';
            case 'quotation_number': return item.quotation_number || '-';
            case 'order_number': return item.order_number || '-';
            case 'invoice_date':
            case 'quotation_date':
            case 'order_date': return item.invoice_date || item.quotation_date || item.order_date ? formatDate(item.invoice_date || item.quotation_date || item.order_date) : '-';
            case 'customer_name': return item.customer_name || '-';
            case 'vendor_name': return item.vendor_name || '-';
            case 'customer_mobile': return item.customer_mobile || item.mobile || '-';
            case 'customer_email': return item.customer_email || item.email || '-';
            case 'vendor_email': return item.vendor_email || '-';
            case 'gstin': return item.gstin || '-';
            case 'vendor_gstin': return item.vendor_gstin || '-';
            case 'customer_address': return item.customer_address || '-';
            case 'vendor_address': return item.vendor_address || '-';
            case 'subtotal': return parseFloat(item.subtotal || 0).toFixed(2);
            case 'cgst_amount': {
                if (type === 'received-invoices') {
                    const gst = item.has_gst ? parseFloat(item.gst_amount || 0) : 0;
                    return (gst / 2).toFixed(2);
                }
                return parseFloat(item.cgst_amount || 0).toFixed(2);
            }
            case 'sgst_amount': {
                if (type === 'received-invoices') {
                    const gst = item.has_gst ? parseFloat(item.gst_amount || 0) : 0;
                    return (gst - parseFloat((gst / 2).toFixed(2))).toFixed(2);
                }
                return parseFloat(item.sgst_amount || 0).toFixed(2);
            }
            case 'igst_amount': return parseFloat(item.igst_amount || 0).toFixed(2);
            case 'total_gst':
            case 'gst_amount': {
                if (type === 'received-invoices') {
                    return item.has_gst ? parseFloat(item.gst_amount || 0).toFixed(2) : '0.00';
                }
                const cgst = parseFloat(item.cgst_amount || 0);
                const sgst = parseFloat(item.sgst_amount || 0);
                const igst = parseFloat(item.igst_amount || 0);
                return (cgst + sgst + igst).toFixed(2);
            }
            case 'has_gst': return item.has_gst ? 'With GST' : 'Without GST';
            case 'gst_rate': return item.has_gst ? `${item.gst_rate || 0}%` : '0%';
            case 'round_off': return parseFloat(item.round_off || 0).toFixed(2);
            case 'total_amount': return parseFloat(item.total_amount || 0).toFixed(2);
            case 'status': return item.status || 'Active';
            case 'item_type': return item.item_type || '-';
            case 'size': return item.size || '-';
            case 'slip_number': return item.slip_number || '-';
            case 'quantity': return item.quantity !== undefined && item.quantity !== null ? item.quantity.toString() : '-';
            case 'unit': return item.unit || '1';
            case 'price_per_unit': return item.price_per_unit ? parseFloat(item.price_per_unit).toFixed(2) : '-';
            case 'approval_status': return item.approval_status || 'Pending';
            case 'delivery_status': return item.delivery_status || 'Not Delivered';
            case 'payment_status': return item.payment_status || 'Not Received';
            case 'advance_amount': return item.advance_amount ? parseFloat(item.advance_amount).toFixed(2) : '0.00';
            case 'notes': return item.notes || '-';
            default: return item[key] ? String(item[key]) : '-';
        }
    };

    const getTargetExportItems = (type) => {
        if (type === 'invoices') return invoices;
        if (type === 'received-invoices') return receivedInvoices;
        if (type === 'quotations') return quotations;
        if (type === 'orders') return orders;
        return [];
    };

    const handleRunExportExcel = () => {
        const type = exportReportType;
        const targetItems = getTargetExportItems(type);
        if (targetItems.length === 0) {
            alert('No records available to export.');
            return;
        }

        const config = COLUMN_CONFIGS[type] || [];
        const activeCols = config.filter(c => selectedColumns.includes(c.key));

        if (activeCols.length === 0) {
            alert('Please select at least one column to export.');
            return;
        }

        const headers = ['S.No', ...activeCols.map(c => c.label)];
        const rows = targetItems.map((item, idx) => {
            const rowVals = activeCols.map(c => {
                const val = getCellValue(item, c.key, type);
                return `"${String(val).replace(/"/g, '""')}"`;
            });
            return [idx + 1, ...rowVals].join(',');
        });

        const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const today = getTodayDateString();
        link.href = url;
        link.setAttribute('download', `${type.toUpperCase()}_Report_${today}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExportModalOpen(false);
    };

    const handleRunExportPDF = async () => {
        const type = exportReportType;
        const targetItems = getTargetExportItems(type);
        if (targetItems.length === 0) {
            alert('No records available to export.');
            return;
        }

        const config = COLUMN_CONFIGS[type] || [];
        const activeCols = config.filter(c => selectedColumns.includes(c.key));

        if (activeCols.length === 0) {
            alert('Please select at least one column to export.');
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

            const pdfContainer = document.createElement('div');
            pdfContainer.style.position = 'absolute';
            pdfContainer.style.left = '-9999px';
            pdfContainer.style.top = '-9999px';
            pdfContainer.style.width = '842px';
            pdfContainer.style.backgroundColor = '#ffffff';
            pdfContainer.style.padding = '24px';
            pdfContainer.style.fontFamily = 'Arial, sans-serif';
            pdfContainer.style.color = '#1f2937';

            const tableHeadersHtml = activeCols.map(c => `<th style="padding: 8px 6px; text-align: left; font-size: 9px; font-weight: bold; text-transform: uppercase; color: #374151; border-bottom: 2px solid #d1d5db;">${c.label}</th>`).join('');

            const tableRowsHtml = targetItems.map((item, idx) => {
                const cellsHtml = activeCols.map(c => {
                    const val = getCellValue(item, c.key, type);
                    return `<td style="padding: 6px; font-size: 9px; color: #111827; border-bottom: 1px solid #e5e7eb;">${val}</td>`;
                }).join('');
                return `<tr><td style="padding: 6px; font-size: 9px; font-weight: bold; color: #4b5563; border-bottom: 1px solid #e5e7eb;">${idx + 1}</td>${cellsHtml}</tr>`;
            }).join('');

            const titleText = type === 'invoices' ? 'OUR SALES TAX INVOICES REPORT' :
                              type === 'received-invoices' ? 'RECEIVED INVOICES (PURCHASES) REPORT' :
                              type === 'quotations' ? 'QUOTATIONS REPORT' : 'ORDERS REPORT';

            pdfContainer.innerHTML = `
                <div style="border-bottom: 2px solid #0923b5; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #0923b5;">${officeName}</h1>
                        ${officeAddress ? `<p style="margin: 3px 0 0; font-size: 10px; color: #4b5563;">${officeAddress}</p>` : ''}
                        ${officeGstin ? `<p style="margin: 2px 0 0; font-size: 10px; color: #4b5563;">GSTIN: <strong>${officeGstin}</strong> | Mobile: ${officeMobile}</p>` : ''}
                    </div>
                    <div style="text-align: right;">
                        <h2 style="margin: 0; font-size: 16px; font-weight: 800; color: #111827;">${titleText}</h2>
                        <p style="margin: 3px 0 0; font-size: 10px; color: #6b7280;">Date Generated: <strong>${formatDate(new Date())}</strong></p>
                        <p style="margin: 2px 0 0; font-size: 10px; color: #6b7280;">Total Records: <strong>${targetItems.length}</strong></p>
                    </div>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
                    <thead>
                        <tr style="background-color: #f3f4f6;">
                            <th style="padding: 8px 6px; text-align: left; font-size: 9px; font-weight: bold; color: #374151; border-bottom: 2px solid #d1d5db;">#</th>
                            ${tableHeadersHtml}
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRowsHtml}
                    </tbody>
                </table>
            `;

            document.body.appendChild(pdfContainer);

            const canvas = await html2canvas(pdfContainer, { scale: 2, useCORS: true, logging: false });
            document.body.removeChild(pdfContainer);

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const imgWidth = 297;
            const pageHeight = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            const today = getTodayDateString();
            pdf.save(`${type.toUpperCase()}_Report_${today}.pdf`);
            setIsExportModalOpen(false);
        } catch (err) {
            console.error('PDF export error:', err);
            alert('Failed to generate PDF report.');
        } finally {
            setGeneratingPdf(false);
        }
    };

    // Sync tab selection from route state redirects
    useEffect(() => {
        if (location.state && location.state.activeTab) {
            setActiveTab(location.state.activeTab);
        }
    }, [location]);

    const fetchInvoices = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/invoices`, {
                headers: { 'x-user-id': user ? user.id : '' }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                const sorted = [...data].sort((a, b) => {
                    const numA = parseInt(String(a.invoice_number || '').replace(/\D/g, ''), 10) || 0;
                    const numB = parseInt(String(b.invoice_number || '').replace(/\D/g, ''), 10) || 0;
                    if (numA !== numB) return numB - numA;
                    return (b.id || 0) - (a.id || 0);
                });
                setInvoices(sorted);
            }
        } catch (err) {
            console.error('Error fetching invoices:', err);
        }
    };

    const fetchQuotations = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/quotations`, {
                headers: { 'x-user-id': user ? user.id : '' }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                const sorted = [...data].sort((a, b) => {
                    const numA = parseInt(String(a.quotation_number || '').replace(/\D/g, ''), 10) || 0;
                    const numB = parseInt(String(b.quotation_number || '').replace(/\D/g, ''), 10) || 0;
                    if (numA !== numB) return numB - numA;
                    return (b.id || 0) - (a.id || 0);
                });
                setQuotations(sorted);
            }
        } catch (err) {
            console.error('Error fetching quotations:', err);
        }
    };

    const fetchOrders = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/orders`, {
                headers: { 'x-user-id': user ? user.id : '' }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                const sorted = [...data].sort((a, b) => {
                    const numA = parseInt(String(a.order_number || '').replace(/\D/g, ''), 10) || 0;
                    const numB = parseInt(String(b.order_number || '').replace(/\D/g, ''), 10) || 0;
                    if (numA !== numB) return numB - numA;
                    return (b.id || 0) - (a.id || 0);
                });
                setOrders(sorted);
            }
        } catch (err) {
            console.error('Error fetching orders:', err);
        }
    };

    const fetchReceivedInvoices = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/received-invoices`, {
                headers: { 'x-user-id': user ? user.id : '' }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setReceivedInvoices(data);
            }
        } catch (err) {
            console.error('Error fetching received invoices:', err);
        }
    };

    const loadData = async () => {
        setLoading(true);
        await Promise.all([fetchInvoices(), fetchQuotations(), fetchOrders(), fetchReceivedInvoices()]);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDeleteInvoice = async (id, number) => {
        if (!window.confirm(`Are you sure you want to permanently delete invoice #${number}?`)) {
            return;
        }
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/invoices/${id}`, { 
                method: 'DELETE',
                headers: { 'x-user-id': user ? user.id : '' }
            });
            if (res.ok) {
                fetchInvoices();
            } else {
                alert('Failed to delete invoice');
            }
        } catch (err) {
            console.error(err);
            alert('Error deleting invoice');
        }
    };

    const handleCancelInvoice = async (id, number) => {
        if (!window.confirm(`Are you sure you want to cancel invoice #${number}?`)) {
            return;
        }
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/invoices/${id}/cancel`, { 
                method: 'PATCH',
                headers: { 'x-user-id': user ? user.id : '' }
            });
            if (res.ok) {
                fetchInvoices();
            } else {
                alert('Failed to cancel invoice');
            }
        } catch (err) {
            console.error(err);
            alert('Error cancelling invoice');
        }
    };

    const handleDeleteQuotation = async (id, number) => {
        if (!window.confirm(`Are you sure you want to permanently delete quotation ${number}?`)) {
            return;
        }
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/quotations/${id}`, { 
                method: 'DELETE',
                headers: { 'x-user-id': user ? user.id : '' }
            });
            if (res.ok) {
                fetchQuotations();
            } else {
                alert('Failed to delete quotation');
            }
        } catch (err) {
            console.error(err);
            alert('Error deleting quotation');
        }
    };

    const handleCancelQuotation = async (id, number) => {
        if (!window.confirm(`Are you sure you want to cancel quotation #${number}?`)) {
            return;
        }
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/quotations/${id}/cancel`, { 
                method: 'PATCH',
                headers: { 'x-user-id': user ? user.id : '' }
            });
            if (res.ok) {
                fetchQuotations();
            } else {
                alert('Failed to cancel quotation');
            }
        } catch (err) {
            console.error(err);
            alert('Error cancelling quotation');
        }
    };

    const handleDeleteOrder = async (id, number) => {
        if (!window.confirm(`Are you sure you want to permanently delete order ${number}?`)) {
            return;
        }
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/${id}`, { 
                method: 'DELETE',
                headers: { 'x-user-id': user ? user.id : '' }
            });
            if (res.ok) {
                fetchOrders();
            } else {
                alert('Failed to delete order');
            }
        } catch (err) {
            console.error(err);
            alert('Error deleting order');
        }
    };

    const handleCancelOrder = async (id, number) => {
        if (!window.confirm(`Are you sure you want to cancel order #${number}?`)) {
            return;
        }
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/${id}/cancel`, { 
                method: 'PATCH',
                headers: { 'x-user-id': user ? user.id : '' }
            });
            if (res.ok) {
                fetchOrders();
            } else {
                alert('Failed to cancel order');
            }
        } catch (err) {
            console.error(err);
            alert('Error cancelling order');
        }
    };

    // Calculate Invoices Stats
    const activeInvoices = invoices.filter(inv => inv.status !== 'Cancelled');
    const totalInvoiceRevenue = activeInvoices.reduce((acc, inv) => acc + parseFloat(inv.total_amount || 0), 0);

    // Calculate Quotations Stats
    const activeQuotations = quotations.filter(q => q.status !== 'Cancelled');
    const totalQuotationValue = activeQuotations.reduce((acc, q) => acc + parseFloat(q.total_amount || 0), 0);
    const avgQuotationValue = activeQuotations.length > 0 ? (totalQuotationValue / activeQuotations.length) : 0;

    // Compute Product statistics from active quotations
    let quoteDailyCalendarQty = 0;
    let quoteDailyCalendarValue = 0;
    let quoteMonthlyCalendarQty = 0;
    let quoteMonthlyCalendarValue = 0;
    let quoteDairyQty = 0;
    let quoteDairyValue = 0;

    activeQuotations.forEach(quote => {
        const quoteItems = quote.items || [];
        quoteItems.forEach(item => {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.price_per_unit) || 0;
            const itemAmt = qty * price;
            const itemType = item.item_type || '';

            if (itemType === 'Daily Calendar') {
                quoteDailyCalendarQty += qty;
                quoteDailyCalendarValue += itemAmt;
            } else if (itemType === 'Monthly Calendar') {
                quoteMonthlyCalendarQty += qty;
                quoteMonthlyCalendarValue += itemAmt;
            } else if (itemType === 'Dairy') {
                quoteDairyQty += qty;
                quoteDairyValue += itemAmt;
            }
        });
    });

    // Calculate Orders Stats
    const activeOrders = orders.filter(o => o.status !== 'Cancelled');
    const totalOrderValue = activeOrders.reduce((acc, o) => acc + parseFloat(o.total_amount || 0), 0);

    // Compute Product and Slip statistics from active orders
    let dailyCalendarQty = 0;
    let dailyCalendarValue = 0;
    let dailyCalendarDeliveredQty = 0;

    let monthlyCalendarQty = 0;
    let monthlyCalendarValue = 0;
    let monthlyCalendarDeliveredQty = 0;

    let dairyQty = 0;
    let dairyValue = 0;
    let dairyDeliveredQty = 0;

    const slipsMap = {};

    activeOrders.forEach(order => {
        const orderItems = order.items || [];
        const isDelivered = order.delivery_status === 'Delivered';

        orderItems.forEach(item => {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.price_per_unit) || 0;
            const itemAmt = qty * price;
            const itemType = item.item_type || '';

            if (itemType === 'Daily Calendar') {
                dailyCalendarQty += qty;
                dailyCalendarValue += itemAmt;
                if (isDelivered) {
                    dailyCalendarDeliveredQty += qty;
                }
            } else if (itemType === 'Monthly Calendar') {
                monthlyCalendarQty += qty;
                monthlyCalendarValue += itemAmt;
                if (isDelivered) {
                    monthlyCalendarDeliveredQty += qty;
                }
            } else if (itemType === 'Dairy') {
                dairyQty += qty;
                dairyValue += itemAmt;
                if (isDelivered) {
                    dairyDeliveredQty += qty;
                }
            }

            if (item.slip_number && item.slip_number.trim() !== '') {
                const slip = item.slip_number.trim();
                if (!slipsMap[slip]) {
                    slipsMap[slip] = {
                        qty: 0,
                        deliveredQty: 0,
                        ordersCount: 0,
                        orderIds: new Set(),
                        customers: new Set()
                    };
                }
                slipsMap[slip].qty += qty;
                if (isDelivered) {
                    slipsMap[slip].deliveredQty += qty;
                }
                if (!slipsMap[slip].orderIds.has(order.id)) {
                    slipsMap[slip].orderIds.add(order.id);
                    slipsMap[slip].ordersCount += 1;
                }
                if (order.customer_name) {
                    slipsMap[slip].customers.add(order.customer_name);
                }
            }
        });
    });

    const slipsList = Object.keys(slipsMap).map(slip => ({
        slipNumber: slip,
        qty: slipsMap[slip].qty,
        deliveredQty: slipsMap[slip].deliveredQty,
        ordersCount: slipsMap[slip].ordersCount,
        customers: Array.from(slipsMap[slip].customers).join(', ')
    })).sort((a, b) => b.qty - a.qty);

    // --- GST SETTLEMENT CALCULATIONS ---
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

    // Cumulative GST Settlement Helper (carries forward unused prior month purchase ITC)
    const getCumulativeGstSettlement = (targetYear, targetMonthCode, invoicesList, receivedList) => {
        if (!targetYear || targetYear === 'ALL' || !targetMonthCode || targetMonthCode === 'ALL') {
            const sales = invoicesList.filter(inv => {
                if (!inv.invoice_date) return false;
                const cleanDate = toYYYYMMDD(inv.invoice_date);
                if (!cleanDate) return false;
                const [y] = cleanDate.split('-');
                return targetYear === 'ALL' || y === targetYear;
            });

            const purchases = receivedList.filter(inv => {
                if (!inv.invoice_date) return false;
                const cleanDate = toYYYYMMDD(inv.invoice_date);
                if (!cleanDate) return false;
                const [y] = cleanDate.split('-');
                return targetYear === 'ALL' || y === targetYear;
            });

            const salesGst = sales.reduce((sum, inv) => sum + parseFloat(inv.cgst_amount || 0) + parseFloat(inv.sgst_amount || 0) + parseFloat(inv.igst_amount || 0), 0);
            const purchasesGst = purchases.reduce((sum, inv) => sum + (inv.has_gst ? parseFloat(inv.gst_amount || 0) : 0), 0);
            const net = salesGst - purchasesGst;

            return {
                salesInvoices: sales,
                purchaseInvoices: purchases,
                salesGst,
                purchasesGst,
                priorUnusedItc: 0,
                totalAvailableItc: purchasesGst,
                netGstPayable: net
            };
        }

        const targetYm = `${targetYear}-${targetMonthCode}`;

        // 1. Current Month Sales
        const salesInCurrentMonth = invoicesList.filter(inv => {
            if (!inv.invoice_date) return false;
            const cleanDate = toYYYYMMDD(inv.invoice_date);
            if (!cleanDate) return false;
            const [y, m] = cleanDate.split('-');
            return y === targetYear && m === targetMonthCode;
        });

        const salesGstCurrentMonth = salesInCurrentMonth.reduce((sum, inv) => sum + parseFloat(inv.cgst_amount || 0) + parseFloat(inv.sgst_amount || 0) + parseFloat(inv.igst_amount || 0), 0);

        // 2. Current Month Purchases
        const purchasesInCurrentMonth = receivedList.filter(inv => {
            if (!inv.invoice_date) return false;
            const cleanDate = toYYYYMMDD(inv.invoice_date);
            if (!cleanDate) return false;
            const [y, m] = cleanDate.split('-');
            return y === targetYear && m === targetMonthCode;
        });

        const purchaseGstCurrentMonth = purchasesInCurrentMonth.reduce((sum, inv) => {
            if (!inv.has_gst) return sum;
            return sum + parseFloat(inv.gst_amount || 0);
        }, 0);

        // 3. Prior Purchases (all received bills dated BEFORE targetYm)
        const priorPurchases = receivedList.filter(inv => {
            if (!inv.invoice_date) return false;
            const cleanDate = toYYYYMMDD(inv.invoice_date);
            if (!cleanDate) return false;
            const [y, m] = cleanDate.split('-');
            const ym = `${y}-${m}`;
            return ym < targetYm;
        });

        const priorPurchasesGst = priorPurchases.reduce((sum, inv) => {
            if (!inv.has_gst) return sum;
            return sum + parseFloat(inv.gst_amount || 0);
        }, 0);

        // 4. Prior Sales (all invoices dated BEFORE targetYm)
        const priorSales = invoicesList.filter(inv => {
            if (!inv.invoice_date) return false;
            const cleanDate = toYYYYMMDD(inv.invoice_date);
            if (!cleanDate) return false;
            const [y, m] = cleanDate.split('-');
            const ym = `${y}-${m}`;
            return ym < targetYm;
        });

        const priorSalesGst = priorSales.reduce((sum, inv) => sum + parseFloat(inv.cgst_amount || 0) + parseFloat(inv.sgst_amount || 0) + parseFloat(inv.igst_amount || 0), 0);

        // 5. Prior Unused ITC carried forward
        const priorUnusedItc = Math.max(0, priorPurchasesGst - priorSalesGst);

        // 6. Total Available ITC for Target Month = Current Month Purchase ITC + Prior Unused ITC
        const totalAvailableItc = purchaseGstCurrentMonth + priorUnusedItc;

        // 7. Net GST Payable for Target Month
        const netGstPayable = salesGstCurrentMonth - totalAvailableItc;

        return {
            salesInvoices: salesInCurrentMonth,
            purchaseInvoices: purchasesInCurrentMonth,
            priorPurchasesCount: priorPurchases.length,
            salesGst: salesGstCurrentMonth,
            purchasesGst: purchaseGstCurrentMonth,
            priorUnusedItc,
            totalAvailableItc,
            netGstPayable
        };
    };

    // Previous Month GST Settlement (with cumulative carry-forward from July, August, etc.)
    const nowObj = new Date();
    const prevMonthDate = new Date(nowObj.getFullYear(), nowObj.getMonth() - 1, 1);
    const prevMonthYearStr = String(prevMonthDate.getFullYear());
    const prevMonthCodeStr = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
    const prevMonthObj = monthsList.find(m => m.code === prevMonthCodeStr) || { name: '' };
    const prevMonthName = prevMonthObj.name;

    const prevMonthSettlement = getCumulativeGstSettlement(prevMonthYearStr, prevMonthCodeStr, activeInvoices, receivedInvoices);
    const prevMonthSalesInvoices = prevMonthSettlement.salesInvoices;
    const prevMonthPurchaseInvoices = prevMonthSettlement.purchaseInvoices;
    const prevMonthSalesGstCollected = prevMonthSettlement.salesGst;
    const prevMonthPurchasesGstPaid = prevMonthSettlement.purchasesGst;
    const prevMonthPriorUnusedItc = prevMonthSettlement.priorUnusedItc;
    const prevMonthTotalAvailableItc = prevMonthSettlement.totalAvailableItc;
    const prevMonthNetGstPayable = prevMonthSettlement.netGstPayable;

    // Build years dropdown list from data
    const availableYearsSet = new Set([String(currentYear), '2025', '2024']);
    invoices.forEach(inv => {
        if (inv.invoice_date) {
            const cleanDate = toYYYYMMDD(inv.invoice_date);
            if (cleanDate) availableYearsSet.add(cleanDate.split('-')[0]);
        }
    });
    receivedInvoices.forEach(inv => {
        if (inv.invoice_date) {
            const cleanDate = toYYYYMMDD(inv.invoice_date);
            if (cleanDate) availableYearsSet.add(cleanDate.split('-')[0]);
        }
    });
    const availableYears = Array.from(availableYearsSet).sort((a, b) => b - a);

    // Selected Month & Year Cumulative Settlement
    const filteredSettlement = getCumulativeGstSettlement(selectedYear, selectedMonth, activeInvoices, receivedInvoices);
    const filteredSalesInvoices = filteredSettlement.salesInvoices;
    const filteredPurchaseInvoices = filteredSettlement.purchaseInvoices;
    const salesGstCollected = filteredSettlement.salesGst;
    const purchasesGstPaid = filteredSettlement.purchasesGst;
    const priorUnusedItc = filteredSettlement.priorUnusedItc;
    const totalAvailableItc = filteredSettlement.totalAvailableItc;
    const netGstPayable = filteredSettlement.netGstPayable;

    const salesCgstCollected = filteredSalesInvoices.reduce((sum, inv) => sum + parseFloat(inv.cgst_amount || 0), 0);
    const salesSgstCollected = filteredSalesInvoices.reduce((sum, inv) => sum + parseFloat(inv.sgst_amount || 0), 0);
    const salesIgstCollected = filteredSalesInvoices.reduce((sum, inv) => sum + parseFloat(inv.igst_amount || 0), 0);

    const totalCgstCollected = activeInvoices.reduce((sum, inv) => sum + parseFloat(inv.cgst_amount || 0), 0);
    const totalSgstCollected = activeInvoices.reduce((sum, inv) => sum + parseFloat(inv.sgst_amount || 0), 0);
    const totalIgstCollected = activeInvoices.reduce((sum, inv) => sum + parseFloat(inv.igst_amount || 0), 0);
    const totalGstCollected = totalCgstCollected + totalSgstCollected + totalIgstCollected;

    const filteredSalesTotal = filteredSalesInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
    const filteredPurchasesTotal = filteredPurchaseInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);

    // Monthly Settlement Breakdown Report for Selected Year (including cumulative carry-forward ITC)
    const monthlyGstReport = monthsList.map(mObj => {
        const mCode = mObj.code;
        const targetYear = selectedYear === 'ALL' ? String(currentYear) : selectedYear;
        const mSettlement = getCumulativeGstSettlement(targetYear, mCode, activeInvoices, receivedInvoices);

        return {
            monthName: mObj.name,
            monthCode: mCode,
            salesCount: mSettlement.salesInvoices.length,
            salesGst: mSettlement.salesGst,
            purchasesCount: mSettlement.purchaseInvoices.length,
            purchasesGst: mSettlement.purchasesGst,
            priorUnusedItc: mSettlement.priorUnusedItc,
            totalAvailableItc: mSettlement.totalAvailableItc,
            netGst: mSettlement.netGstPayable
        };
    });

    return (
        <div className="space-y-6">
            {/* Upper Heading Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex space-x-2 border-b border-gray-250 w-full sm:w-auto">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`pb-3 px-6 text-sm font-bold border-b-2 transition-all ${
                            activeTab === 'overview'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-505 hover:text-gray-700'
                        }`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('invoices')}
                        className={`pb-3 px-6 text-sm font-bold border-b-2 transition-all ${
                            activeTab === 'invoices'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-505 hover:text-gray-700'
                        }`}
                    >
                        Tax Invoices
                    </button>
                    <button
                        onClick={() => setActiveTab('quotations')}
                        className={`pb-3 px-6 text-sm font-bold border-b-2 transition-all ${
                            activeTab === 'quotations'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-505 hover:text-gray-700'
                        }`}
                    >
                        Quotations
                    </button>
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`pb-3 px-6 text-sm font-bold border-b-2 transition-all ${
                            activeTab === 'orders'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-505 hover:text-gray-700'
                        }`}
                    >
                        Order Forms
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                    <button
                        onClick={() => openExportModal(activeTab === 'overview' ? 'invoices' : activeTab)}
                        className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-4 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-all font-bold text-xs shadow-xs"
                        title="Custom Column Selector & Export PDF / Excel"
                    >
                        <SlidersHorizontal size={16} />
                        <span>Export PDF / Excel</span>
                    </button>
                    {activeTab === 'invoices' && (
                        <Link to="/create" className="bg-primary hover:bg-secondary text-white px-5 py-2.5 rounded-xl flex justify-center items-center space-x-2 transition-all font-bold shadow-md text-xs">
                            <Plus size={18} />
                            <span>Create New Invoice</span>
                        </Link>
                    )}
                    {activeTab === 'quotations' && (
                        <Link to="/create-quotation" className="bg-primary hover:bg-secondary text-white px-5 py-2.5 rounded-xl flex justify-center items-center space-x-2 transition-all font-bold shadow-md text-xs">
                            <Plus size={18} />
                            <span>Create New Quotation</span>
                        </Link>
                    )}
                    {activeTab === 'orders' && (
                        <Link to="/create-order" className="bg-primary hover:bg-secondary text-white px-5 py-2.5 rounded-xl flex justify-center items-center space-x-2 transition-all font-bold shadow-md text-xs">
                            <Plus size={18} />
                            <span>Create New Order</span>
                        </Link>
                    )}
                </div>
            </div>

            {/* Overview Stats */}
            {activeTab === 'overview' && (
                <div className="space-y-8 animate-fadeIn">
                    {/* PREVIOUS MONTH GST PAYABLE HIGHLIGHT BANNER */}
                    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-500/20 relative overflow-hidden">
                        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                            <div className="space-y-1.5 max-w-xl">
                                <div className="flex items-center space-x-2">
                                    <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full border border-indigo-500/30 uppercase tracking-wider flex items-center gap-1.5">
                                        <Calendar size={13} />
                                        Previous Month GST Settlement ({prevMonthName} {prevMonthYearStr})
                                    </span>
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white pt-1">
                                    {prevMonthNetGstPayable > 0 ? (
                                        <span>Net GST We Need To Pay: <span className="text-amber-400">₹{prevMonthNetGstPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                                    ) : (
                                        <span>Net GST We Need To Pay: <span className="text-emerald-400">₹0.00 (NO TAX DUE)</span></span>
                                    )}
                                </h2>
                                <p className="text-xs text-indigo-200/80 leading-relaxed">
                                    Sales Output GST collected minus Total Available ITC (including unclaimed July & August purchase credit) for <strong>{prevMonthName} {prevMonthYearStr}</strong>.
                                    {prevMonthNetGstPayable < 0 && ` Excess ITC of ₹${Math.abs(prevMonthNetGstPayable).toFixed(2)} carries forward.`}
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                                <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 text-center flex-1 lg:flex-none">
                                    <div className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider">Sales GST ({prevMonthName})</div>
                                    <div className="text-base font-black text-emerald-300 mt-0.5">₹{prevMonthSalesGstCollected.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                    <div className="text-[9px] text-indigo-200/70 mt-0.5">{prevMonthSalesInvoices.length} Sales Invoices</div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 text-center flex-1 lg:flex-none">
                                    <div className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider">Total Available ITC</div>
                                    <div className="text-base font-black text-purple-300 mt-0.5">₹{prevMonthTotalAvailableItc.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                    <div className="text-[9px] text-indigo-200/70 mt-0.5">
                                        {prevMonthPriorUnusedItc > 0 ? `Incl. ₹${prevMonthPriorUnusedItc.toFixed(0)} Prior ITC` : `${prevMonthPurchaseInvoices.length} Bills`}
                                    </div>
                                </div>
                                <div className={`px-5 py-3 rounded-xl border text-center flex-1 lg:flex-none font-extrabold shadow-md ${
                                    prevMonthNetGstPayable > 0 
                                        ? 'bg-amber-500/20 border-amber-400/40 text-amber-300' 
                                        : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                                }`}>
                                    <div className="text-[10px] opacity-80 uppercase tracking-wider">Net GST Liability</div>
                                    <div className="text-lg font-black mt-0.5">
                                        {prevMonthNetGstPayable > 0 ? `₹${prevMonthNetGstPayable.toFixed(2)}` : '₹0.00'}
                                    </div>
                                    <div className="text-[9px] opacity-80">
                                        {prevMonthNetGstPayable > 0 ? 'Payable to Govt' : 'No Tax Due'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Key Metrics Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 rounded-2xl text-white shadow-lg transform hover:-translate-y-1 transition-all duration-300">
                            <div className="flex justify-between items-center">
                                <span className="text-emerald-100 text-[11px] font-bold uppercase tracking-wider">Invoice Revenue</span>
                                <TrendingUp size={22} className="text-emerald-100" />
                            </div>
                            <div className="text-xl lg:text-2xl font-black mt-2">
                                ₹{totalInvoiceRevenue.toFixed(2)}
                            </div>
                            <div className="text-[11px] text-emerald-100/80 mt-1">Active invoices total</div>
                        </div>

                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-2xl text-white shadow-lg transform hover:-translate-y-1 transition-all duration-300">
                            <div className="flex justify-between items-center">
                                <span className="text-blue-100 text-[11px] font-bold uppercase tracking-wider">Total Sales GST</span>
                                <Tag size={22} className="text-blue-100" />
                            </div>
                            <div className="text-xl lg:text-2xl font-black mt-1">
                                ₹{totalGstCollected.toFixed(2)}
                            </div>
                            <div className="flex items-center space-x-1 text-[9px] text-blue-100 font-bold mt-2 flex-wrap gap-y-1">
                                <span className="bg-white/20 px-1.5 py-0.5 rounded">CGST: ₹{totalCgstCollected.toFixed(0)}</span>
                                <span className="bg-white/20 px-1.5 py-0.5 rounded">SGST: ₹{totalSgstCollected.toFixed(0)}</span>
                                <span className="bg-white/20 px-1.5 py-0.5 rounded">IGST: ₹{totalIgstCollected.toFixed(0)}</span>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-5 rounded-2xl text-white shadow-lg transform hover:-translate-y-1 transition-all duration-300">
                            <div className="flex justify-between items-center">
                                <span className="text-amber-100 text-[11px] font-bold uppercase tracking-wider">Order Form Value</span>
                                <CreditCard size={22} className="text-amber-100" />
                            </div>
                            <div className="text-xl lg:text-2xl font-black mt-2">
                                ₹{totalOrderValue.toFixed(2)}
                            </div>
                            <div className="text-[11px] text-amber-100/80 mt-1">Active order forms</div>
                        </div>

                        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-5 rounded-2xl text-white shadow-lg transform hover:-translate-y-1 transition-all duration-300">
                            <div className="flex justify-between items-center">
                                <span className="text-cyan-100 text-[11px] font-bold uppercase tracking-wider">Quotation Value</span>
                                <CreditCard size={22} className="text-cyan-100" />
                            </div>
                            <div className="text-xl lg:text-2xl font-black mt-2">
                                ₹{totalQuotationValue.toFixed(2)}
                            </div>
                            <div className="text-[11px] text-cyan-100/80 mt-1">Active quotations</div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-600 to-indigo-800 p-5 rounded-2xl text-white shadow-lg transform hover:-translate-y-1 transition-all duration-300">
                            <div className="flex justify-between items-center">
                                <span className="text-purple-100 text-[11px] font-bold uppercase tracking-wider">GST Paid (Purchases)</span>
                                <Tag size={22} className="text-purple-100" />
                            </div>
                            <div className="text-xl lg:text-2xl font-black mt-2">
                                ₹{purchasesGstPaid.toFixed(2)}
                            </div>
                            <div className="text-[11px] text-purple-100/80 mt-1">Vendor bills ITC</div>
                        </div>
                    </div>

                    {/* GST Settlement & ITC Calculation Widget */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                                    <Tag className="text-primary" size={22} />
                                    <span>GST Settlement & ITC Calculator</span>
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Compare GST Collected on Sales (Output Tax) vs Total Available Purchase ITC (including prior unclaimed credit).
                                </p>
                            </div>

                            {/* Year & Month Filters + Quick 'Previous Month' Button */}
                            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                                <button
                                    onClick={() => {
                                        setSelectedYear(prevMonthYearStr);
                                        setSelectedMonth(prevMonthCodeStr);
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border ${
                                        selectedYear === prevMonthYearStr && selectedMonth === prevMonthCodeStr
                                            ? 'bg-primary text-white border-primary shadow-xs'
                                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                    }`}
                                    title="Show GST calculation for previous month"
                                >
                                    <Calendar size={13} />
                                    <span>Previous Month ({prevMonthName})</span>
                                </button>

                                <div className="flex items-center space-x-1.5 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                                    <Filter size={14} className="text-gray-400 ml-1" />
                                    <select
                                        className="bg-transparent text-xs font-bold text-gray-700 outline-none cursor-pointer pr-1"
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                    >
                                        <option value="ALL">All Years</option>
                                        {availableYears.map(y => (
                                            <option key={y} value={y}>Year {y}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center space-x-1.5 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                                    <select
                                        className="bg-transparent text-xs font-bold text-gray-700 outline-none cursor-pointer pr-1"
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                    >
                                        <option value="ALL">All Months</option>
                                        {monthsList.map(m => (
                                            <option key={m.code} value={m.code}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* GST Cards Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Sales Output GST */}
                            <div className="bg-blue-50/70 p-5 rounded-2xl border border-blue-100 relative flex flex-col justify-between space-y-3">
                                <div>
                                    <div className="flex justify-between items-center text-blue-900">
                                        <span className="text-xs font-bold uppercase tracking-wider">Total Sales GST Collected</span>
                                        <ArrowUpRight size={20} className="text-blue-600" />
                                    </div>
                                    <div className="text-2xl font-black text-blue-900 mt-2">
                                        ₹{salesGstCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </div>
                                    <div className="text-[11px] text-blue-700 font-semibold mt-0.5">
                                        Total Output GST (CGST + SGST + IGST)
                                    </div>
                                </div>

                                {/* CGST, SGST & IGST breakdown badges */}
                                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-blue-200/70 text-center">
                                    <div className="bg-white/90 p-1.5 rounded-xl border border-blue-100 shadow-2xs">
                                        <span className="text-[9px] text-blue-600 font-bold uppercase block">CGST</span>
                                        <span className="font-extrabold text-blue-900 text-xs">₹{salesCgstCollected.toFixed(2)}</span>
                                    </div>
                                    <div className="bg-white/90 p-1.5 rounded-xl border border-blue-100 shadow-2xs">
                                        <span className="text-[9px] text-blue-600 font-bold uppercase block">SGST</span>
                                        <span className="font-extrabold text-blue-900 text-xs">₹{salesSgstCollected.toFixed(2)}</span>
                                    </div>
                                    <div className="bg-white/90 p-1.5 rounded-xl border border-blue-100 shadow-2xs">
                                        <span className="text-[9px] text-indigo-600 font-bold uppercase block">IGST</span>
                                        <span className="font-extrabold text-indigo-900 text-xs">₹{salesIgstCollected.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="text-[11px] text-blue-700 font-medium">
                                    From {filteredSalesInvoices.length} sales invoices (Total: ₹{filteredSalesTotal.toLocaleString('en-IN')})
                                </div>
                            </div>

                            {/* Purchases Input GST (ITC) with Carried Forward Breakdown */}
                            <div className="bg-purple-50/60 p-5 rounded-2xl border border-purple-100 relative flex flex-col justify-between space-y-3">
                                <div>
                                    <div className="flex justify-between items-center text-purple-900">
                                        <span className="text-xs font-bold uppercase tracking-wider">Total Available ITC</span>
                                        <ArrowDownRight size={20} className="text-purple-600" />
                                    </div>
                                    <div className="text-2xl font-black text-purple-900 mt-2">
                                        ₹{totalAvailableItc.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </div>
                                    <div className="text-[11px] text-purple-700 font-semibold mt-0.5">
                                        Current Month ITC + Prior Unclaimed Carry-Forward
                                    </div>
                                </div>

                                <div className="space-y-1 pt-2 border-t border-purple-200/70 text-xs">
                                    <div className="flex justify-between items-center text-purple-900 font-semibold">
                                        <span>Current Month Bills:</span>
                                        <span className="font-bold">₹{purchasesGstPaid.toFixed(2)}</span>
                                    </div>
                                    {priorUnusedItc > 0 && (
                                        <div className="flex justify-between items-center text-indigo-900 font-bold bg-purple-100/80 px-2 py-1 rounded-lg">
                                            <span>Prior Months ITC (July/Aug):</span>
                                            <span className="text-purple-700">+₹{priorUnusedItc.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="text-[11px] text-purple-700 font-medium">
                                    From {filteredPurchaseInvoices.length} received bills (Total Value: ₹{filteredPurchasesTotal.toLocaleString('en-IN')})
                                </div>
                            </div>

                            {/* Net Settlement Result */}
                            <div className={`p-5 rounded-2xl border relative flex flex-col justify-between space-y-3 ${
                                netGstPayable > 0 
                                    ? 'bg-amber-50/80 border-amber-200 text-amber-900' 
                                    : netGstPayable < 0 
                                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
                                    : 'bg-gray-50 border-gray-200 text-gray-800'
                            }`}>
                                <div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold uppercase tracking-wider">
                                            {netGstPayable > 0 ? 'Net GST Payable to Govt' : 'Net GST Payable: ₹0.00'}
                                        </span>
                                        {netGstPayable > 0 ? (
                                            <AlertCircle size={20} className="text-amber-600" />
                                        ) : (
                                            <CheckCircle size={20} className="text-emerald-600" />
                                        )}
                                    </div>
                                    <div className={`text-2xl font-black mt-2 ${
                                        netGstPayable > 0 ? 'text-amber-900' : netGstPayable < 0 ? 'text-emerald-900' : 'text-gray-800'
                                    }`}>
                                        {netGstPayable > 0 
                                            ? `₹${netGstPayable.toFixed(2)}` 
                                            : `₹0.00 (NO TAX DUE)`}
                                    </div>
                                    <div className="text-[11px] font-semibold mt-1 leading-snug">
                                        {netGstPayable > 0 
                                            ? 'Output GST exceeds available ITC. Amount to be paid to Government.' 
                                            : netGstPayable < 0 
                                            ? `Excess Input Credit (ITC) of ₹${Math.abs(netGstPayable).toFixed(2)} carries forward to next month.` 
                                            : 'GST liability is fully set-off.'}
                                    </div>
                                </div>

                                {priorUnusedItc > 0 && (
                                    <div className="text-[10px] bg-white/80 p-2 rounded-xl border border-emerald-200 font-bold text-emerald-800">
                                        ✓ Includes ₹{priorUnusedItc.toFixed(2)} unclaimed ITC brought forward from prior months.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Breakdown and Slips Sections */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* Column 1: Order Category Breakdown */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Order Breakdown</h3>
                            
                            {/* Daily Calendars */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                        <Calendar size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-gray-800">Daily Calendars</div>
                                        <div className="text-2xl font-black text-primary mt-0.5">{dailyCalendarQty.toLocaleString()} units</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-gray-400">Value</div>
                                        <div className="text-lg font-extrabold text-gray-805 mt-0.5">₹{dailyCalendarValue.toFixed(2)}</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50 text-xs">
                                    <div className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl font-semibold">
                                        <span className="block text-[10px] text-emerald-500 uppercase font-bold">Delivered</span>
                                        {dailyCalendarDeliveredQty.toLocaleString()} units
                                    </div>
                                    <div className="bg-amber-50 text-amber-700 px-3 py-2 rounded-xl font-semibold">
                                        <span className="block text-[10px] text-amber-500 uppercase font-bold">Pending</span>
                                        {(dailyCalendarQty - dailyCalendarDeliveredQty).toLocaleString()} units
                                    </div>
                                </div>
                            </div>

                            {/* Monthly Calendars */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                        <Calendar size={24} className="rotate-90" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-gray-800">Monthly Calendars</div>
                                        <div className="text-2xl font-black text-primary mt-0.5">{monthlyCalendarQty.toLocaleString()} units</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-gray-400">Value</div>
                                        <div className="text-lg font-extrabold text-gray-805 mt-0.5">₹{monthlyCalendarValue.toFixed(2)}</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50 text-xs">
                                    <div className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl font-semibold">
                                        <span className="block text-[10px] text-emerald-500 uppercase font-bold">Delivered</span>
                                        {monthlyCalendarDeliveredQty.toLocaleString()} units
                                    </div>
                                    <div className="bg-amber-50 text-amber-700 px-3 py-2 rounded-xl font-semibold">
                                        <span className="block text-[10px] text-amber-500 uppercase font-bold">Pending</span>
                                        {(monthlyCalendarQty - monthlyCalendarDeliveredQty).toLocaleString()} units
                                    </div>
                                </div>
                            </div>

                            {/* Dairies */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                                        <BookOpen size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-gray-800">Dairies</div>
                                        <div className="text-2xl font-black text-primary mt-0.5">{dairyQty.toLocaleString()} units</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-gray-400">Value</div>
                                        <div className="text-lg font-extrabold text-gray-805 mt-0.5">₹{dairyValue.toFixed(2)}</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50 text-xs">
                                    <div className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl font-semibold">
                                        <span className="block text-[10px] text-emerald-500 uppercase font-bold">Delivered</span>
                                        {dairyDeliveredQty.toLocaleString()} units
                                    </div>
                                    <div className="bg-amber-50 text-amber-700 px-3 py-2 rounded-xl font-semibold">
                                        <span className="block text-[10px] text-amber-500 uppercase font-bold">Pending</span>
                                        {(dairyQty - dairyDeliveredQty).toLocaleString()} units
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Column 2: Quotation Category Breakdown */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Quotation Breakdown</h3>
                            
                            {/* Daily Calendars */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 bg-pink-50 text-pink-600 rounded-xl">
                                        <Calendar size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-gray-800">Daily Calendars</div>
                                        <div className="text-2xl font-black text-rose-600 mt-0.5">{quoteDailyCalendarQty.toLocaleString()} units</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-gray-400">Value</div>
                                        <div className="text-lg font-extrabold text-gray-805 mt-0.5">₹{quoteDailyCalendarValue.toFixed(2)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Monthly Calendars */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                                        <Calendar size={24} className="rotate-90" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-gray-800">Monthly Calendars</div>
                                        <div className="text-2xl font-black text-rose-600 mt-0.5">{quoteMonthlyCalendarQty.toLocaleString()} units</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-gray-400">Value</div>
                                        <div className="text-lg font-extrabold text-gray-805 mt-0.5">₹{quoteMonthlyCalendarValue.toFixed(2)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Dairies */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 bg-fuchsia-50 text-fuchsia-600 rounded-xl">
                                        <BookOpen size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-gray-800">Dairies</div>
                                        <div className="text-2xl font-black text-rose-600 mt-0.5">{quoteDairyQty.toLocaleString()} units</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-gray-400">Value</div>
                                        <div className="text-lg font-extrabold text-gray-805 mt-0.5">₹{quoteDairyValue.toFixed(2)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Column 3: Slip demands */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Slip Requirements</h3>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                                    <table className="w-full text-left">
                                        <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
                                            <tr>
                                                <th className="p-4 font-bold text-xs text-gray-400 uppercase">Slip Number</th>
                                                <th className="p-4 font-bold text-xs text-gray-400 uppercase">Total Needed</th>
                                                <th className="p-4 font-bold text-xs text-gray-400 uppercase">Delivered / Pending</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {slipsList.length === 0 ? (
                                                <tr>
                                                    <td colSpan="3" className="p-8 text-center text-gray-400 text-sm">
                                                        No active orders with slip numbers found.
                                                    </td>
                                                </tr>
                                            ) : (
                                                slipsList.map((slip, index) => (
                                                    <tr key={index} className="hover:bg-gray-50/50 transition-colors text-sm">
                                                        <td className="p-4 font-bold text-primary">{slip.slipNumber}</td>
                                                        <td className="p-4 font-bold text-gray-800">
                                                            {slip.qty.toLocaleString()}
                                                        </td>
                                                        <td className="p-4 text-xs font-semibold space-y-1">
                                                            <div className="text-emerald-600 font-bold">Delivered: {slip.deliveredQty.toLocaleString()}</div>
                                                            <div className="text-amber-600 font-bold">Pending: {(slip.qty - slip.deliveredQty).toLocaleString()}</div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Invoices Stats */}
            {activeTab === 'invoices' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fadeIn">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Revenue (Active)</div>
                        <div className="text-3xl font-black text-gray-805 mt-2">
                            ₹{totalInvoiceRevenue.toFixed(2)}
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total GST Collected</div>
                        <div className="text-3xl font-black text-indigo-700 mt-2">
                            ₹{totalGstCollected.toFixed(2)}
                        </div>
                        <div className="flex items-center space-x-1.5 text-[10px] text-gray-500 mt-2 font-bold flex-wrap gap-y-1">
                            <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">CGST: ₹{totalCgstCollected.toFixed(2)}</span>
                            <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">SGST: ₹{totalSgstCollected.toFixed(2)}</span>
                            <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">IGST: ₹{totalIgstCollected.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Active Invoices</div>
                        <div className="text-3xl font-black text-gray-805 mt-2">{activeInvoices.length}</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Cancelled Invoices</div>
                        <div className="text-3xl font-black text-red-600 mt-2">{invoices.length - activeInvoices.length}</div>
                    </div>
                </div>
            )}

            {/* Quotations Stats */}
            {activeTab === 'quotations' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Value (Active)</div>
                        <div className="text-3xl font-black text-gray-805 mt-2">
                            ₹{totalQuotationValue.toFixed(2)}
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Active Quotations</div>
                        <div className="text-3xl font-black text-gray-805 mt-2">{activeQuotations.length}</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Cancelled Quotations</div>
                        <div className="text-3xl font-black text-red-600 mt-2">{quotations.length - activeQuotations.length}</div>
                    </div>
                </div>
            )}

            {/* Orders Stats */}
            {activeTab === 'orders' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Order Value (Active)</div>
                        <div className="text-3xl font-black text-gray-805 mt-2">
                            ₹{totalOrderValue.toFixed(2)}
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Active Orders</div>
                        <div className="text-3xl font-black text-gray-805 mt-2">{activeOrders.length}</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Cancelled Orders</div>
                        <div className="text-3xl font-black text-red-600 mt-2">{orders.length - activeOrders.length}</div>
                    </div>
                </div>
            )}

            {/* List Table */}
            {activeTab !== 'overview' && (
                <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                    {activeTab === 'invoices' && (
                        /* Invoices Table */
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="p-4 font-bold text-xs text-gray-400 uppercase">Invoice #</th>
                                    <th className="p-4 font-bold text-xs text-gray-400 uppercase">Date</th>
                                    <th className="p-4 font-bold text-xs text-gray-400 uppercase">Customer</th>
                                    <th className="p-4 font-bold text-xs text-gray-400 uppercase">Total Amount</th>
                                    <th className="p-4 font-bold text-xs text-purple-700 uppercase">GST Amount</th>
                                    <th className="p-4 font-bold text-xs text-gray-400 uppercase">Status</th>
                                    <th className="p-4 font-bold text-xs text-gray-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan="7" className="p-8 text-center text-gray-400">Loading Invoices...</td></tr>
                                ) : invoices.map((invoice) => {
                                    const cgst = parseFloat(invoice.cgst_amount || 0);
                                    const sgst = parseFloat(invoice.sgst_amount || 0);
                                    const igst = parseFloat(invoice.igst_amount || 0);
                                    const totalGst = cgst + sgst + igst;

                                    return (
                                        <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4 font-bold text-primary">#{invoice.invoice_number}</td>
                                            <td className="p-4 text-sm text-gray-600">{formatDate(invoice.invoice_date)}</td>
                                            <td className="p-4 text-sm font-semibold text-gray-800">{invoice.customer_name}</td>
                                            <td className="p-4 text-sm font-bold text-gray-900">₹{parseFloat(invoice.total_amount || 0).toFixed(2)}</td>
                                            <td className="p-4 bg-purple-50/30">
                                                <div className="text-sm font-black text-purple-800">
                                                    ₹{totalGst.toFixed(2)}
                                                </div>
                                                {igst > 0 ? (
                                                    <div className="text-[10px] font-bold text-indigo-700 mt-0.5">
                                                        IGST: ₹{igst.toFixed(2)}
                                                    </div>
                                                ) : (
                                                    <div className="text-[10px] font-semibold text-gray-500 mt-0.5 space-x-1.5">
                                                        <span>CGST: ₹{cgst.toFixed(2)}</span>
                                                        <span>|</span>
                                                        <span>SGST: ₹{sgst.toFixed(2)}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${invoice.status === 'Cancelled' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                                                    {invoice.status || 'Active'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center space-x-3">
                                                    <Link to={`/invoice/${invoice.id}`} className="text-gray-500 hover:text-primary transition-colors" title="View Preview">
                                                        <FileText size={18} />
                                                    </Link>
                                                    {invoice.status !== 'Cancelled' && (
                                                        <Link to={`/edit/${invoice.id}`} className="text-blue-500 hover:text-blue-700 transition-colors" title="Edit Invoice">
                                                            <Pencil size={18} />
                                                        </Link>
                                                    )}
                                                    {invoice.status !== 'Cancelled' && (
                                                        <button
                                                            onClick={() => handleCancelInvoice(invoice.id, invoice.invoice_number)}
                                                            className="text-orange-500 hover:text-orange-700 transition-colors"
                                                            title="Cancel Invoice"
                                                        >
                                                            <XCircle size={18} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteInvoice(invoice.id, invoice.invoice_number)}
                                                        className="text-red-500 hover:text-red-700 transition-colors"
                                                        title="Delete Permanently"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {!loading && invoices.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="p-12 text-center text-gray-400 text-sm">
                                            No tax invoices found. Create one to get started.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}

                    {activeTab === 'quotations' && (
                        /* Quotations Table */
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="p-4 font-bold text-xs text-gray-400 uppercase">Quotation #</th>
                                    <th className="p-4 font-bold text-xs text-gray-400 uppercase">Date</th>
                                    <th className="p-4 font-bold text-xs text-gray-400 uppercase">Customer</th>
                                    <th className="p-4 font-bold text-xs text-gray-400 uppercase">Item Category</th>
                                    <th className="p-4 font-bold text-xs text-gray-400 uppercase">Amount</th>
                                    <th className="p-4 font-bold text-xs text-gray-400 uppercase">Status</th>
                                    <th className="p-4 font-bold text-xs text-gray-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan="7" className="p-8 text-center text-gray-400">Loading Quotations...</td></tr>
                                ) : quotations.map((q) => (
                                    <tr key={q.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4 font-bold text-primary">{q.quotation_number}</td>
                                        <td className="p-4 text-sm text-gray-600">{formatDate(q.quotation_date)}</td>
                                        <td className="p-4 text-sm font-semibold text-gray-800">{q.customer_name}</td>
                                        <td className="p-4 text-sm text-gray-600">
                                            <span className="bg-blue-50 text-primary font-semibold text-xs px-2.5 py-1 rounded-full">
                                                {q.item_type}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm font-bold text-gray-900">₹{parseFloat(q.total_amount).toFixed(2)}</td>
                                        <td className="p-4">
                                            <div className="flex flex-col items-start gap-1">
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${q.status === 'Cancelled' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                                                    {q.status || 'Active'}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                    q.approval_status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' :
                                                    q.approval_status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-150' :
                                                    'bg-amber-50 text-amber-700 border-amber-150'
                                                }`}>
                                                    {q.approval_status || 'Pending'}
                                                </span>
                                                {q.approval_status !== 'Rejected' && q.delivery_status && (
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                                        q.delivery_status === 'Delivered' ? 'bg-blue-50 text-blue-700 border-blue-150' : 'bg-gray-100 text-gray-500 border-gray-200'
                                                    }`}>
                                                        {q.delivery_status}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center space-x-3">
                                                <Link to={`/quotation/${q.id}`} className="text-gray-500 hover:text-primary transition-colors" title="View Quotation">
                                                    <FileCheck size={18} />
                                                </Link>
                                                {q.status !== 'Cancelled' && (
                                                    <Link to={`/create-order?from_quotation=${q.id}`} className="text-emerald-605 hover:text-emerald-800 transition-colors" title="Convert to Order Form">
                                                        <ShoppingBag size={18} />
                                                    </Link>
                                                )}
                                                {q.status !== 'Cancelled' && (
                                                    <Link to={`/edit-quotation/${q.id}`} className="text-blue-500 hover:text-blue-700 transition-colors" title="Edit Quotation">
                                                        <Pencil size={18} />
                                                    </Link>
                                                )}
                                                {q.status !== 'Cancelled' && (
                                                    <button
                                                        onClick={() => handleCancelQuotation(q.id, q.quotation_number)}
                                                        className="text-orange-500 hover:text-orange-700 transition-colors"
                                                        title="Cancel Quotation"
                                                    >
                                                        <XCircle size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteQuotation(q.id, q.quotation_number)}
                                                    className="text-red-500 hover:text-red-700 transition-colors"
                                                    title="Delete Quotation"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {!loading && quotations.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="p-12 text-center text-gray-400 text-sm">
                                            No quotations found. Create one to get started.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}

                    {activeTab === 'orders' && (
                        /* Orders Table */
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="p-4 font-bold text-xs text-gray-400 uppercase">Order #</th>
                                    <th className="p-4 font-bold text-xs text-gray-400 uppercase">Date</th>
                                    <th className="p-4 font-bold text-xs text-gray-400 uppercase">Customer</th>
                                    <th className="p-4 font-bold text-xs text-gray-400 uppercase">Item Category</th>
                                    <th className="p-4 font-bold text-xs text-gray-400 uppercase">Amount</th>
                                    <th className="p-4 font-bold text-xs text-gray-400 uppercase">Status</th>
                                    <th className="p-4 font-bold text-xs text-gray-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan="7" className="p-8 text-center text-gray-400">Loading Orders...</td></tr>
                                ) : orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4 font-bold text-primary">{order.order_number}</td>
                                        <td className="p-4 text-sm text-gray-600">{formatDate(order.order_date)}</td>
                                        <td className="p-4 text-sm font-semibold text-gray-800">{order.customer_name}</td>
                                        <td className="p-4 text-sm text-gray-600">
                                            <span className="bg-blue-50 text-primary font-semibold text-xs px-2.5 py-1 rounded-full">
                                                {order.item_type}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm font-bold text-gray-900">₹{parseFloat(order.total_amount).toFixed(2)}</td>
                                        <td className="p-4">
                                            <div className="flex flex-col items-start gap-1">
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${order.status === 'Cancelled' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                                                    {order.status || 'Active'}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                    order.approval_status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' :
                                                    order.approval_status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-150' :
                                                    'bg-amber-50 text-amber-700 border-amber-150'
                                                }`}>
                                                    {order.approval_status || 'Pending'}
                                                </span>
                                                {order.approval_status !== 'Rejected' && order.delivery_status && (
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                                        order.delivery_status === 'Delivered' ? 'bg-blue-50 text-blue-700 border-blue-150' : 'bg-gray-100 text-gray-500 border-gray-200'
                                                    }`}>
                                                        {order.delivery_status}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center space-x-3">
                                                <Link to={`/order/${order.id}`} className="text-gray-500 hover:text-primary transition-colors" title="View Order Preview">
                                                    <FileCheck size={18} />
                                                </Link>
                                                {order.status !== 'Cancelled' && (
                                                    <Link to={`/edit-order/${order.id}`} className="text-blue-500 hover:text-blue-700 transition-colors" title="Edit Order Form">
                                                        <Pencil size={18} />
                                                    </Link>
                                                )}
                                                {order.status !== 'Cancelled' && (
                                                    <button
                                                        onClick={() => handleCancelOrder(order.id, order.order_number)}
                                                        className="text-orange-500 hover:text-orange-700 transition-colors"
                                                        title="Cancel Order Form"
                                                    >
                                                        <XCircle size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteOrder(order.id, order.order_number)}
                                                    className="text-red-500 hover:text-red-700 transition-colors"
                                                    title="Delete Order Form"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {!loading && orders.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="p-12 text-center text-gray-400 text-sm">
                                            No order forms found. Create one to get started.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
            )}

            {/* Custom Column Export Builder Modal */}
            {isExportModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-xl overflow-hidden flex flex-col animate-fadeIn">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                                    <SlidersHorizontal size={20} className="text-primary" />
                                    <span>Custom Report & Column Export</span>
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">Select details & columns to include, then export as Excel or PDF.</p>
                            </div>
                            <button onClick={() => setIsExportModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                            {/* 1. Report Type Selector */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">1. Select Report Type</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => handleReportTypeChange('invoices')}
                                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                                            exportReportType === 'invoices' ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        <FileText size={18} className="mb-1.5" />
                                        <span>Sales Invoices</span>
                                        <span className="text-[10px] opacity-75 font-normal">({invoices.length} total)</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleReportTypeChange('received-invoices')}
                                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                                            exportReportType === 'received-invoices' ? 'bg-purple-100 border-purple-600 text-purple-800 font-bold shadow-xs' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        <FileUp size={18} className="mb-1.5" />
                                        <span>Received Invoices</span>
                                        <span className="text-[10px] opacity-75 font-normal">({receivedInvoices.length} total)</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleReportTypeChange('quotations')}
                                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                                            exportReportType === 'quotations' ? 'bg-blue-100 border-blue-600 text-blue-800 font-bold shadow-xs' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        <FileCheck size={18} className="mb-1.5" />
                                        <span>Quotations</span>
                                        <span className="text-[10px] opacity-75 font-normal">({quotations.length} total)</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleReportTypeChange('orders')}
                                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                                            exportReportType === 'orders' ? 'bg-amber-100 border-amber-600 text-amber-800 font-bold shadow-xs' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        <ShoppingBag size={18} className="mb-1.5" />
                                        <span>Order Forms</span>
                                        <span className="text-[10px] opacity-75 font-normal">({orders.length} total)</span>
                                    </button>
                                </div>
                            </div>

                            {/* 2. Column Selection */}
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                        2. Choose Columns / Details to Include ({selectedColumns.length} selected)
                                    </label>
                                    <div className="flex space-x-2 text-[11px]">
                                        <button
                                            type="button"
                                            onClick={selectAllColumns}
                                            className="text-primary hover:underline font-bold"
                                        >
                                            Select All
                                        </button>
                                        <span className="text-gray-300">|</span>
                                        <button
                                            type="button"
                                            onClick={deselectAllColumns}
                                            className="text-gray-500 hover:underline font-bold"
                                        >
                                            Deselect All
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-white p-3.5 rounded-lg border border-gray-200 max-h-56 overflow-y-auto">
                                    {(COLUMN_CONFIGS[exportReportType] || []).map(col => {
                                        const isChecked = selectedColumns.includes(col.key);
                                        return (
                                            <label key={col.key} className="flex items-center space-x-2 text-xs text-gray-800 cursor-pointer hover:bg-gray-50 p-1.5 rounded-md transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => toggleColumn(col.key)}
                                                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                                                />
                                                <span className={isChecked ? 'font-bold text-gray-900' : 'text-gray-600'}>{col.label}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer / Action Buttons */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50/80 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => setIsExportModalOpen(false)}
                                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                Cancel
                            </button>

                            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                                <button
                                    type="button"
                                    onClick={handleRunExportExcel}
                                    disabled={selectedColumns.length === 0}
                                    className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-all disabled:opacity-50"
                                >
                                    <FileSpreadsheet size={16} />
                                    <span>Export Excel (.csv)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRunExportPDF}
                                    disabled={generatingPdf || selectedColumns.length === 0}
                                    className="flex-1 sm:flex-initial bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-all disabled:opacity-50"
                                >
                                    {generatingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                                    <span>Export PDF Report</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
