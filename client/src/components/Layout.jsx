import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FilePlus, Menu, X, LogOut, User } from 'lucide-react';

const Layout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user')) || {});

    useEffect(() => {
        const handleStorageChange = () => {
            setUser(JSON.parse(localStorage.getItem('user')) || {});
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const officeName = user.office_name || 'INVOICE DASHBOARD';
    const username = user.username || 'Admin';

    // Verify if profile is incomplete
    const isProfileIncomplete = !user.office_address || !user.office_gstin || !user.office_email || !user.office_mobile || !user.office_state;

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={toggleSidebar}
                ></div>
            )}

            {/* Sidebar */}
            <div className={`
                fixed md:static inset-y-0 left-0 z-50 w-64 bg-dark text-gray-900 flex flex-col transform transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
            `}>
                <div className="p-6 border-b border-white/50 flex justify-between items-center">
                    <h1 className="text-lg font-black uppercase tracking-wider text-primary truncate" title={officeName}>
                        {officeName}
                    </h1>
                    <button onClick={toggleSidebar} className="md:hidden text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <Link
                        to="/"
                        onClick={() => setIsSidebarOpen(false)}
                        className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${location.pathname === '/' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-white hover:shadow-sm'}`}
                    >
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </Link>
                    <Link
                        to={isProfileIncomplete ? "/profile" : "/create"}
                        onClick={() => setIsSidebarOpen(false)}
                        className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${location.pathname === '/create' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-white hover:shadow-sm'} ${isProfileIncomplete ? 'opacity-60' : ''}`}
                    >
                        <FilePlus size={20} />
                        <span>New Invoice</span>
                    </Link>
                    <Link
                        to="/profile"
                        onClick={() => setIsSidebarOpen(false)}
                        className={`flex items-center justify-between p-3 rounded-lg transition-colors ${location.pathname === '/profile' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-white hover:shadow-sm'}`}
                    >
                        <div className="flex items-center space-x-3">
                            <User size={20} />
                            <span>My Office Details</span>
                        </div>
                        {isProfileIncomplete && (
                            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" title="Details required!"></span>
                        )}
                    </Link>
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="bg-white shadow-sm p-4 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <button onClick={toggleSidebar} className="md:hidden text-gray-600">
                            <Menu size={24} />
                        </button>
                        <h2 className="text-lg md:text-xl font-semibold text-gray-800 truncate">
                            {location.pathname === '/' ? 'Dashboard' : location.pathname === '/create' ? 'Create Invoice' : location.pathname === '/profile' ? 'My Office Details' : 'Invoice Preview'}
                        </h2>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="text-xs md:text-sm text-gray-500 hidden sm:inline">Welcome, <strong>{username}</strong></span>
                        <button 
                            onClick={handleLogout}
                            className="flex items-center space-x-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-semibold transition-colors"
                        >
                            <LogOut size={14} />
                            <span>Logout</span>
                        </button>
                    </div>
                </header>
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
