import React, { useState, useEffect } from 'react';
import { FileUp, Plus, Search, FileText, Image as ImageIcon, Download, Trash2, Edit3, X, CheckCircle, Paperclip, Eye, DollarSign, Calendar, Tag, AlertCircle } from 'lucide-react';

const ReceivedInvoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [gstFilter, setGstFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [previewFile, setPreviewFile] = useState(null); // { url, title, type }

    const [formData, setFormData] = useState({
        vendor_name: '',
        invoice_number: '',
        invoice_date: new Date().toISOString().split('T')[0],
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

    useEffect(() => {
        fetchInvoices();
    }, []);

    // Calculate GST amount dynamically if total_amount & gst_rate change
    useEffect(() => {
        if (formData.has_gst && formData.total_amount && formData.gst_rate) {
            const total = parseFloat(formData.total_amount) || 0;
            const rate = parseFloat(formData.gst_rate) || 0;
            // Base = Total / (1 + rate/100)
            // GST = Total - Base
            const gstVal = total - (total / (1 + rate / 100));
            setFormData(prev => ({ ...prev, gst_amount: gstVal.toFixed(2) }));
        } else if (!formData.has_gst) {
            setFormData(prev => ({ ...prev, gst_amount: '0.00' }));
        }
    }, [formData.total_amount, formData.gst_rate, formData.has_gst]);

    const openAddModal = () => {
        setEditingInvoice(null);
        setFormData({
            vendor_name: '',
            invoice_number: '',
            invoice_date: new Date().toISOString().split('T')[0],
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
            invoice_number: invoice.invoice_number || '',
            invoice_date: invoice.invoice_date ? invoice.invoice_date.split('T')[0] : '',
            has_gst: invoice.has_gst !== false,
            total_amount: invoice.total_amount || '',
            gst_rate: invoice.gst_rate || '18',
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
        if (!formData.invoice_number.trim()) {
            setError('Invoice number is required.');
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
        if (!window.confirm(`Are you sure you want to delete invoice "${invNo}" from "${vendor}"?`)) return;
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/received-invoices/${id}`, {
                method: 'DELETE',
                headers: { 'x-user-id': user.id }
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

    const filteredInvoices = invoices.filter(inv => {
        const query = searchTerm.toLowerCase();
        const matchesQuery = (
            (inv.vendor_name && inv.vendor_name.toLowerCase().includes(query)) ||
            (inv.invoice_number && inv.invoice_number.toLowerCase().includes(query)) ||
            (inv.notes && inv.notes.toLowerCase().includes(query))
        );

        if (gstFilter === 'WITH_GST') return matchesQuery && inv.has_gst;
        if (gstFilter === 'WITHOUT_GST') return matchesQuery && !inv.has_gst;
        return matchesQuery;
    });

    // Summary calculations
    const totalSpent = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
    const totalGstClaimed = invoices.reduce((sum, inv) => sum + (inv.has_gst ? (parseFloat(inv.gst_amount) || 0) : 0), 0);

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
                        <FileUp className="text-primary" size={24} />
                        <span>Received Invoices (Purchases & Expenses)</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">Upload and keep track of bills and invoices received from vendors with PDF/image attachments.</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="w-full sm:w-auto bg-primary hover:bg-secondary text-white px-5 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-all font-bold shadow-sm"
                >
                    <Plus size={18} />
                    <span>Upload New Invoice</span>
                </button>
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

            {/* Search & Filter Options */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                        <Search size={18} />
                    </span>
                    <input
                        type="text"
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all shadow-xs"
                        placeholder="Search vendor name, invoice no, remarks..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <button
                        onClick={() => setGstFilter('ALL')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${gstFilter === 'ALL' ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                    >
                        All ({invoices.length})
                    </button>
                    <button
                        onClick={() => setGstFilter('WITH_GST')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${gstFilter === 'WITH_GST' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                    >
                        With GST ({invoices.filter(i => i.has_gst).length})
                    </button>
                    <button
                        onClick={() => setGstFilter('WITHOUT_GST')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${gstFilter === 'WITHOUT_GST' ? 'bg-gray-700 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
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
                        {searchTerm ? 'No invoices match your search query.' : 'Upload vendor bills and received invoices to store attachments.'}
                    </p>
                    {!searchTerm && (
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
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Vendor / Supplier</th>
                                    <th className="p-4">Invoice No</th>
                                    <th className="p-4">GST Type</th>
                                    <th className="p-4">Total Amount</th>
                                    <th className="p-4">Attached File</th>
                                    <th className="p-4">Remarks / Notes</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs">
                                {filteredInvoices.map(inv => (
                                    <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4 text-gray-600 font-medium whitespace-nowrap">
                                            {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                        </td>
                                        <td className="p-4 font-bold text-gray-800">
                                            {inv.vendor_name}
                                        </td>
                                        <td className="p-4 font-mono text-gray-700 font-semibold">
                                            {inv.invoice_number}
                                        </td>
                                        <td className="p-4">
                                            {inv.has_gst ? (
                                                <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                                    With GST ({inv.gst_rate}%)
                                                </span>
                                            ) : (
                                                <span className="bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                                    Without GST
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 font-bold text-emerald-700">
                                            ₹{parseFloat(inv.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            {inv.has_gst && (
                                                <span className="block text-[10px] text-gray-400 font-normal">
                                                    (GST: ₹{parseFloat(inv.gst_amount || 0).toFixed(2)})
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {inv.file_path ? (
                                                <a
                                                    href={`${import.meta.env.VITE_API_URL}${inv.file_path}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center space-x-1 text-primary hover:text-secondary font-semibold bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors text-xs"
                                                >
                                                    <Paperclip size={14} />
                                                    <span className="truncate max-w-[100px]" title={inv.original_filename || 'Attachment'}>
                                                        {inv.original_filename || 'View File'}
                                                    </span>
                                                </a>
                                            ) : (
                                                <span className="text-gray-350 italic text-[11px]">No file</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-gray-500 max-w-[180px] truncate" title={inv.notes}>
                                            {inv.notes || '-'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end items-center space-x-2">
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
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add / Edit Received Invoice Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden my-8 animate-fadeIn">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                                <FileUp size={20} className="text-primary" />
                                <span>{editingInvoice ? 'Edit Received Invoice' : 'Upload Received Invoice'}</span>
                            </h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        {error && (
                            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
                                <AlertCircle size={16} />
                                <span>{error}</span>
                            </div>
                        )}

                        {success && (
                            <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs flex items-center space-x-2">
                                <CheckCircle size={16} />
                                <span>{success}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Vendor / Supplier Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                        placeholder="e.g. ABC Paper Mills Ltd"
                                        value={formData.vendor_name}
                                        onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Invoice Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                        placeholder="e.g. INV-2026-0042"
                                        value={formData.invoice_number}
                                        onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-200/60">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">GST Rate (%)</label>
                                            <select
                                                className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold"
                                                value={formData.gst_rate}
                                                onChange={(e) => setFormData({ ...formData, gst_rate: e.target.value })}
                                            >
                                                <option value="5">5%</option>
                                                <option value="12">12%</option>
                                                <option value="18">18%</option>
                                                <option value="28">28%</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Estimated GST Amount (₹)</label>
                                            <input
                                                readOnly
                                                type="text"
                                                className="w-full px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-lg text-xs font-bold text-purple-700 outline-none"
                                                value={formData.gst_amount ? `₹${formData.gst_amount}` : '₹0.00'}
                                            />
                                        </div>
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

                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
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
        </div>
    );
};

export default ReceivedInvoices;
