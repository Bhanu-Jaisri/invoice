import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FilePlus, Menu, X, LogOut, User, FileText, ShoppingBag, Users, Package, FileUp, Building2 } from 'lucide-react';
import { applyTheme } from '../utils/theme';

const Layout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        const saved = localStorage.getItem('sidebar_open');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user')) || {});

    useEffect(() => {
        const handleStorageChange = () => {
            const currentUser = JSON.parse(localStorage.getItem('user')) || {};
            setUser(currentUser);
            if (currentUser.office_theme) {
                applyTheme(currentUser.office_theme);
            }
        };
        window.addEventListener('storage', handleStorageChange);
        handleStorageChange();
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const toggleSidebar = () => {
        setIsSidebarOpen(prev => {
            const next = !prev;
            localStorage.setItem('sidebar_open', JSON.stringify(next));
            return next;
        });
    };

    const officeName = user.office_name || 'INVOICE DASHBOARD';
    const username = user.username || 'Admin';

    const isProfileIncomplete = !user.office_address || !user.office_gstin || !user.office_email || !user.office_mobile || !user.office_state;

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    const closeSidebarOnMobile = () => {
        if (window.innerWidth < 768) setIsSidebarOpen(false);
    };

    const isDashboardTab = (tab) => location.pathname === '/' && location.state?.activeTab === tab;

    const navCls = (active) =>
        `flex items-center space-x-3 p-3 rounded-lg transition-colors text-sm font-medium ${
            active ? 'bg-primary text-white shadow-sm' : 'text-gray-700 hover:bg-white hover:shadow-sm'
        }`;

    const divider = (
        <div className="py-1.5 mx-1">
            <div className="border-t border-gray-200/70" />
        </div>
    );

    return (
        <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">

            {/* Mobile overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={toggleSidebar}
                />
            )}

            {/* ── Sidebar ── */}
            <div className={`
                fixed md:static inset-y-0 left-0 z-50 bg-dark text-gray-900 flex flex-col
                transition-all duration-300 ease-in-out shrink-0
                ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 overflow-hidden'}
            `}>

                {/* Office name header */}
                <div className="p-5 border-b border-white/20 flex justify-between items-center shrink-0">
                    <h1 className="text-sm font-black uppercase tracking-wider text-primary truncate" title={officeName}>
                        {officeName}
                    </h1>
                    <button onClick={toggleSidebar} className="md:hidden text-gray-500 ml-2 shrink-0">
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">

                    {/* 1. Dashboard */}
                    <Link
                        to="/"
                        state={{ activeTab: 'overview' }}
                        onClick={closeSidebarOnMobile}
                        className={navCls(location.pathname === '/' && (!location.state?.activeTab || location.state?.activeTab === 'overview'))}
                    >
                        <LayoutDashboard size={18} />
                        <span>Dashboard</span>
                    </Link>

                    {/* 2. Tax Invoices */}
                    <Link
                        to="/"
                        state={{ activeTab: 'invoices' }}
                        onClick={closeSidebarOnMobile}
                        className={navCls(isDashboardTab('invoices'))}
                    >
                        <FileText size={18} />
                        <span>Tax Invoices</span>
                    </Link>

                    {/* 3. Quotations */}
                    <Link
                        to="/"
                        state={{ activeTab: 'quotations' }}
                        onClick={closeSidebarOnMobile}
                        className={navCls(isDashboardTab('quotations'))}
                    >
                        <FilePlus size={18} />
                        <span>Quotations</span>
                    </Link>

                    {/* 4. Order Forms */}
                    <Link
                        to="/"
                        state={{ activeTab: 'orders' }}
                        onClick={closeSidebarOnMobile}
                        className={navCls(isDashboardTab('orders'))}
                    >
                        <ShoppingBag size={18} />
                        <span>Order Forms</span>
                    </Link>

                    {divider}

                    {/* 5. Customers */}
                    <Link
                        to="/customers"
                        onClick={closeSidebarOnMobile}
                        className={navCls(location.pathname === '/customers')}
                    >
                        <Users size={18} />
                        <span>Customers</span>
                    </Link>

                    {/* 6. Products */}
                    <Link
                        to="/products"
                        onClick={closeSidebarOnMobile}
                        className={navCls(location.pathname === '/products')}
                    >
                        <Package size={18} />
                        <span>Products</span>
                    </Link>

                    {/* 7. Received Invoices */}
                    <Link
                        to="/received-invoices"
                        onClick={closeSidebarOnMobile}
                        className={navCls(location.pathname === '/received-invoices')}
                    >
                        <FileUp size={18} />
                        <span>Received Invoices</span>
                    </Link>

                    {/* 8. Received Vendors */}
                    <Link
                        to="/vendors"
                        onClick={closeSidebarOnMobile}
                        className={navCls(location.pathname === '/vendors')}
                    >
                        <Building2 size={18} />
                        <span>Received Vendors</span>
                    </Link>

                    {divider}

                    {/* 9. My Office Details */}
                    <Link
                        to="/profile"
                        onClick={closeSidebarOnMobile}
                        className={`${navCls(location.pathname === '/profile')} justify-between`}
                    >
                        <div className="flex items-center space-x-3">
                            <User size={18} />
                            <span>My Office Details</span>
                        </div>
                        {isProfileIncomplete && (
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shrink-0" title="Details required!" />
                        )}
                    </Link>

                </nav>

                {/* 10. Logout – pinned to bottom */}
                <div className="p-3 border-t border-white/20 shrink-0">
                    <div className="px-3 pb-2">
                        <p className="text-[10px] text-gray-400">Logged in as</p>
                        <p className="text-xs font-bold text-gray-700 truncate">{username}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-3 p-3 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>

            </div>

            {/* ── Main content ── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* Top header */}
                <header className="bg-white shadow-sm px-4 py-3 flex justify-between items-center shrink-0">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={toggleSidebar}
                            className="text-gray-600 hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-gray-100"
                            title="Toggle Navigation"
                        >
                            <Menu size={22} />
                        </button>
                        <h2 className="text-base md:text-lg font-semibold text-gray-800 truncate">
                            {location.pathname === '/' && !location.state?.activeTab
                                ? 'Dashboard'
                                : location.state?.activeTab === 'invoices'
                                ? 'Tax Invoices'
                                : location.state?.activeTab === 'quotations'
                                ? 'Quotations'
                                : location.state?.activeTab === 'orders'
                                ? 'Order Forms'
                                : location.pathname.startsWith('/create-quotation')
                                ? 'Create Quotation'
                                : location.pathname.startsWith('/edit-quotation')
                                ? 'Edit Quotation'
                                : location.pathname.startsWith('/quotation')
                                ? 'Quotation Preview'
                                : location.pathname.startsWith('/create-order')
                                ? 'Create Order Form'
                                : location.pathname.startsWith('/edit-order')
                                ? 'Edit Order Form'
                                : location.pathname.startsWith('/order')
                                ? 'Order Preview'
                                : location.pathname.startsWith('/create')
                                ? 'Create Invoice'
                                : location.pathname.startsWith('/edit')
                                ? 'Edit Invoice'
                                : location.pathname === '/customers'
                                ? 'Customer Directory'
                                : location.pathname === '/products'
                                ? 'Product Directory'
                                : location.pathname === '/received-invoices'
                                ? 'Received Invoices (Purchases)'
                                : location.pathname === '/vendors'
                                ? 'Received Vendors'
                                : location.pathname === '/profile'
                                ? 'My Office Details'
                                : location.pathname.startsWith('/invoice')
                                ? 'Invoice Preview'
                                : 'Preview'}
                        </h2>
                    </div>
                    <span className="text-xs md:text-sm text-gray-500 hidden sm:inline">
                        Welcome, <strong>{username}</strong>
                    </span>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-auto p-4 md:p-6">
                    {isProfileIncomplete && location.pathname !== '/profile' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="text-sm text-amber-800">
                                <strong>⚠️ Profile Incomplete:</strong> Please fill in your office address, GSTIN, and contact details to enable invoice creation.
                            </div>
                            <Link
                                to="/profile"
                                className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-lg transition-colors shrink-0"
                            >
                                Setup Office Details
                            </Link>
                        </div>
                    )}
                    <Outlet />
                </main>

            </div>
        </div>
    );
};

export default Layout;
