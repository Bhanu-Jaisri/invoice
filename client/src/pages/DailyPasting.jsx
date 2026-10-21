import React, { useState, useEffect } from 'react';
import { 
    Layers, Plus, Search, Edit3, Trash2, CheckCircle, Clock, AlertCircle, 
    FileSpreadsheet, FileText, Printer, X, Phone, DollarSign, Calendar, Filter, User
} from 'lucide-react';
import { exportReportToExcel, exportReportToWord, toTitleCase } from '../utils/cityAndExportUtils';

const COMMON_BOARDS = ['Grey Board', 'Duplex Board', 'Kappa Board', 'Straw Board', 'Mill Board', 'Kraft Board'];

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const cleanStr = String(dateStr).split('T')[0].trim();
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return cleanStr;
};

const getTodayDate = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const DailyPasting = () => {
    const [records, setRecords] = useState([]);
    const [savedCustomers, setSavedCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'Pending', 'Partially Paid', 'Fully Paid'
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState({
        pasting_date: getTodayDate(),
        customer_name: '',
        customer_mobile: '',
        cardboard_type: '',
        quantity: 1,
        rate_per_cardboard: '',
        pasting_charges: '',
        total_amount: '',
        payment_status: 'Pending',
        paid_amount: '',
        pending_amount: '',
        notes: ''
    });

    const fetchRecords = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) return;
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/daily-pasting`, {
                headers: { 'x-user-id': user.id }
            });
            if (res.ok) {
                const data = await res.json();
                setRecords(data);
            }
        } catch (err) {
            console.error('Error fetching daily pasting records:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomers = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) return;
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/customers`, {
                headers: { 'x-user-id': user.id }
            });
            if (res.ok) {
                const data = await res.json();
                setSavedCustomers(data);
            }
        } catch (err) {
            console.error('Error fetching customers:', err);
        }
    };

    useEffect(() => {
        fetchRecords();
        fetchCustomers();
    }, []);

    // Recalculate total and pending amounts whenever quantity, rate, pasting charges, paid amount, or payment status changes
    const recalculateFinancials = (qtyVal, rateVal, chargesVal, paidVal, statusVal) => {
        const qty = parseFloat(qtyVal) || 0;
        const rate = parseFloat(rateVal) || 0;
        const charges = parseFloat(chargesVal) || 0;
        const total = (qty * rate) + charges;

        let status = statusVal;
        let paid = parseFloat(paidVal) || 0;
        let pending = 0;

        if (status === 'Fully Paid') {
            paid = total;
            pending = 0;
        } else if (status === 'Pending') {
            paid = 0;
            pending = total;
        } else {
            // Partially Paid
            if (paid >= total && total > 0) {
                status = 'Fully Paid';
                pending = 0;
            } else {
                pending = Math.max(0, total - paid);
            }
        }

        return {
            total_amount: total > 0 ? total.toFixed(2) : '',
            paid_amount: paid > 0 ? paid.toFixed(2) : '',
            pending_amount: pending.toFixed(2),
            payment_status: status
        };
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updated = { ...prev, [name]: value };

            if (name === 'quantity' || name === 'rate_per_cardboard' || name === 'pasting_charges') {
                const calcs = recalculateFinancials(
                    name === 'quantity' ? value : updated.quantity,
                    name === 'rate_per_cardboard' ? value : updated.rate_per_cardboard,
                    name === 'pasting_charges' ? value : updated.pasting_charges,
                    updated.paid_amount,
                    updated.payment_status
                );
                return { ...updated, ...calcs };
            }

            if (name === 'paid_amount') {
                const paidNum = parseFloat(value) || 0;
                const totalNum = parseFloat(updated.total_amount) || 0;
                let newStatus = updated.payment_status;
                let newPending = 0;

                if (paidNum >= totalNum && totalNum > 0) {
                    newStatus = 'Fully Paid';
                    newPending = 0;
                } else if (paidNum > 0) {
                    newStatus = 'Partially Paid';
                    newPending = Math.max(0, totalNum - paidNum);
                } else {
                    newStatus = 'Pending';
                    newPending = totalNum;
                }

                return {
                    ...updated,
                    paid_amount: value,
                    payment_status: newStatus,
                    pending_amount: newPending.toFixed(2)
                };
            }

            if (name === 'payment_status') {
                const totalNum = parseFloat(updated.total_amount) || 0;
                if (value === 'Fully Paid') {
                    return {
                        ...updated,
                        payment_status: value,
                        paid_amount: totalNum > 0 ? totalNum.toFixed(2) : '0.00',
                        pending_amount: '0.00' // If fully paid, remaining amount is strictly 0
                    };
                } else if (value === 'Pending') {
                    return {
                        ...updated,
                        payment_status: value,
                        paid_amount: '0.00',
                        pending_amount: totalNum.toFixed(2)
                    };
                } else {
                    // Partially Paid
                    const currentPaid = parseFloat(updated.paid_amount) || (totalNum > 0 ? (totalNum / 2) : 0);
                    const pendingNum = Math.max(0, totalNum - currentPaid);
                    return {
                        ...updated,
                        payment_status: value,
                        paid_amount: currentPaid.toFixed(2),
                        pending_amount: pendingNum.toFixed(2)
                    };
                }
            }

            return updated;
        });
    };

    const handleSelectCustomer = (e) => {
        const custName = e.target.value;
        const found = savedCustomers.find(c => c.name === custName);
        setFormData(prev => ({
            ...prev,
            customer_name: custName,
            customer_mobile: found?.mobile || prev.customer_mobile
        }));
    };

    const openAddModal = () => {
        setEditingRecord(null);
        setFormData({
            pasting_date: getTodayDate(),
            customer_name: '',
            customer_mobile: '',
            cardboard_type: '',
            quantity: 1,
            rate_per_cardboard: '',
            pasting_charges: '',
            total_amount: '',
            payment_status: 'Pending',
            paid_amount: '',
            pending_amount: '0.00',
            notes: ''
        });
        setError('');
        setSuccess('');
        setIsModalOpen(true);
    };

    const openEditModal = (rec) => {
        setEditingRecord(rec);
        const cleanDate = rec.pasting_date ? rec.pasting_date.split('T')[0] : getTodayDate();
        setFormData({
            pasting_date: cleanDate,
            customer_name: rec.customer_name || '',
            customer_mobile: rec.customer_mobile || '',
            cardboard_type: rec.cardboard_type || '',
            quantity: rec.quantity || 1,
            rate_per_cardboard: rec.rate_per_cardboard ? String(rec.rate_per_cardboard) : '',
            pasting_charges: rec.pasting_charges ? String(rec.pasting_charges) : '',
            total_amount: rec.total_amount ? String(rec.total_amount) : '',
            payment_status: rec.payment_status || 'Pending',
            paid_amount: rec.paid_amount ? String(rec.paid_amount) : '',
            pending_amount: rec.pending_amount !== undefined && rec.pending_amount !== null ? String(rec.pending_amount) : '0.00',
            notes: rec.notes || ''
        });
        setError('');
        setSuccess('');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingRecord(null);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!formData.customer_name.trim()) {
            setError('Customer Name is required.');
            return;
        }

        const qtyNum = parseFloat(formData.quantity);
        if (isNaN(qtyNum) || qtyNum <= 0) {
            setError('Valid Quantity is required.');
            return;
        }

        const rateNum = parseFloat(formData.rate_per_cardboard);
        if (isNaN(rateNum) || rateNum < 0) {
            setError('Rate per cardboard is required.');
            return;
        }

        setSaving(true);
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const url = editingRecord 
                ? `${import.meta.env.VITE_API_URL}/api/daily-pasting/${editingRecord.id}`
                : `${import.meta.env.VITE_API_URL}/api/daily-pasting`;
            const method = editingRecord ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (res.ok) {
                setSuccess(editingRecord ? 'Record updated successfully!' : 'Record created successfully!');
                fetchRecords();
                setTimeout(() => {
                    closeModal();
                }, 500);
            } else {
                setError(data.error || 'Failed to save record');
            }
        } catch (err) {
            console.error('Error submitting pasting record:', err);
            setError('Server error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, custName) => {
        if (!window.confirm(`Are you sure you want to delete daily pasting entry for "${custName}"?`)) return;
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/daily-pasting/${id}`, {
                method: 'DELETE',
                headers: { 'x-user-id': user.id }
            });
            if (res.ok) {
                fetchRecords();
            } else {
                alert('Failed to delete record');
            }
        } catch (err) {
            console.error(err);
            alert('Error deleting record');
        }
    };

    const handleQuickMarkPaid = async (rec) => {
        if (!window.confirm(`Mark order for "${rec.customer_name}" as Fully Paid (₹${parseFloat(rec.total_amount).toFixed(2)})? Remaining amount will be set to ₹0.00.`)) {
            return;
        }
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/daily-pasting/${rec.id}/mark-paid`, {
                method: 'PATCH',
                headers: { 'x-user-id': user.id }
            });
            if (res.ok) {
                fetchRecords();
            } else {
                alert('Failed to update status');
            }
        } catch (err) {
            console.error(err);
            alert('Error updating status');
        }
    };

    // Filtered items
    const filteredRecords = records.filter(r => {
        const q = searchTerm.toLowerCase();
        const matchesSearch = 
            (r.customer_name && r.customer_name.toLowerCase().includes(q)) ||
            (r.cardboard_type && r.cardboard_type.toLowerCase().includes(q)) ||
            (r.notes && r.notes.toLowerCase().includes(q)) ||
            (r.customer_mobile && r.customer_mobile.includes(q)) ||
            (r.pasting_date && r.pasting_date.includes(q));

        if (!matchesSearch) return false;

        if (statusFilter === 'ALL') return true;
        return r.payment_status === statusFilter;
    });

    // Summary Calculations
    const totalPastingJobs = records.length;
    const totalAmountSum = records.reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0);
    const totalPaidSum = records.reduce((sum, r) => sum + (parseFloat(r.paid_amount) || 0), 0);
    const totalPendingSum = records.reduce((sum, r) => sum + (parseFloat(r.pending_amount) || 0), 0);

    // Export Excel
    const handleExportExcel = () => {
        if (filteredRecords.length === 0) {
            alert('No records available to export.');
            return;
        }
        const user = JSON.parse(localStorage.getItem('user')) || {};
        const company = {
            name: user.office_name || 'NRG JAISRI PRINTERS',
            address: user.office_address || '',
            gstin: user.office_gstin || '',
            mobile: user.office_mobile || '',
            email: user.office_email || ''
        };
        const headers = [
            'S.No', 'Date', 'Customer Name', 'Mobile', 'Cardboard Type', 
            'Quantity', 'Rate/Cardboard (₹)', 'Total Amount (₹)', 'Paid Amount (₹)', 
            'Pending Amount (₹)', 'Payment Status', 'Notes'
        ];
        const rows = filteredRecords.map((r, i) => [
            i + 1,
            formatDate(r.pasting_date),
            r.customer_name || '-',
            r.customer_mobile || '-',
            r.cardboard_type || '-',
            r.quantity || 0,
            parseFloat(r.rate_per_cardboard || 0).toFixed(2),
            parseFloat(r.total_amount || 0).toFixed(2),
            parseFloat(r.paid_amount || 0).toFixed(2),
            parseFloat(r.pending_amount || 0).toFixed(2),
            r.payment_status || 'Pending',
            r.notes || '-'
        ]);

        exportReportToExcel({
            title: 'DAILY PASTING REPORT',
            company,
            filterNotes: statusFilter !== 'ALL' ? [`Filter: ${statusFilter}`] : [],
            headers,
            rows,
            filename: `DAILY_PASTING_REPORT_${getTodayDate()}`
        });
    };

    // Export Word
    const handleExportWord = () => {
        if (filteredRecords.length === 0) {
            alert('No records available to export.');
            return;
        }
        const user = JSON.parse(localStorage.getItem('user')) || {};
        const company = {
            name: user.office_name || 'NRG JAISRI PRINTERS',
            address: user.office_address || '',
            gstin: user.office_gstin || '',
            mobile: user.office_mobile || '',
            email: user.office_email || ''
        };
        const headers = [
            '#', 'Date', 'Customer Name', 'Cardboard Type', 'Qty', 
            'Rate (₹)', 'Total (₹)', 'Paid (₹)', 'Pending (₹)', 'Status'
        ];
        const rows = filteredRecords.map((r, i) => [
            i + 1,
            formatDate(r.pasting_date),
            r.customer_name || '-',
            r.cardboard_type || '-',
            r.quantity || 0,
            parseFloat(r.rate_per_cardboard || 0).toFixed(2),
            parseFloat(r.total_amount || 0).toFixed(2),
            parseFloat(r.paid_amount || 0).toFixed(2),
            parseFloat(r.pending_amount || 0).toFixed(2),
            r.payment_status || 'Pending'
        ]);

        exportReportToWord({
            title: 'DAILY PASTING REPORT',
            company,
            filterNotes: statusFilter !== 'ALL' ? [`Filter: ${statusFilter}`] : [],
            headers,
            rows,
            filename: `DAILY_PASTING_REPORT_${getTodayDate()}`,
            orientation: 'landscape'
        });
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-xl font-bold text-gray-800 flex items-center space-x-2.5">
                        <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                            <Layers size={22} />
                        </div>
                        <span>Daily Pasting Management</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        Track daily cardboard pasting orders, rates with pasting charges, payments, and remaining balances.
                    </p>
                </div>
                <div className="flex items-center space-x-2.5 w-full sm:w-auto">
                    <button
                        onClick={handleExportExcel}
                        className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl font-bold text-xs flex items-center space-x-1.5 border border-emerald-200 transition-all shadow-xs"
                        title="Export to Excel"
                    >
                        <FileSpreadsheet size={16} className="text-emerald-600" />
                        <span className="hidden sm:inline">Excel</span>
                    </button>
                    <button
                        onClick={handleExportWord}
                        className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl font-bold text-xs flex items-center space-x-1.5 border border-blue-200 transition-all shadow-xs"
                        title="Export to Word"
                    >
                        <FileText size={16} className="text-blue-600" />
                        <span className="hidden sm:inline">Word</span>
                    </button>
                    <button
                        onClick={openAddModal}
                        className="flex-1 sm:flex-none bg-primary hover:bg-secondary text-white px-5 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-all font-bold shadow-sm"
                    >
                        <Plus size={18} />
                        <span>Add Daily Pasting</span>
                    </button>
                </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Pasting Jobs</div>
                        <div className="text-2xl font-black text-gray-800 mt-1">{totalPastingJobs}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">Overall registered orders</div>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Layers size={24} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Value (₹)</div>
                        <div className="text-2xl font-black text-primary mt-1">₹{totalAmountSum.toFixed(2)}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">Cardboard + Pasting total</div>
                    </div>
                    <div className="p-3 bg-blue-50 text-primary rounded-xl">
                        <DollarSign size={24} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Amount Collected</div>
                        <div className="text-2xl font-black text-emerald-600 mt-1">₹{totalPaidSum.toFixed(2)}</div>
                        <div className="text-[11px] text-emerald-600/80 mt-0.5">Payments received</div>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <CheckCircle size={24} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Pending Amount</div>
                        <div className={`text-2xl font-black mt-1 ${totalPendingSum > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            ₹{totalPendingSum.toFixed(2)}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">Outstanding balance</div>
                    </div>
                    <div className={`p-3 rounded-xl ${totalPendingSum > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        <Clock size={24} />
                    </div>
                </div>
            </div>

            {/* Filters & Search Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                    <button
                        type="button"
                        onClick={() => setStatusFilter('ALL')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            statusFilter === 'ALL'
                                ? 'bg-primary text-white shadow-xs'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        All ({records.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('Pending')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            statusFilter === 'Pending'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                        }`}
                    >
                        Pending ({records.filter(r => r.payment_status === 'Pending').length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('Partially Paid')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            statusFilter === 'Partially Paid'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                        }`}
                    >
                        Partial ({records.filter(r => r.payment_status === 'Partially Paid').length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('Fully Paid')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            statusFilter === 'Fully Paid'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                    >
                        Fully Paid ({records.filter(r => r.payment_status === 'Fully Paid').length})
                    </button>
                </div>

                <div className="relative w-full sm:w-80">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                        <Search size={16} />
                    </span>
                    <input
                        type="text"
                        className="w-full pl-9 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        placeholder="Search customer, board type, date..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Daily Pasting Table */}
            {loading ? (
                <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-100">
                    Loading daily pasting records...
                </div>
            ) : filteredRecords.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 space-y-3">
                    <Layers size={48} className="mx-auto text-gray-300" />
                    <h3 className="text-base font-bold text-gray-700">No Daily Pasting Records Found</h3>
                    <p className="text-xs text-gray-400">
                        {searchTerm || statusFilter !== 'ALL'
                            ? 'No records match your selected filters.'
                            : 'Get started by creating your first daily pasting entry.'}
                    </p>
                    <button
                        onClick={openAddModal}
                        className="mt-2 bg-primary hover:bg-secondary text-white px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center space-x-1.5"
                    >
                        <Plus size={16} />
                        <span>Add Daily Pasting</span>
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                                    <th className="p-4 text-center w-12">#</th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Customer Name</th>
                                    <th className="p-4">Cardboard Type</th>
                                    <th className="p-4 text-center">Quantity</th>
                                    <th className="p-4 text-right">Rate / Board (₹)</th>
                                    <th className="p-4 text-right">Total Amount (₹)</th>
                                    <th className="p-4 text-right">Paid Amount (₹)</th>
                                    <th className="p-4 text-right">Remaining Amount (₹)</th>
                                    <th className="p-4 text-center">Payment Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs">
                                {filteredRecords.map((rec, index) => {
                                    const total = parseFloat(rec.total_amount || 0);
                                    const paid = parseFloat(rec.paid_amount || 0);
                                    const pending = parseFloat(rec.pending_amount || 0);
                                    const isFullyPaid = rec.payment_status === 'Fully Paid' || pending <= 0;

                                    return (
                                        <tr key={rec.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4 text-center font-bold text-gray-400">
                                                {index + 1}
                                            </td>
                                            <td className="p-4 text-gray-600 whitespace-nowrap">
                                                <div className="flex items-center space-x-1.5">
                                                    <Calendar size={13} className="text-gray-400" />
                                                    <span>{formatDate(rec.pasting_date)}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 font-bold text-gray-800">
                                                <div>{rec.customer_name}</div>
                                                {rec.customer_mobile && (
                                                    <div className="text-[11px] text-gray-400 font-normal flex items-center space-x-1 mt-0.5">
                                                        <Phone size={11} />
                                                        <span>{rec.customer_mobile}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-gray-700">
                                                {rec.cardboard_type ? (
                                                    <span className="bg-gray-100 text-gray-800 px-2.5 py-0.5 rounded-full font-semibold text-[11px]">
                                                        {rec.cardboard_type}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 italic">-</span>
                                                )}
                                                {rec.notes && (
                                                    <div className="text-[10px] text-gray-400 mt-1 max-w-xs truncate" title={rec.notes}>
                                                        Note: {rec.notes}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-center font-bold text-primary text-sm">
                                                {rec.quantity ? Number(rec.quantity).toLocaleString() : 0}
                                            </td>
                                            <td className="p-4 text-right text-gray-700 font-semibold">
                                                ₹{parseFloat(rec.rate_per_cardboard || 0).toFixed(2)}
                                                {parseFloat(rec.pasting_charges || 0) > 0 && (
                                                    <div className="text-[10px] text-gray-400">
                                                        + ₹{parseFloat(rec.pasting_charges).toFixed(2)} chrgs
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-right font-black text-gray-900 text-sm">
                                                ₹{total.toFixed(2)}
                                            </td>
                                            <td className="p-4 text-right font-bold text-emerald-700">
                                                ₹{paid.toFixed(2)}
                                            </td>
                                            <td className="p-4 text-right font-black">
                                                {isFullyPaid ? (
                                                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                                                        ₹0.00
                                                    </span>
                                                ) : (
                                                    <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded text-[11px] border border-amber-200">
                                                        ₹{pending.toFixed(2)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                                                    rec.payment_status === 'Fully Paid'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : rec.payment_status === 'Partially Paid'
                                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                                        : 'bg-rose-50 text-rose-700 border-rose-200'
                                                }`}>
                                                    {rec.payment_status || 'Pending'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right whitespace-nowrap">
                                                <div className="flex justify-end items-center space-x-1.5">
                                                    {!isFullyPaid && (
                                                        <button
                                                            onClick={() => handleQuickMarkPaid(rec)}
                                                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold border border-emerald-200 transition-colors"
                                                            title="Mark as Fully Paid (Remaining = 0)"
                                                        >
                                                            Mark Paid
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => openEditModal(rec)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Edit Entry"
                                                    >
                                                        <Edit3 size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(rec.id, rec.customer_name)}
                                                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                        title="Delete Entry"
                                                    >
                                                        <Trash2 size={15} />
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

            {/* Add / Edit Daily Pasting Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 shrink-0">
                            <h2 className="text-base font-bold text-gray-800 flex items-center space-x-2">
                                <Layers size={18} className="text-primary" />
                                <span>{editingRecord ? 'Edit Daily Pasting Entry' : 'Add New Daily Pasting'}</span>
                            </h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
                            {error && (
                                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200">
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="p-3 bg-green-50 text-green-700 rounded-xl text-xs border border-green-200">
                                    {success}
                                </div>
                            )}

                            {/* Date & Customer Select */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Pasting Date *
                                    </label>
                                    <input
                                        type="date"
                                        name="pasting_date"
                                        value={formData.pasting_date}
                                        onChange={handleFormChange}
                                        required
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-semibold text-gray-800"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Select Saved Customer (Optional)
                                    </label>
                                    <select
                                        onChange={handleSelectCustomer}
                                        defaultValue=""
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none cursor-pointer"
                                    >
                                        <option value="">-- Choose Existing Customer --</option>
                                        {savedCustomers.map(c => (
                                            <option key={c.id} value={c.name}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Customer Name & Mobile */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Customer Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="customer_name"
                                        value={formData.customer_name}
                                        onChange={handleFormChange}
                                        placeholder="e.g. Standard Fireworks / Party Name"
                                        required
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-semibold text-gray-800"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Mobile Number
                                    </label>
                                    <input
                                        type="text"
                                        name="customer_mobile"
                                        value={formData.customer_mobile}
                                        onChange={handleFormChange}
                                        placeholder="Mobile / Contact number"
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-gray-800"
                                    />
                                </div>
                            </div>

                            {/* Cardboard Type */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Cardboard Type
                                </label>
                                <input
                                    type="text"
                                    name="cardboard_type"
                                    value={formData.cardboard_type}
                                    onChange={handleFormChange}
                                    placeholder="e.g. Grey Board, Duplex Board, Kappa Board, 1000 GSM..."
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-gray-800 font-semibold"
                                />
                                {/* Quick Pill selection */}
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    {COMMON_BOARDS.map(b => (
                                        <button
                                            key={b}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, cardboard_type: b }))}
                                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors ${
                                                formData.cardboard_type === b 
                                                    ? 'bg-primary text-white border-primary' 
                                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-150 border-gray-200'
                                            }`}
                                        >
                                            {b}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Quantity, Rate per Cardboard & Pasting Charges */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Quantity *
                                    </label>
                                    <input
                                        type="number"
                                        name="quantity"
                                        min="0.1"
                                        step="any"
                                        value={formData.quantity}
                                        onChange={handleFormChange}
                                        required
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-bold text-gray-800"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Rate / Cardboard (₹) *
                                    </label>
                                    <input
                                        type="number"
                                        name="rate_per_cardboard"
                                        min="0"
                                        step="any"
                                        placeholder="Rate per cardboard"
                                        value={formData.rate_per_cardboard}
                                        onChange={handleFormChange}
                                        required
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-bold text-gray-800"
                                    />
                                    <span className="text-[10px] text-gray-400 mt-0.5 block">With pasting charges</span>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Extra Pasting Chrg (₹)
                                    </label>
                                    <input
                                        type="number"
                                        name="pasting_charges"
                                        min="0"
                                        step="any"
                                        placeholder="Optional extra (0)"
                                        value={formData.pasting_charges}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-gray-800"
                                    />
                                </div>
                            </div>

                            {/* Financial Total, Payment Status, Paid & Remaining */}
                            <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-100/70 space-y-3.5">
                                <div className="flex justify-between items-center border-b border-indigo-100 pb-2">
                                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                        Total Calculated Amount:
                                    </span>
                                    <span className="text-lg font-black text-primary">
                                        ₹{parseFloat(formData.total_amount || 0).toFixed(2)}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                            Payment Status
                                        </label>
                                        <select
                                            name="payment_status"
                                            value={formData.payment_status}
                                            onChange={handleFormChange}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary focus:border-transparent outline-none cursor-pointer"
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="Partially Paid">Partially Paid</option>
                                            <option value="Fully Paid">Fully Paid</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                            Amount Paid (₹)
                                        </label>
                                        <input
                                            type="number"
                                            name="paid_amount"
                                            min="0"
                                            step="any"
                                            value={formData.paid_amount}
                                            onChange={handleFormChange}
                                            placeholder="0.00"
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                            Remaining Amount (₹)
                                        </label>
                                        <div className={`px-3 py-2 rounded-xl text-xs font-black border ${
                                            parseFloat(formData.pending_amount || 0) <= 0
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                : 'bg-amber-50 text-amber-800 border-amber-200'
                                        }`}>
                                            ₹{parseFloat(formData.pending_amount || 0).toFixed(2)}
                                        </div>
                                        {formData.payment_status === 'Fully Paid' && (
                                            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                                                ✓ Fully paid: Remaining set to ₹0.00
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Notes / Remarks */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Notes / Remarks
                                </label>
                                <textarea
                                    name="notes"
                                    rows="2"
                                    value={formData.notes}
                                    onChange={handleFormChange}
                                    placeholder="Enter any special cutting, pasting instructions, or payment notes..."
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-gray-800"
                                />
                            </div>

                            {/* Submit Buttons */}
                            <div className="pt-2 flex items-center justify-end space-x-2.5">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-primary hover:bg-secondary text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : editingRecord ? 'Update Pasting' : 'Save Daily Pasting'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DailyPasting;
