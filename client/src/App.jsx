import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CreateInvoice from './pages/CreateInvoice';
import InvoicePreview from './pages/InvoicePreview';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import { applyTheme } from './utils/theme';

const ProtectedRoute = ({ children }) => {
    const user = localStorage.getItem('user');
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

function App() {
    React.useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.office_theme) {
            applyTheme(user.office_theme);
        } else {
            applyTheme('blue');
        }
    }, []);

    return (
        <Router>
            <Routes>
                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Main Protected Routes */}
                <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    <Route index element={<Dashboard />} />
                    <Route path="create" element={<CreateInvoice />} />
                    <Route path="edit/:id" element={<CreateInvoice />} />
                    <Route path="invoice/:id" element={<InvoicePreview />} />
                    <Route path="profile" element={<Profile />} />
                </Route>
            </Routes>
        </Router>
    );
}

export default App;
