import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, Search, FileText, Trash2, XCircle, Pencil, FileCheck, ShoppingBag, TrendingUp, Calendar, BookOpen, CreditCard, FileUp, Tag, CheckCircle, AlertCircle, Filter, ArrowUpRight, ArrowDownRight } from 'lucide-react';

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
    const [receivedInvoices, setReceivedInvoices] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);

    // Year & Month Filter state for GST Settlement
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(String(currentYear));
    const [selectedMonth, setSelectedMonth] = useState('ALL');

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

    // Build years dropdown list from data
    const availableYearsSet = new Set([String(currentYear), '2025', '2024']);
    invoices.forEach(inv => {
        if (inv.invoice_date) {
            availableYearsSet.add(String(new Date(inv.invoice_date).getFullYear()));
        }
    });
    receivedInvoices.forEach(inv => {
        if (inv.invoice_date) {
            availableYearsSet.add(String(new Date(inv.invoice_date).getFullYear()));
        }
    });
    const availableYears = Array.from(availableYearsSet).sort((a, b) => b - a);

    // Filtered Created Invoices by selected Year & Month
    const filteredSalesInvoices = activeInvoices.filter(inv => {
        if (!inv.invoice_date) return false;
        const d = new Date(inv.invoice_date);
        const y = String(d.getFullYear());
        const m = String(d.getMonth() + 1).padStart(2, '0');

        if (selectedYear !== 'ALL' && y !== selectedYear) return false;
        if (selectedMonth !== 'ALL' && m !== selectedMonth) return false;
        return true;
    });

    const salesGstCollected = filteredSalesInvoices.reduce((sum, inv) => {
        const cgst = parseFloat(inv.cgst_amount || 0);
        const sgst = parseFloat(inv.sgst_amount || 0);
        const igst = parseFloat(inv.igst_amount || 0);
        return sum + cgst + sgst + igst;
    }, 0);

    const filteredSalesTotal = filteredSalesInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);

    // Filtered Received Invoices (Purchases / ITC) by selected Year & Month
    const filteredPurchaseInvoices = receivedInvoices.filter(inv => {
        if (!inv.invoice_date) return false;
        const d = new Date(inv.invoice_date);
        const y = String(d.getFullYear());
        const m = String(d.getMonth() + 1).padStart(2, '0');

        if (selectedYear !== 'ALL' && y !== selectedYear) return false;
        if (selectedMonth !== 'ALL' && m !== selectedMonth) return false;
        return true;
    });

    const purchasesGstPaid = filteredPurchaseInvoices.reduce((sum, inv) => {
        if (!inv.has_gst) return sum;
        return sum + parseFloat(inv.gst_amount || 0);
    }, 0);

    const filteredPurchasesTotal = filteredPurchaseInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);

    const netGstPayable = salesGstCollected - purchasesGstPaid;

    // Monthly Settlement Breakdown Report for Selected Year
    const monthlyGstReport = monthsList.map(mObj => {
        const mCode = mObj.code;

        const mSales = activeInvoices.filter(inv => {
            if (!inv.invoice_date) return false;
            const d = new Date(inv.invoice_date);
            const matchesYear = selectedYear === 'ALL' ? true : String(d.getFullYear()) === selectedYear;
            return matchesYear && String(d.getMonth() + 1).padStart(2, '0') === mCode;
        });

        const mPurchases = receivedInvoices.filter(inv => {
            if (!inv.invoice_date) return false;
            const d = new Date(inv.invoice_date);
            const matchesYear = selectedYear === 'ALL' ? true : String(d.getFullYear()) === selectedYear;
            return matchesYear && String(d.getMonth() + 1).padStart(2, '0') === mCode;
        });

        const mSalesGst = mSales.reduce((sum, inv) => sum + parseFloat(inv.cgst_amount || 0) + parseFloat(inv.sgst_amount || 0) + parseFloat(inv.igst_amount || 0), 0);
        const mPurchasesGst = mPurchases.reduce((sum, inv) => sum + (inv.has_gst ? parseFloat(inv.gst_amount || 0) : 0), 0);
        const mNet = mSalesGst - mPurchasesGst;

        return {
            monthName: mObj.name,
            monthCode: mCode,
            salesCount: mSales.length,
            salesGst: mSalesGst,
            purchasesCount: mPurchases.length,
            purchasesGst: mPurchasesGst,
            netGst: mNet
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

            {/* Overview Stats */}
            {activeTab === 'overview' && (
                <div className="space-y-8 animate-fadeIn">
                    {/* Key Metrics Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl text-white shadow-lg transform hover:-translate-y-1 transition-all duration-300">
                            <div className="flex justify-between items-center">
                                <span className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Invoice Revenue (Active)</span>
                                <TrendingUp size={24} className="text-emerald-100" />
                            </div>
                            <div className="text-2xl lg:text-3xl font-black mt-2">
                                ₹{totalInvoiceRevenue.toFixed(2)}
                            </div>
                            <div className="text-xs text-emerald-100/80 mt-1">From active tax invoices</div>
                        </div>

                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-2xl text-white shadow-lg transform hover:-translate-y-1 transition-all duration-300">
                            <div className="flex justify-between items-center">
                                <span className="text-amber-100 text-xs font-bold uppercase tracking-wider">Total Order Value (Active)</span>
                                <CreditCard size={24} className="text-amber-100" />
                            </div>
                            <div className="text-2xl lg:text-3xl font-black mt-2">
                                ₹{totalOrderValue.toFixed(2)}
                            </div>
                            <div className="text-xs text-amber-100/80 mt-1">From active order forms</div>
                        </div>

                        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-6 rounded-2xl text-white shadow-lg transform hover:-translate-y-1 transition-all duration-300">
                            <div className="flex justify-between items-center">
                                <span className="text-cyan-100 text-xs font-bold uppercase tracking-wider">Total Quotation Value</span>
                                <CreditCard size={24} className="text-cyan-100" />
                            </div>
                            <div className="text-2xl lg:text-3xl font-black mt-2">
                                ₹{totalQuotationValue.toFixed(2)}
                            </div>
                            <div className="text-xs text-cyan-100/80 mt-1">From active quotations</div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-2xl text-white shadow-lg transform hover:-translate-y-1 transition-all duration-300">
                            <div className="flex justify-between items-center">
                                <span className="text-purple-100 text-xs font-bold uppercase tracking-wider">GST Paid (Purchases ITC)</span>
                                <Tag size={24} className="text-purple-100" />
                            </div>
                            <div className="text-2xl lg:text-3xl font-black mt-2">
                                ₹{purchasesGstPaid.toFixed(2)}
                            </div>
                            <div className="text-xs text-purple-100/80 mt-1">Paid on vendor received bills</div>
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
                                    Compare GST Collected on Sales (Output Tax) vs GST Paid on Purchases (Input Tax Credit / ITC).
                                </p>
                            </div>

                            {/* Year & Month Filters */}
                            <div className="flex items-center space-x-3 w-full sm:w-auto">
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
                            <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-100 relative">
                                <div className="flex justify-between items-center text-blue-900">
                                    <span className="text-xs font-bold uppercase tracking-wider">GST Collected (Sales Output)</span>
                                    <ArrowUpRight size={20} className="text-blue-600" />
                                </div>
                                <div className="text-2xl font-black text-blue-900 mt-2">
                                    ₹{salesGstCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-[11px] text-blue-700 font-medium mt-1">
                                    From {filteredSalesInvoices.length} created sales invoices (Total: ₹{filteredSalesTotal.toLocaleString('en-IN')})
                                </div>
                            </div>

                            {/* Purchases Input GST (ITC) */}
                            <div className="bg-purple-50/60 p-5 rounded-2xl border border-purple-100 relative">
                                <div className="flex justify-between items-center text-purple-900">
                                    <span className="text-xs font-bold uppercase tracking-wider">GST Paid (Purchases / ITC)</span>
                                    <ArrowDownRight size={20} className="text-purple-600" />
                                </div>
                                <div className="text-2xl font-black text-purple-900 mt-2">
                                    ₹{purchasesGstPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-[11px] text-purple-700 font-medium mt-1">
                                    From {filteredPurchaseInvoices.length} received bills with GST (Total: ₹{filteredPurchasesTotal.toLocaleString('en-IN')})
                                </div>
                            </div>

                            {/* Net Settlement Result */}
                            <div className={`p-5 rounded-2xl border relative ${
                                netGstPayable > 0 
                                    ? 'bg-amber-50/80 border-amber-200 text-amber-900' 
                                    : netGstPayable < 0 
                                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
                                    : 'bg-gray-50 border-gray-200 text-gray-800'
                            }`}>
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
                                <div className="text-[11px] font-semibold mt-1">
                                    {netGstPayable > 0 
                                        ? 'Output GST exceeds ITC. Amount to be paid to Government.' 
                                        : netGstPayable < 0 
                                        ? `Excess Input Credit (ITC) of ₹${Math.abs(netGstPayable).toFixed(2)} carries forward to next month.` 
                                        : 'GST liability is fully set-off.'}
                                </div>
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
            )}
        </div>
    );
};

export default Dashboard;
