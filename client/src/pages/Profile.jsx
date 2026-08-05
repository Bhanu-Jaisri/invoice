import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, MapPin, CreditCard, Mail, Phone, Map, Edit3, X, Palette, Landmark, FileText } from 'lucide-react';
import { THEMES, applyTheme } from '../utils/theme';

const Profile = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        office_name: '',
        office_address: '',
        office_gstin: '',
        office_email: '',
        office_mobile: '',
        office_state: '',
        office_theme: 'blue',
        bank_name: '',
        bank_branch: '',
        account_name: '',
        account_no: '',
        ifsc_code: '',
        terms_conditions: ''
    });
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchProfile = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                navigate('/login');
                return;
            }

            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/profile`, {
                headers: { 'x-user-id': user.id }
            });

            if (res.ok) {
                const data = await res.json();
                setFormData({
                    office_name: data.office_name || '',
                    office_address: data.office_address || '',
                    office_gstin: data.office_gstin || '',
                    office_email: data.office_email || '',
                    office_mobile: data.office_mobile || '',
                    office_state: data.office_state || '',
                    office_theme: data.office_theme || 'blue',
                    bank_name: data.bank_name || '',
                    bank_branch: data.bank_branch || '',
                    account_name: data.account_name || '',
                    account_no: data.account_no || '',
                    ifsc_code: data.ifsc_code || '',
                    terms_conditions: data.terms_conditions || ''
                });

                // Apply theme locally
                applyTheme(data.office_theme || 'blue');

                // If profile is incomplete, force editing mode
                const isIncomplete = !data.office_address || !data.office_gstin || !data.office_email || !data.office_mobile || !data.office_state;
                setIsEditing(isIncomplete);
            } else {
                setError('Failed to load profile details');
            }
        } catch (err) {
            console.error(err);
            setError('Failed to connect to the server');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSaving(true);

        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('user', JSON.stringify(data.user));
                setSuccess('Office profile updated successfully!');
                setIsEditing(false); // Toggle back to read-only view
                applyTheme(data.user.office_theme); // Apply the saved theme immediately
                window.dispatchEvent(new Event('storage'));
            } else {
                setError(data.error || 'Failed to update profile');
            }
        } catch (err) {
            console.error(err);
            setError('Failed to save profile');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        const user = JSON.parse(localStorage.getItem('user')) || {};
        const isComplete = user.office_address && user.office_gstin && user.office_email && user.office_mobile && user.office_state;
        if (isComplete) {
            setIsEditing(false);
            setError('');
            setSuccess('');
            fetchProfile(); // Revert any unsaved changes
        } else {
            setError('You must save your office details first.');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-gray-500">Loading office details...</div>
            </div>
        );
    }

    // Read-only View
    if (!isEditing) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-md border border-gray-100">
                    <div className="border-b border-gray-100 pb-4 mb-6 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">My Office Details</h2>
                            <p className="text-sm text-gray-500 mt-1">These details are used on all generated invoices.</p>
                        </div>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="bg-primary hover:bg-secondary text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center space-x-1.5"
                        >
                            <Edit3 size={16} />
                            <span>Edit Details</span>
                        </button>
                    </div>

                    {success && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-6 text-center">
                            {success}
                        </div>
                    )}

                    <div className="space-y-6">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4">
                                <div className="p-2 bg-blue-50 text-primary rounded-lg shrink-0">
                                    <Building size={20} />
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-400 font-semibold uppercase">Office Name</span>
                                    <span className="text-base font-bold text-gray-800">{formData.office_name}</span>
                                </div>
                            </div>

                            <div className="flex items-start space-x-4">
                                <div className="p-2 bg-blue-50 text-primary rounded-lg shrink-0">
                                    <Palette size={20} />
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-400 font-semibold uppercase">Color Theme</span>
                                    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mt-1 ${THEMES[formData.office_theme]?.badgeClass || 'bg-blue-50 text-blue-700'}`}>
                                        {THEMES[formData.office_theme]?.name || 'Modern Blue'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start space-x-4">
                            <div className="p-2 bg-blue-50 text-primary rounded-lg shrink-0">
                                <MapPin size={20} />
                            </div>
                            <div>
                                <span className="block text-xs text-gray-400 font-semibold uppercase">Address</span>
                                <span className="text-sm text-gray-750 whitespace-pre-line leading-relaxed">{formData.office_address}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-start space-x-4">
                                <div className="p-2 bg-blue-50 text-primary rounded-lg shrink-0">
                                    <CreditCard size={20} />
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-400 font-semibold uppercase">GSTIN</span>
                                    <span className="text-sm font-bold text-gray-800 uppercase">{formData.office_gstin}</span>
                                </div>
                            </div>

                            <div className="flex items-start space-x-4">
                                <div className="p-2 bg-blue-50 text-primary rounded-lg shrink-0">
                                    <Map size={20} />
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-400 font-semibold uppercase">State</span>
                                    <span className="text-sm text-gray-700">{formData.office_state}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-start space-x-4">
                                <div className="p-2 bg-blue-50 text-primary rounded-lg shrink-0">
                                    <Mail size={20} />
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-400 font-semibold uppercase">Email</span>
                                    <span className="text-sm text-gray-700">{formData.office_email}</span>
                                </div>
                            </div>

                            <div className="flex items-start space-x-4">
                                <div className="p-2 bg-blue-50 text-primary rounded-lg shrink-0">
                                    <Phone size={20} />
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-400 font-semibold uppercase">Mobile Number</span>
                                    <span className="text-sm text-gray-750">{formData.office_mobile}</span>
                                </div>
                            </div>
                        </div>

                        {/* Bank Details Display Card */}
                        <div className="border-t border-gray-100 pt-5">
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center space-x-2">
                                <Landmark size={18} className="text-primary" />
                                <span>Bank Account Details</span>
                            </h3>
                            <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-150 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="text-gray-400 font-semibold uppercase block text-[10px]">Bank Name</span>
                                    <span className="font-bold text-gray-800">{formData.bank_name || 'Not provided'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 font-semibold uppercase block text-[10px]">Branch</span>
                                    <span className="font-bold text-gray-800">{formData.bank_branch || 'Not provided'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 font-semibold uppercase block text-[10px]">Account Name</span>
                                    <span className="font-bold text-gray-800">{formData.account_name || 'Not provided'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 font-semibold uppercase block text-[10px]">A/c Number</span>
                                    <span className="font-bold text-gray-800">{formData.account_no || 'Not provided'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 font-semibold uppercase block text-[10px]">IFSC Code</span>
                                    <span className="font-bold text-gray-800 uppercase">{formData.ifsc_code || 'Not provided'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Terms & Conditions Display Card */}
                        <div className="border-t border-gray-100 pt-5">
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3 flex items-center space-x-2">
                                <FileText size={18} className="text-primary" />
                                <span>Terms & Conditions</span>
                            </h3>
                            <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-150 text-xs text-gray-700 whitespace-pre-line leading-relaxed">
                                {formData.terms_conditions || 'No terms & conditions specified'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Editable Form View
    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-md border border-gray-100">
                <div className="border-b border-gray-100 pb-4 mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Edit Office Details</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Please save changes to update office headers, bank details, and terms on your invoices.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Office / Company Name</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                <Building size={18} />
                            </span>
                            <input
                                required
                                name="office_name"
                                type="text"
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="Enter office name"
                                value={formData.office_name}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Office Address</label>
                        <div className="relative">
                            <span className="absolute top-3 left-3 text-gray-400">
                                <MapPin size={18} />
                            </span>
                            <textarea
                                required
                                name="office_address"
                                rows="3"
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                                placeholder="Enter full office address"
                                value={formData.office_address}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">GSTIN Number</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                    <CreditCard size={18} />
                                </span>
                                <input
                                    required
                                    name="office_gstin"
                                    type="text"
                                    maxLength="15"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all uppercase"
                                    placeholder="15-digit GSTIN"
                                    value={formData.office_gstin}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">State</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                    <Map size={18} />
                                </span>
                                <input
                                    required
                                    name="office_state"
                                    type="text"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    placeholder="e.g. Tamil Nadu"
                                    value={formData.office_state}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                    <Mail size={18} />
                                </span>
                                <input
                                    required
                                    name="office_email"
                                    type="email"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    placeholder="office@example.com"
                                    value={formData.office_email}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Mobile Number</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                    <Phone size={18} />
                                </span>
                                <input
                                    required
                                    name="office_mobile"
                                    type="tel"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    placeholder="e.g. 9842719397"
                                    value={formData.office_mobile}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bank Details Form Section */}
                    <div className="border-t border-gray-200 pt-5 space-y-4">
                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center space-x-2">
                            <Landmark size={18} className="text-primary" />
                            <span>Bank Account Details</span>
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Name</label>
                                <input
                                    name="bank_name"
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    placeholder="e.g. TAMILNAD MERCANTILE BANK"
                                    value={formData.bank_name}
                                    onChange={handleChange}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Branch</label>
                                <input
                                    name="bank_branch"
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    placeholder="e.g. SIVAKASI"
                                    value={formData.bank_branch}
                                    onChange={handleChange}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Account Name</label>
                                <input
                                    name="account_name"
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    placeholder="e.g. NRG JAISRI PRINTERS"
                                    value={formData.account_name}
                                    onChange={handleChange}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">A/c Number</label>
                                <input
                                    name="account_no"
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    placeholder="e.g. 003150050802592"
                                    value={formData.account_no}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-gray-700 mb-1">IFSC Code</label>
                                <input
                                    name="ifsc_code"
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm uppercase focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    placeholder="e.g. TMBL0000003"
                                    value={formData.ifsc_code}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Terms & Conditions Form Section */}
                    <div className="border-t border-gray-200 pt-5">
                        <label className="block text-sm font-bold text-gray-800 uppercase tracking-wider mb-2 flex items-center space-x-2">
                            <FileText size={18} className="text-primary" />
                            <span>Terms & Conditions</span>
                        </label>
                        <textarea
                            name="terms_conditions"
                            rows="4"
                            className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder="Enter terms and conditions (one per line)"
                            value={formData.terms_conditions}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Color Theme Selector Grid */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-750 mb-2">
                            Dashboard & Invoice Theme
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {Object.entries(THEMES).map(([key, value]) => {
                                const isSelected = formData.office_theme === key;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, office_theme: key }))}
                                        className={`flex items-center space-x-2.5 p-3 border rounded-xl transition-all text-left ${
                                            isSelected 
                                                ? 'border-primary ring-2 ring-primary bg-gray-50' 
                                                : 'border-gray-200 hover:border-gray-300 bg-white'
                                        }`}
                                    >
                                        <span 
                                            className="w-5 h-5 rounded-full border border-black/10 shrink-0" 
                                            style={{ backgroundColor: value.primary }}
                                        />
                                        <span className="text-xs font-semibold text-gray-705 truncate">{value.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="flex items-center space-x-1 border border-gray-350 hover:bg-gray-55 text-gray-750 px-5 py-2.5 rounded-xl font-bold transition-all"
                        >
                            <X size={16} />
                            <span>Cancel</span>
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-primary hover:bg-secondary text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                        >
                            {saving ? 'Updating...' : 'Update Details'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Profile;
