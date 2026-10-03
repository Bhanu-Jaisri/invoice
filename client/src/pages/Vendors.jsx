import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Search, Edit3, Trash2, Phone, Mail, MapPin, X, CheckCircle, AlertCircle, FileUp, Tag } from 'lucide-react';

const Vendors = () => {
    const navigate = useNavigate();
    const [vendors, setVendors] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        mobile: '',
        gstin: '',
        email: '',
        address: ''
    });

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
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVendors();
    }, []);

    const openAddModal = () => {
        setEditingVendor(null);
        setFormData({
            name: '',
            mobile: '',
            gstin: '',
            email: '',
            address: ''
        });
        setError('');
        setSuccess('');
        setIsModalOpen(true);
    };

    const openEditModal = (vendor) => {
        setEditingVendor(vendor);
        setFormData({
            name: vendor.name || '',
            mobile: vendor.mobile || '',
            gstin: vendor.gstin || '',
            email: vendor.email || '',
            address: vendor.address || ''
        });
        setError('');
        setSuccess('');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingVendor(null);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!formData.name.trim()) {
            setError('Vendor / Customer Name is required.');
            return;
        }

        setSaving(true);
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const url = editingVendor
                ? `${import.meta.env.VITE_API_URL}/api/vendors/${editingVendor.id}`
                : `${import.meta.env.VITE_API_URL}/api/vendors`;
            const method = editingVendor ? 'PUT' : 'POST';

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
                setSuccess(editingVendor ? 'Vendor updated successfully!' : 'Vendor added successfully!');
                fetchVendors();
                setTimeout(() => {
                    closeModal();
                }, 600);
            } else {
                setError(data.error || 'Failed to save vendor');
            }
        } catch (err) {
            console.error(err);
            setError('Server error occurred while saving vendor');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete vendor "${name}"?`)) return;
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/vendors/${id}`, {
                method: 'DELETE',
                headers: { 'x-user-id': user.id }
            });
            if (res.ok) {
                fetchVendors();
            } else {
                alert('Failed to delete vendor');
            }
        } catch (err) {
            console.error(err);
            alert('Error deleting vendor');
        }
    };

    const filteredVendors = vendors.filter(v => {
        const query = searchTerm.toLowerCase();
        return (
            (v.name && v.name.toLowerCase().includes(query)) ||
            (v.gstin && v.gstin.toLowerCase().includes(query)) ||
            (v.mobile && v.mobile.toLowerCase().includes(query)) ||
            (v.email && v.email.toLowerCase().includes(query)) ||
            (v.address && v.address.toLowerCase().includes(query))
        );
    });

    const vendorsWithGst = vendors.filter(v => v.gstin && v.gstin.trim() !== '');

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
                        <Building2 className="text-primary" size={24} />
                        <span>Received Vendors & Suppliers</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">Manage saved vendor details (Name, GSTIN, Email, Mobile, Address) for auto-filling received invoices.</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="bg-primary hover:bg-secondary text-white px-5 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-all font-bold shadow-sm text-xs w-full sm:w-auto"
                >
                    <Plus size={18} />
                    <span>Add New Vendor</span>
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Saved Vendors</p>
                        <h3 className="text-2xl font-black text-gray-800 mt-1">{vendors.length}</h3>
                    </div>
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                        <Building2 size={24} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vendors with GSTIN</p>
                        <h3 className="text-2xl font-black text-purple-700 mt-1">{vendorsWithGst.length}</h3>
                    </div>
                    <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
                        <Tag size={24} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vendors with Mobile</p>
                        <h3 className="text-2xl font-black text-emerald-600 mt-1">{vendors.filter(v => v.mobile).length}</h3>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <Phone size={24} />
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                <div className="relative w-full sm:w-96">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                        <Search size={18} />
                    </span>
                    <input
                        type="text"
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all shadow-xs"
                        placeholder="Search vendor name, GSTIN, mobile, email, address..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Vendors Table */}
            {loading ? (
                <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-100">
                    Loading vendor directory...
                </div>
            ) : filteredVendors.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 space-y-3">
                    <Building2 size={48} className="mx-auto text-gray-300" />
                    <h3 className="text-base font-bold text-gray-700">No Vendors Found</h3>
                    <p className="text-xs text-gray-400">
                        {searchTerm ? 'No vendors match your search criteria.' : 'Click "Add New Vendor" to create your vendor directory.'}
                    </p>
                    {!searchTerm && (
                        <button
                            onClick={openAddModal}
                            className="mt-2 bg-primary hover:bg-secondary text-white px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5"
                        >
                            <Plus size={16} />
                            <span>Add New Vendor</span>
                        </button>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                                    <th className="p-4">Vendor / Customer Name</th>
                                    <th className="p-4">Mobile & Email</th>
                                    <th className="p-4">GSTIN Number</th>
                                    <th className="p-4">Address</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs">
                                {filteredVendors.map(vendor => (
                                    <tr key={vendor.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-gray-900 text-sm">{vendor.name}</div>
                                        </td>
                                        <td className="p-4 text-gray-600">
                                            {vendor.mobile && (
                                                <div className="flex items-center space-x-1">
                                                    <Phone size={12} className="text-gray-400" />
                                                    <span>{vendor.mobile}</span>
                                                </div>
                                            )}
                                            {vendor.email && (
                                                <div className="flex items-center space-x-1 text-gray-500 mt-0.5">
                                                    <Mail size={12} className="text-gray-400" />
                                                    <span>{vendor.email}</span>
                                                </div>
                                            )}
                                            {!vendor.mobile && !vendor.email && <span className="text-gray-300">-</span>}
                                        </td>
                                        <td className="p-4 font-mono font-bold text-purple-700 whitespace-nowrap">
                                            {vendor.gstin ? vendor.gstin : <span className="text-gray-300 font-normal font-sans">-</span>}
                                        </td>
                                        <td className="p-4 text-gray-600 max-w-xs whitespace-pre-line">
                                            {vendor.address ? vendor.address : <span className="text-gray-300">-</span>}
                                        </td>
                                        <td className="p-4 text-right whitespace-nowrap">
                                            <div className="flex justify-end items-center space-x-2">
                                                <button
                                                    onClick={() => navigate(`/received-invoices?search=${encodeURIComponent(vendor.name)}`)}
                                                    className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold transition-colors inline-flex items-center space-x-1"
                                                    title="View Received Invoices for this vendor"
                                                >
                                                    <FileUp size={14} />
                                                    <span>Invoices</span>
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(vendor)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit Vendor"
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(vendor.id, vendor.name)}
                                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Delete Vendor"
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

            {/* Add / Edit Vendor Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-fadeIn">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                                <Building2 size={20} className="text-primary" />
                                <span>{editingVendor ? 'Edit Vendor Details' : 'Add New Vendor / Customer'}</span>
                            </h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Vendor / Customer Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    type="text"
                                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="e.g. ABC Paper Mills Ltd"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Mobile Number <span className="text-gray-400 font-normal">(Optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                                        placeholder="e.g. 9876543210"
                                        value={formData.mobile}
                                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        GSTIN Number <span className="text-gray-400 font-normal">(Optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-mono uppercase focus:ring-2 focus:ring-primary outline-none"
                                        placeholder="e.g. 33AAAAA0000A1Z5"
                                        value={formData.gstin}
                                        onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Email ID <span className="text-gray-400 font-normal">(Optional)</span>
                                </label>
                                <input
                                    type="email"
                                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="e.g. vendor@supplier.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Vendor Address <span className="text-gray-400 font-normal">(Optional)</span>
                                </label>
                                <textarea
                                    rows="3"
                                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
                                    placeholder="e.g. No. 12, Industrial Estate, Guindy, Chennai, Tamil Nadu - 600032"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex justify-end space-x-3">
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
                                    {saving ? 'Saving...' : editingVendor ? 'Update Vendor' : 'Save Vendor'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Vendors;
