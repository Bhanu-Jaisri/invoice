import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FilePlus, Receipt, Menu, X } from 'lucide-react';

const Layout = () => {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

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
                    <h1 className="text-xl font-bold text-primary">NRG JAISRI PRINTERS</h1>
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
                        to="/create"
                        onClick={() => setIsSidebarOpen(false)}
                        className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${location.pathname === '/create' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-white hover:shadow-sm'}`}
                    >
                        <FilePlus size={20} />
                        <span>New Invoice</span>
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
                            {location.pathname === '/' ? 'Dashboard' : location.pathname === '/create' ? 'Create Invoice' : 'Invoice Preview'}
                        </h2>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="text-xs md:text-sm text-gray-500 hidden sm:inline">Welcome, Admin</span>
                    </div>
                </header>
                <main className="flex-1 overflow-auto p-4 md:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
