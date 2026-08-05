import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Save } from 'lucide-react';

const CreateInvoice = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        invoice_number: `INV-${Date.now()}`,
        customer_name: '',
        customer_address: '',
        customer_email: '',
        invoice_date: new Date().toISOString().split('T')[0],
        gstin: '',
        cgst_rate: 9,
        sgst_rate: 9,
        igst_rate: 0,
        round_off: 0,
        items: [
            { description: '', hsn_sac: '', quantity: '', unit: '1', price_per_unit: '', amount: 0 }
        ]
    });

    const calculateItemAmount = (item) => {
        return item.quantity * item.price_per_unit;
    };

    const [savedCustomers, setSavedCustomers] = React.useState([]);
    const [savedProducts, setSavedProducts] = React.useState([]);

    React.useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            fetch(`${import.meta.env.VITE_API_URL}/api/customers`, {
                headers: { 'x-user-id': user.id }
            })
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setSavedCustomers(data);
                })
                .catch(err => console.error('Error fetching customers:', err));

            fetch(`${import.meta.env.VITE_API_URL}/api/products`, {
                headers: { 'x-user-id': user.id }
            })
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setSavedProducts(data);
                })
                .catch(err => console.error('Error fetching products:', err));
        }
    }, []);

    const handleCustomerNameChange = (val) => {
        const matchingCustomer = savedCustomers.find(c => c.name.trim().toLowerCase() === val.trim().toLowerCase());
        if (matchingCustomer) {
            setFormData(prev => ({
                ...prev,
                customer_name: val,
                gstin: matchingCustomer.gstin || prev.gstin,
                customer_email: matchingCustomer.email || prev.customer_email,
                customer_address: matchingCustomer.billing_address || prev.customer_address
            }));
        } else {
            setFormData(prev => ({ ...prev, customer_name: val }));
        }
    };

    const handleSelectSavedCustomer = (e) => {
        const custId = e.target.value;
        if (!custId) return;
        const selected = savedCustomers.find(c => String(c.id) === String(custId));
        if (selected) {
            setFormData(prev => ({
                ...prev,
                customer_name: selected.name || '',
                gstin: selected.gstin || '',
                customer_email: selected.email || '',
                customer_address: selected.billing_address || ''
            }));
        }
    };

    // Fetch existing invoice if editing
    React.useEffect(() => {
        if (id) {
            setLoading(true);
            const user = JSON.parse(localStorage.getItem('user'));
            fetch(`${import.meta.env.VITE_API_URL}/api/invoices/${id}`, {
                headers: { 'x-user-id': user ? user.id : '' }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.invoice_date) {
                        data.invoice_date = data.invoice_date.split('T')[0];
                    }
                    if (!data.items || data.items.length === 0) {
                        data.items = [{ description: '', hsn_sac: '', quantity: '', unit: '1', price_per_unit: '', amount: 0 }];
                    }
                    setFormData(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Failed to fetch invoice", err);
                    setLoading(false);
                });
        }
    }, [id]);

    const [financialYearInfo, setFinancialYearInfo] = useState({ short: '', full: '' });

    // Fetch next invoice number when date changes (only if creating)
    React.useEffect(() => {
        if (id) return;
        const fetchNextNumber = async () => {
            try {
                const dateParam = formData.invoice_date;
                const user = JSON.parse(localStorage.getItem('user'));
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/invoices/next-number?date=${dateParam}`, {
                    headers: { 'x-user-id': user ? user.id : '' }
                });
                if (res.ok) {
                    const data = await res.json();
                    setFormData(prev => ({ ...prev, invoice_number: data.nextNumber }));
                    setFinancialYearInfo({
                        short: data.financialYear || '',
                        full: data.financialYearFull || ''
                    });
                }
            } catch (err) {
                console.error("Failed to fetch next invoice number", err);
            }
        };
        fetchNextNumber();
    }, [formData.invoice_date, id]);

    // GSTIN Auto-fill Logic
    const [lookupLoading, setLookupLoading] = React.useState(false);

    React.useEffect(() => {
        const lookupGSTIN = async () => {
            const gstin = formData.gstin.trim().toUpperCase();
            if (gstin.length === 15) {
                setLookupLoading(true);
                try {
                    const user = JSON.parse(localStorage.getItem('user'));
                    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/invoices/customer-lookup/${gstin}`, {
                        headers: { 'x-user-id': user ? user.id : '' }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setFormData(prev => ({
                            ...prev,
                            customer_name: data.customer_name,
                            customer_address: data.customer_address,
                            customer_email: data.customer_email || ''
                        }));
                    }
                } catch (err) {
                    console.error("GSTIN History Lookup failed", err);
                } finally {
                    setLookupLoading(false);
                }
            }
        };

        const timeoutId = setTimeout(lookupGSTIN, 500);
        return () => clearTimeout(timeoutId);
    }, [formData.gstin]);

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;

        if (field === 'description' && value) {
            const matchingProd = savedProducts.find(p => p.name.trim().toLowerCase() === value.trim().toLowerCase());
            if (matchingProd) {
                if (matchingProd.hsn_sac) newItems[index].hsn_sac = matchingProd.hsn_sac;
                if (matchingProd.unit) newItems[index].unit = matchingProd.unit;
                if (matchingProd.price_per_unit) newItems[index].price_per_unit = matchingProd.price_per_unit;
            }
        }

        // Recalculate amount
        newItems[index].amount = calculateItemAmount(newItems[index]);

        setFormData({ ...formData, items: newItems });
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { description: '', hsn_sac: '', quantity: '', unit: '1', price_per_unit: '', amount: 0 }]
        });
    };

    const removeItem = (index) => {
        if (formData.items.length > 1) {
            const newItems = formData.items.filter((_, i) => i !== index);
            setFormData({ ...formData, items: newItems });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const subtotal = formData.items.reduce((sum, item) => sum + item.amount, 0);
        const cgst_amount = (subtotal * formData.cgst_rate) / 100;
        const sgst_amount = (subtotal * formData.sgst_rate) / 100;
        const igst_amount = (subtotal * formData.igst_rate) / 100;
        const total_amount = subtotal + cgst_amount + sgst_amount + igst_amount + (Number(formData.round_off) || 0);

        const payload = { 
            ...formData, 
            subtotal,
            cgst_amount,
            sgst_amount,
            igst_amount,
            total_amount 
        };

        try {
            const endpoint = id ? `${import.meta.env.VITE_API_URL}/api/invoices/${id}` : `${import.meta.env.VITE_API_URL}/api/invoices`;
            const method = id ? 'PUT' : 'POST';
            const user = JSON.parse(localStorage.getItem('user'));
            const res = await fetch(endpoint, {
                method: method,
                headers: { 
                    'Content-Type': 'application/json',
                    'x-user-id': user ? user.id : ''
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                // Navigate to preview page with auto-download flag in URL
                navigate(`/invoice/${data.id}?autoDownload=true`);
            } else {
                alert('Failed to save invoice');
            }
        } catch (err) {
            console.error(err);
            alert('Error saving invoice');
        } finally {
            setLoading(false);
        }
    };

    const subtotal = formData.items.reduce((sum, item) => sum + item.amount, 0);
    const cgstAmount = (subtotal * formData.cgst_rate) / 100;
    const sgstAmount = (subtotal * formData.sgst_rate) / 100;
    const igstAmount = (subtotal * formData.igst_rate) / 100;
    const totalAmount = subtotal + cgstAmount + sgstAmount + igstAmount + (Number(formData.round_off) || 0);

    const user = JSON.parse(localStorage.getItem('user')) || {};
    const isProfileIncomplete = !user.office_address || !user.office_gstin || !user.office_email || !user.office_mobile || !user.office_state;

    if (isProfileIncomplete) {
        return (
            <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg border border-amber-200 text-center space-y-6">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-gray-800">Office Setup Required</h3>
                    <p className="text-sm text-gray-500">
                        You must complete your office details (address, GSTIN, mobile, state, etc.) before you can create or edit invoices.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/profile')}
                    className="w-full bg-primary hover:bg-secondary text-white py-2.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
                >
                    Set Up Office Details
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto bg-white p-4 md:p-8 rounded-xl shadow-md border border-gray-100">
            <h2 className="text-xl md:text-2xl font-bold mb-6 text-gray-800">{id ? 'Edit Invoice' : 'Create New Invoice'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Customer Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                        <input
                            required
                            type="text"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            value={formData.invoice_number}
                            onChange={e => setFormData({ ...formData, invoice_number: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input
                            required
                            type="date"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            value={formData.invoice_date}
                            onChange={e => setFormData({ ...formData, invoice_date: e.target.value })}
                        />
                        {financialYearInfo.short && (
                            <div className="mt-1 text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-md flex items-center justify-between">
                                <span>📅 FY {financialYearInfo.short} ({financialYearInfo.full})</span>
                                <span className="font-semibold text-indigo-900">Resets on Apr 1</span>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                        <input
                            required
                            type="text"
                            list="customer-suggestions"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            value={formData.customer_name}
                            onChange={e => handleCustomerNameChange(e.target.value)}
                            placeholder="Type or select customer..."
                        />
                        <datalist id="customer-suggestions">
                            {savedCustomers.map(c => (
                                <option key={c.id} value={c.name}>{c.mobile ? `Mobile: ${c.mobile}` : ''}</option>
                            ))}
                        </datalist>
                    </div>
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Customer GSTIN</label>
                        <input
                            type="text"
                            placeholder="Enter 15-digit GSTIN"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent uppercase"
                            value={formData.gstin}
                            onChange={e => setFormData({ ...formData, gstin: e.target.value })}
                        />
                        {lookupLoading && (
                            <div className="absolute right-3 top-9 text-xs text-primary animate-pulse">Searching...</div>
                        )}
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email</label>
                        <input
                            type="email"
                            placeholder="customer@example.com"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            value={formData.customer_email}
                            onChange={e => setFormData({ ...formData, customer_email: e.target.value })}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <textarea
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            rows="3"
                            value={formData.customer_address}
                            onChange={e => setFormData({ ...formData, customer_address: e.target.value })}
                        />
                    </div>
                </div>

                {/* Items */}
                <div>
                    <h3 className="text-lg font-medium text-gray-700 mb-3">Items</h3>
                    <div className="space-y-4">
                        {formData.items.map((item, index) => (
                            <div key={index} className="flex flex-col gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 relative">
                                <button
                                    type="button"
                                    onClick={() => removeItem(index)}
                                    className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-50 rounded md:static md:mt-5 md:hidden"
                                >
                                    <Trash2 size={18} />
                                </button>
                                
                                <div className="flex flex-col md:flex-row gap-4 items-start w-full">
                                    <div className="grid grid-cols-2 md:flex gap-4 w-full md:w-auto">
                                        <div className="w-full md:w-20">
                                            <label className="text-xs text-gray-500 font-bold block mb-1">Qty</label>
                                            <input
                                                type="number"
                                                className="w-full p-2 border rounded"
                                                value={item.quantity}
                                                onChange={e => handleItemChange(index, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex-1 w-full space-y-2">
                                        <label className="text-xs text-gray-500 font-bold block md:mb-1">Item Description</label>
                                        <input
                                            placeholder="Type or select product..."
                                            list="product-suggestions"
                                            className="w-full p-2 border rounded"
                                            value={item.description}
                                            onChange={e => handleItemChange(index, 'description', e.target.value)}
                                        />
                                        <datalist id="product-suggestions">
                                            {savedProducts.map(p => (
                                                <option key={p.id} value={p.name}>{p.hsn_sac ? `HSN: ${p.hsn_sac}` : ''}</option>
                                            ))}
                                        </datalist>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:flex gap-4 w-full md:w-auto">
                                        <div className="w-full md:w-32">
                                            <label className="text-xs text-gray-500 font-bold block mb-1">HSN/SAC</label>
                                            <input
                                                placeholder="HSN/SAC"
                                                className="w-full p-2 border rounded"
                                                value={item.hsn_sac}
                                                onChange={e => handleItemChange(index, 'hsn_sac', e.target.value)}
                                            />
                                        </div>
                                        <div className="w-full md:w-20">
                                            <label className="text-xs text-gray-500 font-bold block mb-1">Unit</label>
                                            <input
                                                type="text"
                                                className="w-full p-2 border rounded"
                                                value={item.unit}
                                                onChange={e => handleItemChange(index, 'unit', e.target.value)}
                                            />
                                        </div>
                                        <div className="w-full md:w-28">
                                            <label className="text-xs text-gray-500 font-bold block mb-1">Price/Unit</label>
                                            <input
                                                type="number"
                                                className="w-full p-2 border rounded"
                                                value={item.price_per_unit}
                                                onChange={e => handleItemChange(index, 'price_per_unit', e.target.value === '' ? '' : Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="w-full md:w-32 text-right">
                                            <label className="text-xs text-gray-500 font-bold block mb-1">Total</label>
                                            <span className="font-bold text-gray-700 block mt-2">₹{(item.amount || 0).toFixed(2)}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="hidden md:block p-2 text-red-500 hover:bg-red-50 rounded mt-5"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={addItem}
                        className="mt-4 flex items-center space-x-2 text-primary hover:text-blue-700 font-medium"
                    >
                        <Plus size={20} />
                        <span>Add Item</span>
                    </button>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 flex flex-col items-end gap-4">
                    <div className="w-full md:w-1/3 space-y-3">
                        <div className="flex justify-between items-center text-gray-600">
                            <span>Subtotal</span>
                            <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center gap-4">
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600">CGST (%)</label>
                                <input 
                                    type="number" 
                                    className="w-16 p-1 border rounded text-right"
                                    value={formData.cgst_rate}
                                    onChange={e => setFormData({ ...formData, cgst_rate: Number(e.target.value) })}
                                />
                            </div>
                            <span className="font-semibold text-gray-700">₹{cgstAmount.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between items-center gap-4">
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600">SGST (%)</label>
                                <input 
                                    type="number" 
                                    className="w-16 p-1 border rounded text-right"
                                    value={formData.sgst_rate}
                                    onChange={e => setFormData({ ...formData, sgst_rate: Number(e.target.value) })}
                                />
                            </div>
                            <span className="font-semibold text-gray-700">₹{sgstAmount.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between items-center gap-4">
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600">IGST (%)</label>
                                <input 
                                    type="number" 
                                    className="w-16 p-1 border rounded text-right"
                                    value={formData.igst_rate}
                                    onChange={e => setFormData({ ...formData, igst_rate: Number(e.target.value) })}
                                />
                            </div>
                            <span className="font-semibold text-gray-700">₹{igstAmount.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between items-center gap-4">
                            <span className="text-sm text-gray-600">Round Off</span>
                            <input 
                                type="number" 
                                step="0.01"
                                className="w-24 p-1 border rounded text-right"
                                value={formData.round_off}
                                onChange={e => setFormData({ ...formData, round_off: e.target.value })}
                            />
                        </div>

                        <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between items-center">
                            <div className="text-lg font-bold text-gray-800">Grand Total</div>
                            <div className="text-3xl font-black text-primary">₹{totalAmount.toFixed(2)}</div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 shadow-md flex items-center space-x-2"
                    >
                        <Save size={20} />
                        <span>{loading ? 'Saving...' : 'Save Invoice'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateInvoice;
