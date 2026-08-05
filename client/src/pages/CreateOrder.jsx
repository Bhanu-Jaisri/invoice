import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams, useSearchParams } from 'react-router-dom';
import { Save, X, User, Mail, Phone, CreditCard, MapPin, Map, FileText, Settings, Plus, Trash2 } from 'lucide-react';

const CreateOrder = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const fromQuotationId = searchParams.get('from_quotation');

    const [user] = useState(() => JSON.parse(localStorage.getItem('user')) || {});
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        order_number: '',
        customer_name: '',
        customer_email: '',
        customer_mobile: '',
        gstin: '',
        customer_address: '',
        customer_state: '',
        order_date: new Date().toISOString().split('T')[0],
        source_quotation_id: null,
        approval_status: 'Pending',
        delivery_status: 'Not Delivered',
        calendars_delivered: 0,
        slips_delivered: 0,
        queries: '',
        payment_status: 'Not Received',
        payment_amount: ''
    });

    const [items, setItems] = useState([
        {
            id: Date.now(),
            item_category: 'Daily Calendar', // 'Daily Calendar', 'Monthly Calendar', 'Dairy', 'Other'
            custom_item_type: '',
            hsn_sac: '',
            quantity: 0,
            unit: '1',
            price_per_unit: '',
            gst_rate: 18,
            size: '',
            slip_number: '',
            if_spl: '',
            bottom_color: '',
            top_color: '',
            sheeter: '6 sheeter',
            designs: [{ design_number: '1', quantity: '' }],
            designs_total_qty: 0
        }
    ]);

    const isProfileIncomplete = !user.office_address || !user.office_gstin || !user.office_email || !user.office_mobile || !user.office_state;

    const [savedCustomers, setSavedCustomers] = useState([]);
    const [savedProducts, setSavedProducts] = useState([]);

    useEffect(() => {
        const u = JSON.parse(localStorage.getItem('user'));
        if (u) {
            fetch(`${import.meta.env.VITE_API_URL}/api/customers`, {
                headers: { 'x-user-id': u.id }
            })
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setSavedCustomers(data);
                })
                .catch(err => console.error('Error fetching customers:', err));

            fetch(`${import.meta.env.VITE_API_URL}/api/products`, {
                headers: { 'x-user-id': u.id }
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
                customer_mobile: matchingCustomer.mobile || prev.customer_mobile,
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
                customer_mobile: selected.mobile || '',
                gstin: selected.gstin || '',
                customer_email: selected.email || '',
                customer_address: selected.billing_address || ''
            }));
        }
    };

    // Fetch existing order if editing, or quotation if converting
    useEffect(() => {
        if (id) {
            setLoading(true);
            fetch(`${import.meta.env.VITE_API_URL}/api/orders/${id}`, {
                headers: { 'x-user-id': user ? user.id : '' }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.order_date) {
                        data.order_date = data.order_date.split('T')[0];
                    }
                    setFormData({
                        order_number: data.order_number || '',
                        customer_name: data.customer_name || '',
                        customer_email: data.customer_email || '',
                        customer_mobile: data.customer_mobile || '',
                        gstin: data.gstin || '',
                        customer_address: data.customer_address || '',
                        customer_state: data.customer_state || '',
                        order_date: data.order_date || new Date().toISOString().split('T')[0],
                        source_quotation_id: data.source_quotation_id || null,
                        approval_status: data.approval_status || 'Pending',
                        delivery_status: data.delivery_status || 'Not Delivered',
                        calendars_delivered: data.calendars_delivered || 0,
                        slips_delivered: data.slips_delivered || 0,
                        queries: data.queries || '',
                        payment_status: data.payment_status || 'Not Received',
                        payment_amount: data.payment_amount !== null && data.payment_amount !== undefined ? data.payment_amount : ''
                    });
                    if (data.items && data.items.length > 0) {
                        const mappedItems = data.items.map(item => {
                            let category = 'Other';
                            let custom_item_type = '';
                            if (item.item_type === 'Daily Calendar') {
                                category = 'Daily Calendar';
                            } else if (item.item_type === 'Monthly Calendar') {
                                category = 'Monthly Calendar';
                            } else if (item.item_type === 'Dairy') {
                                category = 'Dairy';
                            } else {
                                category = 'Other';
                                custom_item_type = item.item_type;
                            }
                            let parsedDesigns = null;
                            if (item.designs) {
                                if (typeof item.designs === 'string') {
                                    try {
                                        parsedDesigns = JSON.parse(item.designs);
                                    } catch (e) {
                                        parsedDesigns = null;
                                    }
                                } else if (Array.isArray(item.designs)) {
                                    parsedDesigns = item.designs;
                                }
                            }
                            return {
                                id: item.id || Math.random(),
                                item_category: category,
                                custom_item_type: custom_item_type,
                                hsn_sac: item.hsn_sac || '',
                                quantity: item.quantity,
                                unit: item.unit || '1',
                                price_per_unit: item.price_per_unit,
                                gst_rate: item.gst_rate,
                                size: item.size || '',
                                slip_number: item.slip_number || '',
                                if_spl: item.if_spl || '',
                                bottom_color: item.bottom_color || '',
                                top_color: item.top_color || '',
                                sheeter: item.sheeter || '6 sheeter',
                                designs: parsedDesigns || (category === 'Daily Calendar' ? [{ design_number: '1', quantity: '' }] : null),
                                designs_total_qty: item.designs_total_qty || (category === 'Daily Calendar' ? item.quantity : null)
                            };
                        });
                        setItems(mappedItems);
                    }
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Failed to fetch order", err);
                    setLoading(false);
                });
        } else if (fromQuotationId) {
            setLoading(true);
            fetch(`${import.meta.env.VITE_API_URL}/api/quotations/${fromQuotationId}`, {
                headers: { 'x-user-id': user ? user.id : '' }
            })
                .then(res => res.json())
                .then(data => {
                    setFormData(prev => ({
                        ...prev,
                        customer_name: data.customer_name || '',
                        customer_email: data.customer_email || '',
                        customer_mobile: data.customer_mobile || '',
                        gstin: data.gstin || '',
                        customer_address: data.customer_address || '',
                        customer_state: data.customer_state || '',
                        order_date: new Date().toISOString().split('T')[0],
                        source_quotation_id: parseInt(fromQuotationId, 10),
                        approval_status: data.approval_status || 'Pending',
                        delivery_status: data.delivery_status || 'Not Delivered',
                        calendars_delivered: data.calendars_delivered || 0,
                        slips_delivered: data.slips_delivered || 0,
                        queries: data.queries || '',
                        payment_status: data.payment_status || 'Not Received',
                        payment_amount: data.payment_amount !== null && data.payment_amount !== undefined ? data.payment_amount : ''
                    }));
                    if (data.items && data.items.length > 0) {
                        const mappedItems = data.items.map(item => {
                            let category = 'Other';
                            let custom_item_type = '';
                            if (item.item_type === 'Daily Calendar') {
                                category = 'Daily Calendar';
                            } else if (item.item_type === 'Monthly Calendar') {
                                category = 'Monthly Calendar';
                            } else if (item.item_type === 'Dairy') {
                                category = 'Dairy';
                            } else {
                                category = 'Other';
                                custom_item_type = item.item_type;
                            }
                            let parsedDesigns = null;
                            if (item.designs) {
                                if (typeof item.designs === 'string') {
                                    try {
                                        parsedDesigns = JSON.parse(item.designs);
                                    } catch (e) {
                                        parsedDesigns = null;
                                    }
                                } else if (Array.isArray(item.designs)) {
                                    parsedDesigns = item.designs;
                                }
                            }
                            return {
                                id: Math.random(),
                                item_category: category,
                                custom_item_type: custom_item_type,
                                hsn_sac: item.hsn_sac || '',
                                quantity: item.quantity,
                                unit: item.unit || '1',
                                price_per_unit: item.price_per_unit,
                                gst_rate: item.gst_rate,
                                size: item.size || '',
                                slip_number: item.slip_number || '',
                                if_spl: item.if_spl || '',
                                bottom_color: item.bottom_color || '',
                                top_color: item.top_color || '',
                                sheeter: item.sheeter || '6 sheeter',
                                designs: parsedDesigns || (category === 'Daily Calendar' ? [{ design_number: '1', quantity: '' }] : null),
                                designs_total_qty: item.designs_total_qty || (category === 'Daily Calendar' ? item.quantity : null)
                            };
                        });
                        setItems(mappedItems);
                    }
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Failed to fetch source quotation", err);
                    setLoading(false);
                });
        }
    }, [id, fromQuotationId, user.id]);

    // Fetch next sequence order number when date changes
    useEffect(() => {
        if (isProfileIncomplete || id) return;
        const fetchNextNumber = async () => {
            try {
                const dateParam = formData.order_date || '';
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/next-number?date=${dateParam}`, {
                    headers: { 'x-user-id': user.id }
                });
                if (res.ok) {
                    const data = await res.json();
                    setFormData(prev => ({ ...prev, order_number: data.nextNumber }));
                }
            } catch (err) {
                console.error('Failed to generate order sequence:', err);
            }
        };
        fetchNextNumber();
    }, [formData.order_date, user.id, isProfileIncomplete, id]);

    if (isProfileIncomplete) {
        return (
            <div className="max-w-md mx-auto my-12 bg-white rounded-2xl shadow-md border border-gray-150 p-6 text-center">
                <Settings className="mx-auto text-amber-500 mb-4 animate-spin-slow" size={48} />
                <h3 className="text-lg font-bold text-gray-800">Office Profile Incomplete</h3>
                <p className="text-gray-500 text-sm mt-2 mb-4">Please fill in your company details in your Profile before creating order forms.</p>
                <Link to="/profile" className="inline-block bg-primary hover:bg-secondary text-white font-semibold px-6 py-2 rounded-xl transition-all shadow-md hover:shadow-lg">Go to Profile</Link>
            </div>
        );
    }

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddItem = () => {
        setItems(prev => [
            ...prev,
            {
                id: Date.now() + Math.random(),
                item_category: 'Daily Calendar',
                custom_item_type: '',
                hsn_sac: '',
                quantity: 0,
                unit: '1',
                price_per_unit: '',
                gst_rate: 18,
                size: '',
                slip_number: '',
                if_spl: '',
                bottom_color: '',
                top_color: '',
                sheeter: '6 sheeter',
                designs: [{ design_number: '1', quantity: '' }],
                designs_total_qty: 0
            }
        ]);
    };

    const handleRemoveItem = (itemId) => {
        if (items.length === 1) return;
        setItems(prev => prev.filter(item => item.id !== itemId));
    };

    const handleItemChange = (index, field, value) => {
        setItems(prev => {
            const updated = [...prev];
            const currentItem = { ...updated[index] };

            if ((field === 'custom_item_type' || field === 'item_category') && value) {
                const matchingProd = savedProducts.find(p => p.name.trim().toLowerCase() === value.trim().toLowerCase());
                if (matchingProd) {
                    if (matchingProd.hsn_sac) currentItem.hsn_sac = matchingProd.hsn_sac;
                    if (matchingProd.unit) currentItem.unit = matchingProd.unit;
                    if (matchingProd.price_per_unit) currentItem.price_per_unit = matchingProd.price_per_unit;
                    if (matchingProd.gst_rate !== undefined) currentItem.gst_rate = matchingProd.gst_rate;
                }
            }

            if (field === 'item_category') {
                currentItem.item_category = value;
                if (value === 'Daily Calendar') {
                    currentItem.designs = [{ design_number: '1', quantity: '' }];
                    currentItem.designs_total_qty = 0;
                    currentItem.quantity = 0;
                    currentItem.gst_rate = 18;
                    currentItem.sheeter = '6 sheeter';
                } else if (value === 'Monthly Calendar') {
                    currentItem.designs = null;
                    currentItem.designs_total_qty = null;
                    currentItem.gst_rate = 18;
                    currentItem.sheeter = '6 sheeter';
                } else if (value === 'Dairy') {
                    currentItem.designs = null;
                    currentItem.designs_total_qty = null;
                    currentItem.gst_rate = 18;
                    currentItem.sheeter = '6 sheeter';
                } else {
                    currentItem.designs = null;
                    currentItem.designs_total_qty = null;
                    if (currentItem.gst_rate === undefined) currentItem.gst_rate = 0;
                    currentItem.sheeter = '6 sheeter';
                }
            } else {
                currentItem[field] = value;
            }

            updated[index] = currentItem;
            return updated;
        });
    };

    // Designs action handlers
    const handleAddDesign = (itemIndex) => {
        setItems(prev => {
            const updated = [...prev];
            const currentItem = { ...updated[itemIndex] };
            const currentDesigns = currentItem.designs ? [...currentItem.designs] : [];

            if (currentDesigns.length < 100) {
                const nextNo = currentDesigns.length + 1;
                currentDesigns.push({ design_number: String(nextNo), quantity: '' });
                currentItem.designs = currentDesigns;
                updated[itemIndex] = currentItem;
            }
            return updated;
        });
    };

    const handleRemoveDesign = (itemIndex, designIndex) => {
        setItems(prev => {
            const updated = [...prev];
            const currentItem = { ...updated[itemIndex] };
            const currentDesigns = currentItem.designs ? [...currentItem.designs] : [];

            if (currentDesigns.length > 1) {
                currentDesigns.splice(designIndex, 1);
                currentItem.designs = currentDesigns;

                // Re-calculate sum
                const sum = currentDesigns.reduce((acc, curr) => acc + (parseFloat(curr.quantity) || 0), 0);
                currentItem.designs_total_qty = sum;
                currentItem.quantity = sum;

                updated[itemIndex] = currentItem;
            }
            return updated;
        });
    };

    const handleDesignChange = (itemIndex, designIndex, field, value) => {
        setItems(prev => {
            const updated = [...prev];
            const currentItem = { ...updated[itemIndex] };
            const currentDesigns = currentItem.designs ? [...currentItem.designs] : [];

            if (currentDesigns[designIndex]) {
                currentDesigns[designIndex][field] = value;

                if (field === 'quantity') {
                    const sum = currentDesigns.reduce((acc, curr) => acc + (parseFloat(curr.quantity) || 0), 0);
                    currentItem.designs_total_qty = sum;
                    currentItem.quantity = sum;
                }

                currentItem.designs = currentDesigns;
                updated[itemIndex] = currentItem;
            }
            return updated;
        });
    };

    // Calculate subtotal, gst amounts and grand totals
    const calculateTotals = () => {
        let subtotal = 0;
        let cgst_amount = 0;
        let sgst_amount = 0;
        let igst_amount = 0;

        items.forEach(item => {
            const qty = parseFloat(item.quantity) || 0;
            const rate = parseFloat(item.price_per_unit) || 0;
            const itemSubtotal = qty * rate;
            subtotal += itemSubtotal;

            const gstRate = parseFloat(item.gst_rate) || 0;
            const gstAmt = (itemSubtotal * gstRate) / 100;

            const isInterstate = formData.customer_state && formData.customer_state.toLowerCase() !== user.office_state.toLowerCase();
            if (isInterstate) {
                igst_amount += gstAmt;
            } else {
                cgst_amount += gstAmt / 2;
                sgst_amount += gstAmt / 2;
            }
        });

        const total_amount = subtotal;
        return {
            subtotal,
            cgst_amount,
            sgst_amount,
            igst_amount,
            total_amount
        };
    };

    const totals = calculateTotals();
    const isSameState = !formData.customer_state || !user.office_state || formData.customer_state.toLowerCase() === user.office_state.toLowerCase();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            ...formData,
            ...totals,
            items
        };

        const url = id 
            ? `${import.meta.env.VITE_API_URL}/api/orders/${id}` 
            : `${import.meta.env.VITE_API_URL}/api/orders`;

        const method = id ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to save order form');
            }

            // Redirect to order preview page with autoDownload query param
            navigate(`/order/${data.orderId}?autoDownload=true`);
        } catch (err) {
            console.error(err);
            alert(err.message || 'Error occurred while saving order form');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-md border border-gray-100 space-y-6">
                <div className="border-b border-gray-100 pb-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">{id ? 'Edit Order Details' : 'Generate New Order'}</h2>
                        <p className="text-sm text-gray-500">Provide customer details and add item sets to generate order form.</p>
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-gray-400 font-bold block">Order Number</span>
                        <span className="text-sm font-bold text-primary">{formData.order_number || 'Generating...'}</span>
                    </div>
                </div>

                {/* Section 1: Customer Details */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Customer Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Customer Name *</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-405">
                                    <User size={16} />
                                </span>
                                <input
                                    required
                                    name="customer_name"
                                    type="text"
                                    list="order-customer-suggestions"
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    placeholder="Enter or select customer name"
                                    value={formData.customer_name}
                                    onChange={e => handleCustomerNameChange(e.target.value)}
                                />
                                <datalist id="order-customer-suggestions">
                                    {savedCustomers.map(c => (
                                        <option key={c.id} value={c.name}>{c.mobile ? `Mobile: ${c.mobile}` : ''}</option>
                                    ))}
                                </datalist>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Mobile Number</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-405">
                                    <Phone size={16} />
                                </span>
                                <input
                                    name="customer_mobile"
                                    type="tel"
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    placeholder="Mobile number"
                                    value={formData.customer_mobile}
                                    onChange={handleFormChange}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Email Address</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-405">
                                    <Mail size={16} />
                                </span>
                                <input
                                    name="customer_email"
                                    type="email"
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    placeholder="email@example.com"
                                    value={formData.customer_email}
                                    onChange={handleFormChange}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">GSTIN</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-405">
                                    <CreditCard size={16} />
                                </span>
                                <input
                                    name="gstin"
                                    type="text"
                                    maxLength="15"
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all uppercase"
                                    placeholder="15-digit GSTIN"
                                    value={formData.gstin}
                                    onChange={handleFormChange}
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Customer Address</label>
                            <div className="relative">
                                <span className="absolute top-2.5 left-3 text-gray-405">
                                    <MapPin size={16} />
                                </span>
                                <textarea
                                    name="customer_address"
                                    rows="2"
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                                    placeholder="Address"
                                    value={formData.customer_address}
                                    onChange={handleFormChange}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Customer State (for GST calculation)</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-405">
                                    <Map size={16} />
                                </span>
                                <input
                                    name="customer_state"
                                    type="text"
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    placeholder="e.g. Tamil Nadu"
                                    value={formData.customer_state}
                                    onChange={handleFormChange}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Order Date</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-405">
                                    <FileText size={16} />
                                </span>
                                <input
                                    required
                                    name="order_date"
                                    type="date"
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    value={formData.order_date}
                                    onChange={handleFormChange}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section: Status & Delivery Details */}
                <div className="space-y-4 pt-4 border-t border-gray-100">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Status & Delivery Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Approval Status</label>
                            <select
                                name="approval_status"
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                value={formData.approval_status || 'Pending'}
                                onChange={handleFormChange}
                            >
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                            </select>
                        </div>

                        {formData.approval_status !== 'Rejected' && (
                            <>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Delivery Status</label>
                                    <select
                                        name="delivery_status"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                        value={formData.delivery_status || 'Not Delivered'}
                                        onChange={handleFormChange}
                                    >
                                        <option value="Not Delivered">Not Delivered</option>
                                        <option value="Delivered">Delivered</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Payment Status</label>
                                    <select
                                        name="payment_status"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                        value={formData.payment_status || 'Not Received'}
                                        onChange={handleFormChange}
                                    >
                                        <option value="Not Received">Not Received</option>
                                        <option value="Half Payment">Half Payment</option>
                                        <option value="Full Payment">Full Payment</option>
                                    </select>
                                </div>

                                {(formData.payment_status === 'Half Payment' || formData.payment_status === 'Full Payment') && (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Amount Received</label>
                                        <input
                                            name="payment_amount"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                            placeholder="Enter amount"
                                            value={formData.payment_amount || ''}
                                            onChange={handleFormChange}
                                        />
                                    </div>
                                )}

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Queries</label>
                                    <textarea
                                        name="queries"
                                        rows="2"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                                        placeholder="Any queries..."
                                        value={formData.queries || ''}
                                        onChange={handleFormChange}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Section 2: Items Set List */}
                <div className="space-y-6 pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Item Set Details</h3>
                        <button
                            type="button"
                            onClick={handleAddItem}
                            className="bg-primary hover:bg-secondary text-white text-xs px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1 transition-all shadow-sm"
                        >
                            <Plus size={14} />
                            <span>Add Item Set</span>
                        </button>
                    </div>

                    <div className="space-y-6">
                        {items.map((item, index) => (
                            <div key={item.id} className="p-4 md:p-6 bg-gray-50 rounded-2xl border border-gray-200 relative space-y-4 animate-fadeIn">
                                {/* Header / Remove Button */}
                                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                                    <span className="text-xs font-bold text-primary uppercase">Item #{index + 1} Set</span>
                                    {items.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(item.id)}
                                            className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-lg hover:bg-red-50"
                                            title="Delete this set"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Item Category *</label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none bg-white transition-all text-sm font-semibold text-gray-700"
                                            value={item.item_category}
                                            onChange={(e) => handleItemChange(index, 'item_category', e.target.value)}
                                        >
                                            <option value="Daily Calendar">Daily Calendar</option>
                                            <option value="Monthly Calendar">Monthly Calendar</option>
                                            <option value="Dairy">Dairy</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                     {item.item_category === 'Other' && (
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Specify Details * (Type or select product)</label>
                                            <input
                                                required
                                                type="text"
                                                list="order-product-suggestions"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-xl outline-none transition-all text-sm font-semibold"
                                                placeholder="Enter item name or select saved product"
                                                value={item.custom_item_type}
                                                onChange={(e) => handleItemChange(index, 'custom_item_type', e.target.value)}
                                            />
                                            <datalist id="order-product-suggestions">
                                                {savedProducts.map(p => (
                                                    <option key={p.id} value={p.name}>{p.hsn_sac ? `HSN: ${p.hsn_sac}` : ''}</option>
                                                ))}
                                            </datalist>
                                        </div>
                                    )}
                                </div>

                                {/* Dynamic Specification Fields based on Category */}
                                {item.item_category === 'Daily Calendar' && (
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white rounded-xl border border-gray-150">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-655 mb-1">Size *</label>
                                            <input
                                                required
                                                type="text"
                                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none"
                                                placeholder="e.g. 10x15"
                                                value={item.size}
                                                onChange={(e) => handleItemChange(index, 'size', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-655 mb-1">Slip Number *</label>
                                            <input
                                                required
                                                type="text"
                                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none"
                                                placeholder="e.g. Slip No 12"
                                                value={item.slip_number}
                                                onChange={(e) => handleItemChange(index, 'slip_number', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-655 mb-1">If Spl</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none"
                                                placeholder="e.g. Special print"
                                                value={item.if_spl}
                                                onChange={(e) => handleItemChange(index, 'if_spl', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-655 mb-1">Bottom Color *</label>
                                            <input
                                                required
                                                type="text"
                                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none"
                                                placeholder="e.g. Blue"
                                                value={item.bottom_color}
                                                onChange={(e) => handleItemChange(index, 'bottom_color', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Daily Calendar Designs Input Section */}
                                {item.item_category === 'Daily Calendar' && (
                                    <div className="p-4 bg-white rounded-xl border border-gray-150 space-y-4">
                                        <div className="flex justify-between items-center border-b border-gray-150 pb-2">
                                            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Design Wise Quantities (1 to 100 designs)</span>
                                            <button
                                                type="button"
                                                onClick={() => handleAddDesign(index)}
                                                className="bg-primary hover:bg-secondary text-white text-[11px] px-2.5 py-1 rounded-lg font-bold flex items-center space-x-1 transition-all"
                                            >
                                                <Plus size={12} />
                                                <span>Add Design</span>
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {(item.designs || [{ design_number: '1', quantity: '' }]).map((design, dIndex) => (
                                                <div key={dIndex} className="flex items-center space-x-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                                                    <div className="flex-1 min-w-0">
                                                        <label className="block text-[9px] font-bold text-gray-400">Design No/Name</label>
                                                        <input
                                                            required
                                                            type="text"
                                                            className="w-full bg-transparent text-xs font-semibold outline-none border-b border-gray-200 focus:border-primary py-0.5"
                                                            value={design.design_number}
                                                            placeholder={`e.g. ${dIndex + 1}`}
                                                            onChange={(e) => handleDesignChange(index, dIndex, 'design_number', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="w-16">
                                                        <label className="block text-[9px] font-bold text-gray-400">Qty</label>
                                                        <input
                                                            required
                                                            type="number"
                                                            min="1"
                                                            className="w-full bg-transparent text-xs font-semibold outline-none border-b border-gray-200 focus:border-primary py-0.5"
                                                            value={design.quantity}
                                                            placeholder="Qty"
                                                            onChange={(e) => handleDesignChange(index, dIndex, 'quantity', e.target.value)}
                                                        />
                                                    </div>
                                                    {(item.designs || []).length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveDesign(index, dIndex)}
                                                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex justify-end text-xs font-bold text-gray-700 bg-blue-50/50 p-2 rounded-lg border border-blue-100/50">
                                            <span>Computed Total Quantity: <span className="text-primary text-sm font-extrabold">{item.quantity || 0}</span> {item.unit || '1'}</span>
                                        </div>
                                    </div>
                                )}

                                {item.item_category === 'Monthly Calendar' && (
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white rounded-xl border border-gray-150">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-655 mb-1">Size *</label>
                                            <input
                                                required
                                                type="text"
                                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none"
                                                placeholder="e.g. 15x20"
                                                value={item.size}
                                                onChange={(e) => handleItemChange(index, 'size', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-655 mb-1">Sheeter *</label>
                                            <select
                                                className="w-full px-3 py-1.5 border border-gray-300 bg-white rounded-lg text-sm outline-none cursor-pointer"
                                                value={item.sheeter}
                                                onChange={(e) => handleItemChange(index, 'sheeter', e.target.value)}
                                            >
                                                <option value="6 sheeter">6 sheeter</option>
                                                <option value="12 sheeter">12 sheeter</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-655 mb-1">If Spl? *</label>
                                            <input
                                                required
                                                type="text"
                                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none"
                                                placeholder="e.g. Spl / Ordinary"
                                                value={item.if_spl}
                                                onChange={(e) => handleItemChange(index, 'if_spl', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-655 mb-1">Top Color *</label>
                                            <input
                                                required
                                                type="text"
                                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none"
                                                placeholder="e.g. Red"
                                                value={item.top_color}
                                                onChange={(e) => handleItemChange(index, 'top_color', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}

                                {item.item_category === 'Dairy' && (
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white rounded-xl border border-gray-150">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-gray-655 mb-1">Size *</label>
                                            <input
                                                required
                                                type="text"
                                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none"
                                                placeholder="e.g. A5 / Custom"
                                                value={item.size}
                                                onChange={(e) => handleItemChange(index, 'size', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Price, Qty, and GST */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Total Quantity *</label>
                                        <input
                                            required
                                            disabled={item.item_category === 'Daily Calendar'}
                                            type="number"
                                            min="0"
                                            step="any"
                                            className={`w-full px-4 py-2 border border-gray-300 rounded-xl outline-none text-sm ${item.item_category === 'Daily Calendar' ? 'bg-gray-150 text-gray-500 font-bold cursor-not-allowed' : ''}`}
                                            placeholder="Quantity"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Unit</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-xl outline-none text-sm"
                                            placeholder="e.g. 1"
                                            value={item.unit}
                                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">
                                            {item.item_category === 'Other' ? 'Rate per Product *' : 'Rate per Calendar/Dairy *'}
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-xl outline-none text-sm"
                                            placeholder="Rate"
                                            value={item.price_per_unit}
                                            onChange={(e) => handleItemChange(index, 'price_per_unit', e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">GST Rate (%)</label>
                                        {item.item_category !== 'Other' ? (
                                            <div className="relative">
                                                <select
                                                    disabled
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none bg-gray-150 text-sm font-semibold text-gray-500 cursor-not-allowed appearance-none"
                                                    value={item.gst_rate}
                                                >
                                                    <option value="18">18% (Fixed)</option>
                                                </select>
                                                <span className="absolute right-3 top-2.5 text-[9px] text-red-500 font-bold">Fixed</span>
                                            </div>
                                        ) : (
                                            <input
                                                required
                                                type="number"
                                                min="0"
                                                max="100"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-xl outline-none text-sm"
                                                placeholder="+___GST"
                                                value={item.gst_rate}
                                                onChange={(e) => handleItemChange(index, 'gst_rate', e.target.value)}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section 3: Calculations Output */}
                <div className="pt-6 border-t border-gray-100 flex justify-end">
                    <div className="w-full md:w-80 space-y-2">
                        <div className="flex justify-between text-sm text-gray-500">
                            <span>Subtotal Amount:</span>
                            <span className="font-semibold text-gray-800">₹{totals.subtotal.toFixed(2)}</span>
                        </div>
                        {isSameState ? (
                            <>
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span>CGST Amount:</span>
                                    <span>₹{totals.cgst_amount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span>SGST Amount:</span>
                                    <span>₹{totals.sgst_amount.toFixed(2)}</span>
                                </div>
                            </>
                        ) : (
                            <div className="flex justify-between text-xs text-gray-400 text-amber-600">
                                <span>IGST Amount:</span>
                                <span>₹{totals.igst_amount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-100 text-[11px] text-amber-800 leading-relaxed mb-2">
                            💡 <strong>GST Policy:</strong> GST is calculated separately for reference but is <strong>not added</strong> to the final order payable amount.
                        </div>
                        <div className="flex justify-between text-base border-t border-gray-100 pt-2 font-bold text-gray-800">
                            <span>Total Amount (Excl. GST):</span>
                            <span className="text-primary text-lg">₹{totals.total_amount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Section 4: Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={() => navigate('/', { state: { activeTab: 'orders' } })}
                        className="flex items-center space-x-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-xl font-bold transition-all text-sm"
                    >
                        <X size={16} />
                        <span>Cancel</span>
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-primary hover:bg-secondary text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 text-sm flex items-center space-x-1.5"
                    >
                        <Save size={16} />
                        <span>{loading ? 'Saving...' : (id ? 'Update Order' : 'Save Order')}</span>
                    </button>
                </div>
            </div>
        </form>
    );
};

export default CreateOrder;
