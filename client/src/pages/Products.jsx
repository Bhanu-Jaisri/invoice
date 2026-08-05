import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Edit3, Trash2, X, CheckCircle, Tag, Hash, Percent, DollarSign } from 'lucide-react';

const Products = () => {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        hsn_sac: '',
        unit: '1',
        price_per_unit: '',
        gst_rate: '18'
    });

    const fetchProducts = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) return;
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/products`, {
                headers: { 'x-user-id': user.id }
            });
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            }
        } catch (err) {
            console.error('Error fetching products:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const openAddModal = () => {
        setEditingProduct(null);
        setFormData({
            name: '',
            hsn_sac: '',
            unit: '1',
            price_per_unit: '',
            gst_rate: '18'
        });
        setError('');
        setSuccess('');
        setIsModalOpen(true);
    };

    const openEditModal = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name || '',
            hsn_sac: product.hsn_sac || '',
            unit: product.unit || '1',
            price_per_unit: product.price_per_unit || '',
            gst_rate: product.gst_rate || '18'
        });
        setError('');
        setSuccess('');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
        setError('');
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!formData.name.trim()) {
            setError('Product Name is required.');
            return;
        }

        setSaving(true);
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const url = editingProduct
                ? `${import.meta.env.VITE_API_URL}/api/products/${editingProduct.id}`
                : `${import.meta.env.VITE_API_URL}/api/products`;
            const method = editingProduct ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(editingProduct ? 'Product updated successfully!' : 'Product added successfully!');
                fetchProducts();
                setTimeout(() => {
                    closeModal();
                }, 600);
            } else {
                setError(data.error || 'Failed to save product');
            }
        } catch (err) {
            console.error(err);
            setError('Server error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete product "${name}"?`)) return;
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/products/${id}`, {
                method: 'DELETE',
                headers: { 'x-user-id': user.id }
            });
            if (res.ok) {
                fetchProducts();
            } else {
                alert('Failed to delete product');
            }
        } catch (err) {
            console.error(err);
            alert('Error deleting product');
        }
    };

    const filteredProducts = products.filter(p => {
        const query = searchTerm.toLowerCase();
        return (
            (p.name && p.name.toLowerCase().includes(query)) ||
            (p.hsn_sac && p.hsn_sac.toLowerCase().includes(query)) ||
            (p.unit && p.unit.toLowerCase().includes(query))
        );
    });

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
                        <Package className="text-primary" size={24} />
                        <span>Product & Item Directory</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">Manage saved items, HSN/SAC codes, and default units for instant invoice filling.</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="w-full sm:w-auto bg-primary hover:bg-secondary text-white px-5 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-all font-bold shadow-sm"
                >
                    <Plus size={18} />
                    <span>Add New Product</span>
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                    <Search size={18} />
                </span>
                <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all shadow-xs"
                    placeholder="Search by product name, HSN/SAC code, or unit..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Products Table */}
            {loading ? (
                <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-100">
                    Loading product catalog...
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 space-y-3">
                    <Package size={48} className="mx-auto text-gray-300" />
                    <h3 className="text-base font-bold text-gray-700">No Products Found</h3>
                    <p className="text-xs text-gray-400">
                        {searchTerm ? 'No products match your search query.' : 'Add your first product to auto-fill items on invoices.'}
                    </p>
                    {!searchTerm && (
                        <button
                            onClick={openAddModal}
                            className="mt-2 bg-primary hover:bg-secondary text-white px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5"
                        >
                            <Plus size={16} />
                            <span>Add Product</span>
                        </button>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold uppercase text-gray-400 tracking-wider">
                                    <th className="p-4">Product / Item Name</th>
                                    <th className="p-4">HSN / SAC Code</th>
                                    <th className="p-4">Default Unit</th>
                                    <th className="p-4">Default Price</th>
                                    <th className="p-4">GST Rate</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs">
                                {filteredProducts.map(product => (
                                    <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4 font-bold text-gray-800">
                                            {product.name}
                                        </td>
                                        <td className="p-4 text-gray-600 font-mono">
                                            {product.hsn_sac ? (
                                                <span className="bg-gray-100 px-2 py-0.5 rounded font-bold text-[11px] text-gray-750">
                                                    {product.hsn_sac}
                                                </span>
                                            ) : (
                                                <span className="text-gray-350 italic text-[11px]">-</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-gray-700 font-semibold">
                                            {product.unit || '1'}
                                        </td>
                                        <td className="p-4 font-bold text-gray-800">
                                            ₹{parseFloat(product.price_per_unit || 0).toFixed(2)}
                                        </td>
                                        <td className="p-4 text-gray-600 font-medium">
                                            {product.gst_rate}%
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end items-center space-x-2">
                                                <button
                                                    onClick={() => openEditModal(product)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit Product"
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id, product.name)}
                                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Delete Product"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add / Edit Product Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-fadeIn">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                                <Package size={20} className="text-primary" />
                                <span>{editingProduct ? 'Edit Product' : 'Add New Product'}</span>
                            </h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        {error && (
                            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs flex items-center space-x-2">
                                <CheckCircle size={16} />
                                <span>{success}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Product / Item Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    name="name"
                                    type="text"
                                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    placeholder="Enter item or product description"
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">HSN / SAC Code</label>
                                    <input
                                        name="hsn_sac"
                                        type="text"
                                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                        placeholder="e.g. 4911"
                                        value={formData.hsn_sac}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Default Unit</label>
                                    <input
                                        name="unit"
                                        type="text"
                                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                        placeholder="e.g. 1, Pcs, Box, Nos"
                                        value={formData.unit}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Default Price (₹)</label>
                                    <input
                                        name="price_per_unit"
                                        type="number"
                                        step="0.01"
                                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                        placeholder="0.00"
                                        value={formData.price_per_unit}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Default GST Rate (%)</label>
                                    <select
                                        name="gst_rate"
                                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                        value={formData.gst_rate}
                                        onChange={handleChange}
                                    >
                                        <option value="0">0%</option>
                                        <option value="5">5%</option>
                                        <option value="12">12%</option>
                                        <option value="18">18%</option>
                                        <option value="28">28%</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-primary hover:bg-secondary text-white px-5 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Save Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Products;
