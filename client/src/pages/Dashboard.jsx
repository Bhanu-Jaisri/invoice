import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, Search, FileText, Trash2, XCircle, Pencil, FileCheck, ShoppingBag } from 'lucide-react';

const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
};

const Dashboard = () => {
    const location = useLocation();
    const [invoices, setInvoices] = useState([]);
    const [quotations, setQuotations] = useState([]);
    const [orders, setOrders] = useState([]);
    const [activeTab, setActiveTab] = useState('invoices');
    const [loading, setLoading] = useState(true);

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
                setInvoices(data);
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
                setQuotations(data);
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
                setOrders(data);
            }
        } catch (err) {
            console.error('Error fetching orders:', err);
        }
    };

    const loadData = async () => {
        setLoading(true);
        await Promise.all([fetchInvoices(), fetchQuotations(), fetchOrders()]);
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

    // Calculate Orders Stats
    const activeOrders = orders.filter(o => o.status !== 'Cancelled');
    const totalOrderValue = activeOrders.reduce((acc, o) => acc + parseFloat(o.total_amount || 0), 0);

    return (
        <div className="space-y-6">
            {/* Upper Heading Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex space-x-2 border-b border-gray-250 w-full sm:w-auto">
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

                {activeTab === 'invoices' && (
                    <Link to="/create" className="w-full sm:w-auto bg-primary hover:bg-secondary text-white px-5 py-2.5 rounded-xl flex justify-center items-center space-x-2 transition-all font-bold shadow-md">
                        <Plus size={20} />
                        <span>Create New Invoice</span>
                    </Link>
                )}
                {activeTab === 'quotations' && (
                    <Link to="/create-quotation" className="w-full sm:w-auto bg-primary hover:bg-secondary text-white px-5 py-2.5 rounded-xl flex justify-center items-center space-x-2 transition-all font-bold shadow-md">
                        <Plus size={20} />
                        <span>Create New Quotation</span>
                    </Link>
                )}
                {activeTab === 'orders' && (
                    <Link to="/create-order" className="w-full sm:w-auto bg-primary hover:bg-secondary text-white px-5 py-2.5 rounded-xl flex justify-center items-center space-x-2 transition-all font-bold shadow-md">
                        <Plus size={20} />
                        <span>Create New Order</span>
                    </Link>
                )}
            </div>

            {/* Invoices Stats */}
            {activeTab === 'invoices' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Revenue (Active)</div>
                        <div className="text-3xl font-black text-gray-805 mt-2">
                            ₹{totalInvoiceRevenue.toFixed(2)}
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
                                    <th className="p-4 font-bold text-xs text-gray-400 uppercase">Amount</th>
                                    <th className="p-4 font-bold text-xs text-gray-400 uppercase">Status</th>
                                    <th className="p-4 font-bold text-xs text-gray-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan="6" className="p-8 text-center text-gray-400">Loading Invoices...</td></tr>
                                ) : invoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4 font-bold text-primary">#{invoice.invoice_number}</td>
                                        <td className="p-4 text-sm text-gray-600">{formatDate(invoice.invoice_date)}</td>
                                        <td className="p-4 text-sm font-semibold text-gray-800">{invoice.customer_name}</td>
                                        <td className="p-4 text-sm font-bold text-gray-900">₹{parseFloat(invoice.total_amount).toFixed(2)}</td>
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
                                ))}
                                {!loading && invoices.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="p-12 text-center text-gray-400 text-sm">
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
        </div>
    );
};

export default Dashboard;
