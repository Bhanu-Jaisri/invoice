import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Edit3, Trash2, Phone, Mail, CreditCard, MapPin, X, CheckCircle } from 'lucide-react';

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        mobile: '',
        gstin: '',
        email: '',
        billing_address: ''
    });

    const fetchCustomers = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) return;
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/customers`, {
                headers: { 'x-user-id': user.id }
            });
            if (res.ok) {
                const data = await res.json();
                setCustomers(data);
            }
        } catch (err) {
            console.error('Error fetching customers:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const openAddModal = () => {
        setEditingCustomer(null);
        setFormData({
            name: '',
            mobile: '',
            gstin: '',
            email: '',
            billing_address: ''
        });
        setError('');
        setSuccess('');
        setIsModalOpen(true);
    };

    const openEditModal = (customer) => {
        setEditingCustomer(customer);
        setFormData({
            name: customer.name || '',
            mobile: customer.mobile || '',
            gstin: customer.gstin || '',
            email: customer.email || '',
            billing_address: customer.billing_address || ''
        });
        setError('');
        setSuccess('');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingCustomer(null);
        setError('');
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Required field validation
        if (!formData.name.trim() || !formData.mobile.trim()) {
            setError('Customer Name and Mobile Number are required.');
            return;
        }

        setSaving(true);
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const url = editingCustomer
                ? `${import.meta.env.VITE_API_URL}/api/customers/${editingCustomer.id}`
                : `${import.meta.env.VITE_API_URL}/api/customers`;
            const method = editingCustomer ? 'PUT' : 'POST';

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
                setSuccess(editingCustomer ? 'Customer updated successfully!' : 'Customer added successfully!');
                fetchCustomers();
                setTimeout(() => {
                    closeModal();
                }, 600);
            } else {
                setError(data.error || 'Failed to save customer');
            }
        } catch (err) {
            console.error(err);
            setError('Server error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete customer "${name}"?`)) return;
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/customers/${id}`, {
                method: 'DELETE',
                headers: { 'x-user-id': user.id }
            });
            if (res.ok) {
                fetchCustomers();
            } else {
                alert('Failed to delete customer');
            }
        } catch (err) {
            console.error(err);
            alert('Error deleting customer');
        }
    };

    const filteredCustomers = customers.filter(c => {
        const query = searchTerm.toLowerCase();
        return (
            (c.name && c.name.toLowerCase().includes(query)) ||
            (c.mobile && c.mobile.toLowerCase().includes(query)) ||
            (c.gstin && c.gstin.toLowerCase().includes(query)) ||
            (c.email && c.email.toLowerCase().includes(query)) ||
            (c.billing_address && c.billing_address.toLowerCase().includes(query))
        );
    });

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
                        <Users className="text-primary" size={24} />
                        <span>Customer Directory</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">Manage your saved customers and their billing details.</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="w-full sm:w-auto bg-primary hover:bg-secondary text-white px-5 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-all font-bold shadow-sm"
                >
                    <Plus size={18} />
                    <span>Add New Customer</span>
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                    <Search size={18} />
                </span>
                <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all shadow-xs"
                    placeholder="Search by customer name, mobile number, GSTIN, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Customers Table / Card List */}
            {loading ? (
                <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-100">
                    Loading customer directory...
                </div>
            ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 space-y-3">
                    <Users size={48} className="mx-auto text-gray-300" />
                    <h3 className="text-base font-bold text-gray-700">No Customers Found</h3>
                    <p className="text-xs text-gray-400">
                        {searchTerm ? 'No customers match your search query.' : 'Get started by adding your first customer.'}
                    </p>
                    {!searchTerm && (
                        <button
                            onClick={openAddModal}
                            className="mt-2 bg-primary hover:bg-secondary text-white px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5"
                        >
                            <Plus size={16} />
                            <span>Add Customer</span>
                        </button>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                                    <th className="p-4">Customer Name</th>
                                    <th className="p-4">Mobile Number</th>
                                    <th className="p-4">GSTIN</th>
                                    <th className="p-4">Email</th>
                                    <th className="p-4">Billing Address</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs">
                                {filteredCustomers.map(customer => (
                                    <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4 font-bold text-gray-800">
                                            {customer.name}
                                        </td>
                                        <td className="p-4 text-gray-700 font-medium">
                                            <div className="flex items-center space-x-1.5">
                                                <Phone size={14} className="text-gray-400 shrink-0" />
                                                <span>{customer.mobile}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-600">
                                            {customer.gstin ? (
                                                <span className="font-mono font-bold text-gray-750 uppercase bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                                                    {customer.gstin}
                                                </span>
                                            ) : (
                                                <span className="text-gray-350 text-[11px] italic">-</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-gray-600">
                                            {customer.email ? (
                                                <div className="flex items-center space-x-1.5">
                                                    <Mail size={14} className="text-gray-400 shrink-0" />
                                                    <span>{customer.email}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-350 text-[11px] italic">-</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-gray-600 max-w-xs truncate" title={customer.billing_address}>
                                            {customer.billing_address || <span className="text-gray-350 italic">-</span>}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end items-center space-x-2">
                                                <button
                                                    onClick={() => openEditModal(customer)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit Customer"
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(customer.id, customer.name)}
                                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Delete Customer"
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

            {/* Add / Edit Customer Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-fadeIn">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                                <Users size={20} className="text-primary" />
                                <span>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</span>
                            </h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        {error && (
                            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs flex items-center space-x-2">
                                <CheckCircle size={16} />
                                <span>{success}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Customer Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    name="name"
                                    type="text"
                                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    placeholder="Enter full customer / business name"
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Mobile Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    name="mobile"
                                    type="tel"
                                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    placeholder="e.g. 9842719397"
                                    value={formData.mobile}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">GSTIN (Optional)</label>
                                    <input
                                        name="gstin"
                                        type="text"
                                        maxLength="15"
                                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm uppercase focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                        placeholder="15-digit GSTIN"
                                        value={formData.gstin}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Email ID (Optional)</label>
                                    <input
                                        name="email"
                                        type="email"
                                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                        placeholder="customer@example.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Billing Address (Optional)</label>
                                <textarea
                                    name="billing_address"
                                    rows="3"
                                    className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                                    placeholder="Enter complete billing address"
                                    value={formData.billing_address}
                                    onChange={handleChange}
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
                                    {saving ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Save Customer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Customers;
