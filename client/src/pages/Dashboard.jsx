import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, FileText, Trash2, XCircle } from 'lucide-react';

const Dashboard = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchInvoices = () => {
        setLoading(true);
        fetch(`${import.meta.env.VITE_API_URL}/api/invoices`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setInvoices(data);
                } else {
                    console.error('Expected array but got:', data);
                    setInvoices([]);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    const handleDelete = async (id, number) => {
        console.log(`[DASHBOARD] Delete requested for ID: ${id}, Number: ${number}`);
        // Simplified confirmation for reliability in all environments
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/invoices/${id}`, { method: 'DELETE' });
            if (res.ok) {
                console.log(`[DASHBOARD] Successfully deleted ID: ${id}`);
                fetchInvoices();
            } else {
                alert('Failed to delete invoice');
            }
        } catch (err) {
            console.error(err);
            alert('Error deleting invoice');
        }
    };

    const handleCancel = async (id, number) => {
        console.log(`[DASHBOARD] Cancel requested for ID: ${id}, Number: ${number}`);
        // Simplified confirmation for reliability in all environments
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/invoices/${id}/cancel`, { method: 'PATCH' });
            if (res.ok) {
                console.log(`[DASHBOARD] Successfully cancelled ID: ${id}`);
                fetchInvoices();
            } else {
                alert('Failed to cancel invoice');
            }
        } catch (err) {
            console.error(err);
            alert('Error cancelling invoice');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg md:text-xl font-medium text-gray-700">Recent Invoices</h3>
                <Link to="/create" className="w-full sm:w-auto bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex justify-center items-center space-x-2 transition-colors">
                    <Plus size={20} />
                    <span>Create New Invoice</span>
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-gray-500 text-sm">Total Revenue (Active)</div>
                    <div className="text-3xl font-bold text-gray-800 mt-2">
                        ₹{invoices.filter(inv => inv.status !== 'Cancelled').reduce((acc, inv) => acc + parseFloat(inv.total_amount), 0).toFixed(2)}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-gray-500 text-sm">Active Invoices</div>
                    <div className="text-3xl font-bold text-gray-800 mt-2">{invoices.filter(inv => inv.status !== 'Cancelled').length}</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-gray-500 text-sm">Cancelled Invoices</div>
                    <div className="text-3xl font-bold text-red-600 mt-2">{invoices.filter(inv => inv.status === 'Cancelled').length}</div>
                </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="p-4 font-semibold text-gray-600">Invoice #</th>
                                <th className="p-4 font-semibold text-gray-600">Date</th>
                                <th className="p-4 font-semibold text-gray-600">Customer</th>
                                <th className="p-4 font-semibold text-gray-600">Amount</th>
                                <th className="p-4 font-semibold text-gray-600">Status</th>
                                <th className="p-4 font-semibold text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="6" className="p-4 text-center">Loading...</td></tr>
                            ) : invoices.map((invoice) => (
                                <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-medium text-primary">#{invoice.invoice_number}</td>
                                    <td className="p-4">{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                                    <td className="p-4">{invoice.customer_name}</td>
                                    <td className="p-4 font-bold">₹{parseFloat(invoice.total_amount).toFixed(2)}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${invoice.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {invoice.status || 'Active'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center space-x-3">
                                            <Link to={`/invoice/${invoice.id}`} className="text-gray-500 hover:text-primary" title="View">
                                                <FileText size={20} />
                                            </Link>
                                            {invoice.status !== 'Cancelled' && (
                                                <button
                                                    onClick={() => handleCancel(invoice.id, invoice.invoice_number)}
                                                    className="text-orange-500 hover:text-orange-700"
                                                    title="Cancel & Free Number"
                                                >
                                                    <XCircle size={20} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(invoice.id, invoice.invoice_number)}
                                                className="text-red-500 hover:text-red-700"
                                                title="Delete Permanently"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && invoices.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-gray-500">
                                        No invoices found. Create one to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
