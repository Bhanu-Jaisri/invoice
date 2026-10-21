import React, { useState, useEffect } from 'react';
import { 
    Users, Plus, Search, Edit3, Trash2, Calendar, DollarSign, 
    Layers, FileSpreadsheet, FileText, X, AlertCircle, CheckCircle,
    StickyNote, Eye, RefreshCw
} from 'lucide-react';
import { exportReportToExcel, exportReportToWord, toTitleCase } from '../utils/cityAndExportUtils';

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

const PastingWorkerSalaries = () => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [dateRangeFilter, setDateRangeFilter] = useState('ALL'); // 'ALL', 'TODAY', 'THIS_MONTH'
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [viewingNote, setViewingNote] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState({
        salary_date: getTodayDate(),
        worker_name: '',
        quantity: '',
        salary: '',
        payment_status: 'Paid',
        notes: ''
    });

    const fetchRecords = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) return;
            setLoading(true);

            const res = await fetch('/api/pasting-worker-salaries', {
                headers: { 'x-user-id': user.id }
            });
            if (res.ok) {
                const data = await res.json();
                setRecords(data);
            } else {
                console.error('Failed to load worker salaries');
            }
        } catch (err) {
            console.error('Error fetching worker salaries:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    const resetForm = () => {
        setFormData({
            salary_date: getTodayDate(),
            worker_name: '',
            quantity: '',
            salary: '',
            payment_status: 'Paid',
            notes: ''
        });
        setEditingRecord(null);
        setError('');
    };

    const handleOpenModal = (record = null) => {
        if (record) {
            setEditingRecord(record);
            setFormData({
                salary_date: record.salary_date ? record.salary_date.split('T')[0] : getTodayDate(),
                worker_name: record.worker_name || '',
                quantity: record.quantity !== undefined ? record.quantity : '',
                salary: record.salary !== undefined ? record.salary : '',
                payment_status: record.payment_status || 'Paid',
                notes: record.notes || ''
            });
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        resetForm();
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.salary_date) {
            setError('Please choose a valid date.');
            return;
        }

        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            setError('User session expired. Please log in again.');
            return;
        }

        setSaving(true);
        try {
            const url = editingRecord 
                ? `/api/pasting-worker-salaries/${editingRecord.id}` 
                : '/api/pasting-worker-salaries';
            const method = editingRecord ? 'PUT' : 'POST';

            const payload = {
                salary_date: formData.salary_date,
                worker_name: formData.worker_name ? toTitleCase(formData.worker_name.trim()) : '',
                quantity: parseFloat(formData.quantity) || 0,
                salary: parseFloat(formData.salary) || 0,
                payment_status: formData.payment_status || 'Paid',
                notes: formData.notes || ''
            };

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setSuccess(editingRecord ? 'Worker salary record updated!' : 'Worker salary record added successfully!');
                setTimeout(() => setSuccess(''), 3000);
                handleCloseModal();
                fetchRecords();
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to save salary record.');
            }
        } catch (err) {
            console.error('Error saving worker salary record:', err);
            setError('Network error. Failed to save record.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, worker) => {
        if (!window.confirm(`Are you sure you want to delete this salary entry${worker ? ` for ${worker}` : ''}?`)) {
            return;
        }

        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) return;

        try {
            const res = await fetch(`/api/pasting-worker-salaries/${id}`, {
                method: 'DELETE',
                headers: { 'x-user-id': user.id }
            });

            if (res.ok) {
                setSuccess('Record deleted successfully.');
                setTimeout(() => setSuccess(''), 3000);
                setRecords(prev => prev.filter(r => r.id !== id));
            } else {
                alert('Failed to delete salary record.');
            }
        } catch (err) {
            console.error('Error deleting salary record:', err);
            alert('Network error while deleting.');
        }
    };

    // Filter Logic
    const filteredRecords = records.filter(r => {
        // Status filter
        if (statusFilter !== 'ALL' && r.payment_status !== statusFilter) {
            return false;
        }

        // Date filter
        if (dateRangeFilter === 'TODAY') {
            const today = getTodayDate();
            const recDate = r.salary_date ? r.salary_date.split('T')[0] : '';
            if (recDate !== today) return false;
        } else if (dateRangeFilter === 'THIS_MONTH') {
            const now = new Date();
            const curY = now.getFullYear();
            const curM = String(now.getMonth() + 1).padStart(2, '0');
            const targetPrefix = `${curY}-${curM}`;
            const recDate = r.salary_date ? r.salary_date.split('T')[0] : '';
            if (!recDate.startsWith(targetPrefix)) return false;
        }

        // Search text
        if (!searchTerm.trim()) return true;
        const s = searchTerm.toLowerCase();
        const worker = (r.worker_name || '').toLowerCase();
        const notes = (r.notes || '').toLowerCase();
        const dateFmt = formatDate(r.salary_date).toLowerCase();
        const dateRaw = (r.salary_date || '').toLowerCase();

        return worker.includes(s) || notes.includes(s) || dateFmt.includes(s) || dateRaw.includes(s);
    });

    // KPI Metrics
    const totalSalary = records.reduce((acc, r) => acc + (parseFloat(r.salary) || 0), 0);
    const totalQty = records.reduce((acc, r) => acc + (parseFloat(r.quantity) || 0), 0);
    const totalPaidSalary = records
        .filter(r => r.payment_status === 'Paid')
        .reduce((acc, r) => acc + (parseFloat(r.salary) || 0), 0);
    const totalPendingSalary = records
        .filter(r => r.payment_status === 'Pending')
        .reduce((acc, r) => acc + (parseFloat(r.salary) || 0), 0);

    // Export Helpers
    const handleExportExcel = () => {
        if (filteredRecords.length === 0) {
            alert('No records available to export.');
            return;
        }
        const data = filteredRecords.map((r, i) => ({
            'S.No': i + 1,
            'Date': formatDate(r.salary_date),
            'Worker Name': r.worker_name || '-',
            'Quantity': r.quantity || 0,
            'Salary (INR)': parseFloat(r.salary || 0).toFixed(2),
            'Status': r.payment_status || 'Paid',
            'Notes / Remarks': r.notes || '-'
        }));
        exportReportToExcel(data, `Pasting_Workers_Salary_${getTodayDate()}`, 'Workers Salary');
    };

    const handleExportWord = () => {
        if (filteredRecords.length === 0) {
            alert('No records available to export.');
            return;
        }
        const headers = ['S.No', 'Date', 'Worker Name', 'Quantity', 'Salary (INR)', 'Status', 'Notes / Remarks'];
        const rows = filteredRecords.map((r, i) => [
            i + 1,
            formatDate(r.salary_date),
            r.worker_name || '-',
            r.quantity || 0,
            `₹${parseFloat(r.salary || 0).toFixed(2)}`,
            r.payment_status || 'Paid',
            r.notes || '-'
        ]);
        exportReportToWord('Pasting Workers Salary Report', headers, rows, `Pasting_Workers_Salary_${getTodayDate()}`);
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header & Page Title */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                            <Users size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                                Pasting Workers Salary
                            </h1>
                            <p className="text-xs md:text-sm text-gray-500 font-medium">
                                Manage daily pasting work quantity, salaries, and remarks/notes
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold rounded-xl transition-all shadow-sm"
                        title="Export to Excel"
                    >
                        <FileSpreadsheet size={16} />
                        <span className="hidden md:inline">Excel</span>
                    </button>
                    <button
                        onClick={handleExportWord}
                        className="flex items-center space-x-1.5 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold rounded-xl transition-all shadow-sm"
                        title="Export to Word"
                    >
                        <FileText size={16} />
                        <span className="hidden md:inline">Word</span>
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center space-x-2 px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs md:text-sm font-bold rounded-xl shadow-sm transition-all hover:scale-[1.01]"
                    >
                        <Plus size={18} />
                        <span>Add Worker Salary</span>
                    </button>
                </div>
            </div>

            {/* Notification Messages */}
            {success && (
                <div className="flex items-center space-x-2 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium animate-fadeIn">
                    <CheckCircle size={18} className="text-emerald-600 shrink-0" />
                    <span>{success}</span>
                </div>
            )}

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600 shrink-0">
                        <DollarSign size={22} />
                    </div>
                    <div>
                        <p className="text-[11px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">Total Salary</p>
                        <h3 className="text-lg md:text-2xl font-black text-gray-900 mt-0.5">
                            ₹{totalSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                    </div>
                </div>

                <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-purple-50 rounded-xl text-purple-600 shrink-0">
                        <Layers size={22} />
                    </div>
                    <div>
                        <p className="text-[11px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">Total Quantity</p>
                        <h3 className="text-lg md:text-2xl font-black text-gray-900 mt-0.5">
                            {totalQty.toLocaleString('en-IN')} <span className="text-xs font-semibold text-gray-500">pcs</span>
                        </h3>
                    </div>
                </div>

                <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
                        <CheckCircle size={22} />
                    </div>
                    <div>
                        <p className="text-[11px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">Paid Amount</p>
                        <h3 className="text-lg md:text-2xl font-black text-emerald-600 mt-0.5">
                            ₹{totalPaidSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                    </div>
                </div>

                <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-amber-50 rounded-xl text-amber-600 shrink-0">
                        <AlertCircle size={22} />
                    </div>
                    <div>
                        <p className="text-[11px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Salary</p>
                        <h3 className="text-lg md:text-2xl font-black text-amber-600 mt-0.5">
                            ₹{totalPendingSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by worker name, notes content, date..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Quick Filters */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Status Filter */}
                        <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-semibold">
                            {['ALL', 'Paid', 'Pending', 'Advance'].map(st => (
                                <button
                                    key={st}
                                    onClick={() => setStatusFilter(st)}
                                    className={`px-3 py-1.5 rounded-lg transition-all ${
                                        statusFilter === st 
                                            ? 'bg-white text-gray-900 shadow-sm font-bold' 
                                            : 'text-gray-500 hover:text-gray-900'
                                    }`}
                                >
                                    {st === 'ALL' ? 'All Status' : st}
                                </button>
                            ))}
                        </div>

                        {/* Date Filter */}
                        <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-semibold">
                            {[
                                { key: 'ALL', label: 'All Dates' },
                                { key: 'TODAY', label: 'Today' },
                                { key: 'THIS_MONTH', label: 'This Month' }
                            ].map(dt => (
                                <button
                                    key={dt.key}
                                    onClick={() => setDateRangeFilter(dt.key)}
                                    className={`px-3 py-1.5 rounded-lg transition-all ${
                                        dateRangeFilter === dt.key 
                                            ? 'bg-white text-gray-900 shadow-sm font-bold' 
                                            : 'text-gray-500 hover:text-gray-900'
                                    }`}
                                >
                                    {dt.label}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={fetchRecords}
                            className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-xl transition-all"
                            title="Refresh Data"
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                <th className="py-3.5 px-4 w-12 text-center">#</th>
                                <th className="py-3.5 px-4">Date</th>
                                <th className="py-3.5 px-4">Worker / Name</th>
                                <th className="py-3.5 px-4 text-right">Quantity</th>
                                <th className="py-3.5 px-4 text-right">Salary Amount</th>
                                <th className="py-3.5 px-4 text-center">Status</th>
                                <th className="py-3.5 px-4 min-w-[240px]">Note (Fill Box)</th>
                                <th className="py-3.5 px-4 text-right w-28">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-gray-400">
                                        <div className="flex items-center justify-center space-x-2">
                                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                            <span className="font-medium text-xs">Loading worker salaries...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center">
                                        <div className="max-w-xs mx-auto space-y-2 text-gray-400">
                                            <Users size={32} className="mx-auto text-gray-300" />
                                            <p className="font-semibold text-gray-600">No worker salary records found</p>
                                            <p className="text-xs text-gray-400">
                                                Click the <strong>Add Worker Salary</strong> button to record daily quantities and wages.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map((r, idx) => (
                                    <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                                        {/* S.No */}
                                        <td className="py-3 px-4 text-center text-xs font-semibold text-gray-400">
                                            {idx + 1}
                                        </td>

                                        {/* Date */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <div className="flex items-center space-x-1.5 font-semibold text-gray-800 text-xs">
                                                <Calendar size={13} className="text-gray-400" />
                                                <span>{formatDate(r.salary_date)}</span>
                                            </div>
                                        </td>

                                        {/* Worker Name */}
                                        <td className="py-3 px-4">
                                            <div className="font-bold text-gray-900 text-sm">
                                                {r.worker_name || <span className="text-gray-400 font-normal italic">General Pasting Worker</span>}
                                            </div>
                                        </td>

                                        {/* Quantity */}
                                        <td className="py-3 px-4 text-right">
                                            <span className="font-black text-gray-900 text-sm">
                                                {Number(r.quantity || 0).toLocaleString('en-IN')}
                                            </span>
                                            <span className="text-[11px] text-gray-500 font-semibold ml-1">pcs</span>
                                        </td>

                                        {/* Salary */}
                                        <td className="py-3 px-4 text-right font-black text-gray-900 text-sm">
                                            ₹{parseFloat(r.salary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>

                                        {/* Payment Status */}
                                        <td className="py-3 px-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                r.payment_status === 'Paid'
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                    : r.payment_status === 'Advance'
                                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                            }`}>
                                                {r.payment_status || 'Paid'}
                                            </span>
                                        </td>

                                        {/* Note Box */}
                                        <td className="py-3 px-4">
                                            {r.notes ? (
                                                <div 
                                                    onClick={() => setViewingNote({ title: r.worker_name || 'Worker Note', date: r.salary_date, content: r.notes })}
                                                    className="group cursor-pointer bg-amber-50/60 hover:bg-amber-50 border border-amber-200/80 rounded-xl p-2.5 text-xs text-amber-950 transition-all"
                                                    title="Click to view full note"
                                                >
                                                    <div className="flex items-start justify-between gap-1">
                                                        <div className="flex items-center space-x-1.5 font-bold text-amber-800 text-[11px] mb-1">
                                                            <StickyNote size={12} className="text-amber-600" />
                                                            <span>Note / Remarks</span>
                                                        </div>
                                                        <Eye size={12} className="text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                    <p className="line-clamp-2 text-gray-700 font-normal whitespace-pre-line leading-relaxed">
                                                        {r.notes}
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-300 italic">No notes</span>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end space-x-1">
                                                <button
                                                    onClick={() => handleOpenModal(r)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit Record"
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(r.id, r.worker_name)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete Record"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Count */}
                <div className="bg-gray-50/60 px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 gap-2">
                    <span>
                        Showing <strong>{filteredRecords.length}</strong> of <strong>{records.length}</strong> records
                    </span>
                    <span className="font-semibold text-gray-600">
                        Total Quantity: {filteredRecords.reduce((a, r) => a + (parseFloat(r.quantity) || 0), 0).toLocaleString('en-IN')} pcs
                        &nbsp;|&nbsp;
                        Total Salary: ₹{filteredRecords.reduce((a, r) => a + (parseFloat(r.salary) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
            </div>

            {/* Note Full-View Modal */}
            {viewingNote && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <div className="flex items-center space-x-2">
                                <StickyNote size={20} className="text-amber-600" />
                                <h3 className="text-base font-bold text-gray-900">
                                    {viewingNote.title} ({formatDate(viewingNote.date)})
                                </h3>
                            </div>
                            <button
                                onClick={() => setViewingNote(null)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/60 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto font-sans">
                            {viewingNote.content}
                        </div>
                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setViewingNote(null)}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add / Edit Worker Salary Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn overflow-y-auto">
                    <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 my-8">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
                            <div className="flex items-center space-x-2.5">
                                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                    <Users size={20} />
                                </div>
                                <h2 className="text-lg font-black text-gray-900">
                                    {editingRecord ? 'Edit Worker Salary Record' : 'Add Pasting Worker Salary'}
                                </h2>
                            </div>
                            <button
                                onClick={handleCloseModal}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {error && (
                            <div className="mb-4 flex items-center space-x-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                                <AlertCircle size={16} className="shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Modal Form */}
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Date */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                        Date <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="date"
                                            required
                                            value={formData.salary_date}
                                            onChange={(e) => setFormData({ ...formData, salary_date: e.target.value })}
                                            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        />
                                    </div>
                                </div>

                                {/* Worker / Team Name */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                        Worker / Team Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.worker_name}
                                        onChange={(e) => setFormData({ ...formData, worker_name: e.target.value })}
                                        placeholder="e.g. Ramesh, Daily Team A"
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                </div>

                                {/* Quantity */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                        Quantity <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Layers size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="number"
                                            step="any"
                                            min="0"
                                            required
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                            placeholder="e.g. 1500"
                                            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        />
                                    </div>
                                </div>

                                {/* Salary Amount */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                        Salary (₹) <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            required
                                            value={formData.salary}
                                            onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                                            placeholder="e.g. 500.00"
                                            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        />
                                    </div>
                                </div>

                                {/* Payment Status */}
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                        Payment Status
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['Paid', 'Pending', 'Advance'].map(st => (
                                            <button
                                                type="button"
                                                key={st}
                                                onClick={() => setFormData({ ...formData, payment_status: st })}
                                                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                                                    formData.payment_status === st
                                                        ? st === 'Paid'
                                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                            : st === 'Advance'
                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                            : 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                                }`}
                                            >
                                                {st}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Note Box (Spacious Textarea as requested: "note make a box we need to fill anything") */}
                                <div className="sm:col-span-2">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Note Box <span className="text-gray-400 font-normal lowercase">(fill anything)</span>
                                        </label>
                                        <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                                            Editable Box
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <textarea
                                            rows={5}
                                            value={formData.notes}
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            placeholder="Write anything here... E.g. rate breakdown, cardboard details, shift time, advance balance, overtime remarks, or any custom details."
                                            className="w-full p-3.5 bg-amber-50/30 border-2 border-amber-200/80 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-sans leading-relaxed transition-all resize-y"
                                        />
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-1">
                                        💡 You can type unlimited text, paste details, rate notes, or calculations in this box.
                                    </p>
                                </div>
                            </div>

                            {/* Modal Actions */}
                            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center space-x-1.5"
                                >
                                    {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                    <span>{editingRecord ? 'Update Record' : 'Save Record'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PastingWorkerSalaries;
