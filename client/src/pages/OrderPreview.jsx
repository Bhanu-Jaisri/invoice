import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { formatCurrency } from '../utils/numberToWords';
import { applyTheme } from '../utils/theme';
import { exportReportToWord, exportReportToExcel, extractCityFromAddress, exportOrderToWord, exportElementToA4Pdf } from '../utils/cityAndExportUtils';

const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
};

const OrderPreview = () => {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const autoDownloadTriggered = useRef(false);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        fetch(`${import.meta.env.VITE_API_URL}/api/orders/${id}`, {
            headers: { 'x-user-id': user ? user.id : '' }
        })
            .then(res => res.json())
            .then(data => {
                setOrder(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [id]);

    useEffect(() => {
        if (order && order.office_theme) {
            applyTheme(order.office_theme);
        }
        return () => {
            const user = JSON.parse(localStorage.getItem('user'));
            if (user && user.office_theme) {
                applyTheme(user.office_theme);
            } else {
                applyTheme('blue');
            }
        };
    }, [order]);

    useEffect(() => {
        if (loading || !order || autoDownloadTriggered.current) return;
        const params = new URLSearchParams(window.location.search);
        const autoDownload = params.get('autoDownload') === 'true';
        const sessionKey = `pdf_done_order_${id}`;
        if (autoDownload && !sessionStorage.getItem(sessionKey)) {
            autoDownloadTriggered.current = true;
            sessionStorage.setItem(sessionKey, 'true');
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
            setTimeout(() => { handleDownload(); }, 300);
        }
    }, [loading, order, id]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = async () => {
        try {
            setGenerating(true);
            const element = document.getElementById('order-content');

            if (!element) {
                console.error('[PDF] Element #order-content not found!');
                setGenerating(false);
                return;
            }

            const dateVal = order.order_date || new Date().toISOString();
            const dateObj = new Date(dateVal);
            const dayStr = String(isNaN(dateObj.getTime()) ? new Date().getDate() : dateObj.getDate()).padStart(2, '0');
            const monthStr = String(isNaN(dateObj.getTime()) ? (new Date().getMonth() + 1) : (dateObj.getMonth() + 1)).padStart(2, '0');
            const yearStr = isNaN(dateObj.getTime()) ? new Date().getFullYear() : dateObj.getFullYear();
            const dateFormatted = `${dayStr}${monthStr}${yearStr}`;

            const customerNameStr = order.customer_name || 'customer';
            const sanitizedCustomerName = customerNameStr
                .toLowerCase()
                .trim()
                .replace(/\s+/g, '_')
                .replace(/[^a-z0-9_]/g, '');

            const orderNumStr = order.order_number || 'order';
            const pdfFilename = `${orderNumStr.replace(/\//g, '_')}_${sanitizedCustomerName}_${dateFormatted}.pdf`;

            await exportElementToA4Pdf(element, pdfFilename, { forcedOrientation: 'auto' });
            setGenerating(false);
        } catch (err) {
            console.error('[PDF] Error:', err);
            setGenerating(false);
            alert(`PDF creation failed: ${err.message}\n\nPlease try again or use Print -> Save as PDF.`);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[400px]">
                <div className="text-gray-500 font-semibold">Loading order details...</div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="text-center my-12">
                <h3 className="text-lg font-bold text-red-650">Order Form not found</h3>
                <Link to="/" className="text-primary hover:underline mt-2 inline-block">Go back to dashboard</Link>
            </div>
        );
    }

    const subtotal = parseFloat(order.subtotal || 0);
    const cgst = parseFloat(order.cgst_amount || 0);
    const sgst = parseFloat(order.sgst_amount || 0);
    const igst = parseFloat(order.igst_amount || 0);
    const totalAmount = subtotal;
    const totalAmountWithGst = subtotal + cgst + sgst + igst;
    const hasGst = order.has_gst !== false && (order.has_gst === true || (cgst + sgst + igst) > 0);

    const orderItems = (order.items && order.items.length > 0
        ? order.items
        : [{
            item_type: order.item_type,
            hsn_sac: order.hsn_sac,
            quantity: order.quantity,
            unit: order.unit,
            price_per_unit: order.price_per_unit,
            gst_rate: order.gst_rate,
            size: order.size,
            slip_number: order.slip_number,
            sheeter: order.sheeter,
            bottom_color: order.bottom_color,
            top_color: order.top_color,
            if_spl: order.if_spl,
            designs: order.designs,
            designs_total_qty: order.designs_total_qty,
            details: order.details
        }]).map(item => {
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
            return { ...item, parsedDesigns };
        });

    const customerCity = extractCityFromAddress(order.customer_address || '');

    const handleDownloadWord = () => {
        if (!order) return;
        const user = JSON.parse(localStorage.getItem('user')) || {};
        const company = {
            name: order.office_name || user.office_name || 'NRG JAISRI PRINTERS',
            address: order.office_address || user.office_address || '',
            gstin: order.office_gstin || user.office_gstin || '',
            mobile: order.office_mobile || user.office_mobile || '',
            email: order.office_email || user.office_email || ''
        };

        const cleanCust = (order.customer_name || 'customer').replace(/[^a-zA-Z0-9_-]/g, '_');
        const cleanOrder = (order.order_number || 'order').replace(/[\/\\]/g, '_');
        exportOrderToWord(order, orderItemsWithParsedDesigns, company, `${cleanOrder}_${cleanCust}`);
    };

    const handleDownloadExcel = () => {
        if (!order) return;
        const user = JSON.parse(localStorage.getItem('user')) || {};
        const company = {
            name: order.office_name || user.office_name || 'NRG JAISRI PRINTERS',
            address: order.office_address || user.office_address || '',
            gstin: order.office_gstin || user.office_gstin || '',
            mobile: order.office_mobile || user.office_mobile || ''
        };
        const headers = ['#', 'Particulars / Description', 'Size', 'Slip #', 'Qty', 'Unit', 'Rate (₹)', 'Total (₹)'];
        const rows = (orderItemsWithParsedDesigns || []).map((item, idx) => [
            idx + 1,
            item.item_type || '-',
            item.size || '-',
            item.slip_number || '-',
            item.quantity || 1,
            item.unit || '1',
            parseFloat(item.price_per_unit || 0).toFixed(2),
            parseFloat(item.total_amount || 0).toFixed(2)
        ]);
        const filterNotes = [
            `Order #: ${order.order_number}`,
            `Date: ${formatDate(order.order_date)}`,
            `Customer: ${order.customer_name}`,
            customerCity ? `City: ${customerCity}` : null
        ].filter(Boolean);

        const cleanCust = (order.customer_name || 'customer').replace(/[^a-zA-Z0-9_-]/g, '_');
        const cleanOrder = (order.order_number || 'order').replace(/[\/\\]/g, '_');
        exportReportToExcel({
            title: `ORDER FORM - ${order.order_number}`,
            company,
            filterNotes,
            headers,
            rows,
            filename: `${cleanOrder}_${cleanCust}`
        });
    };

    return (
        <div className="w-[800px] max-w-full mx-auto space-y-6">
            {/* Top Bar Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <Link to="/" className="flex items-center space-x-1.5 text-sm text-gray-550 hover:text-gray-800 transition-colors">
                    <ArrowLeft size={18} />
                    <span>Back to Dashboard</span>
                </Link>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {/* Excel Button */}
                    <button
                        onClick={handleDownloadExcel}
                        className="flex-1 sm:flex-none justify-center bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3.5 py-2.5 rounded-xl font-bold transition-all text-xs flex items-center space-x-1.5 shadow-xs cursor-pointer"
                        title="Download as Excel spreadsheet (.xls)"
                    >
                        <FileSpreadsheet size={16} className="text-emerald-600" />
                        <span>Excel</span>
                    </button>

                    {/* Word Button */}
                    <button
                        onClick={handleDownloadWord}
                        className="flex-1 sm:flex-none justify-center bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 px-3.5 py-2.5 rounded-xl font-bold transition-all text-xs flex items-center space-x-1.5 shadow-xs cursor-pointer"
                        title="Download as Microsoft Word document (.doc)"
                    >
                        <FileText size={16} className="text-blue-600" />
                        <span>Word</span>
                    </button>

                    {/* PDF Button */}
                    <button
                        onClick={handleDownload}
                        disabled={generating}
                        className="flex-1 sm:flex-none justify-center bg-primary hover:bg-secondary text-white px-4 py-2.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all text-xs flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                        title="Download as PDF (.pdf)"
                    >
                        <Download size={16} />
                        <span>{generating ? 'Downloading...' : 'PDF'}</span>
                    </button>

                    {/* Print Order */}
                    <button
                        onClick={handlePrint}
                        className="flex-1 sm:flex-none justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 py-2.5 rounded-xl font-bold transition-all text-xs flex items-center space-x-1.5 cursor-pointer"
                    >
                        <Printer size={16} />
                        <span>Print</span>
                    </button>
                </div>
            </div>

            {/* Printable Area */}
            <div
                id="order-content"
                className="bg-white p-6 md:p-8 rounded-2xl shadow-md border border-gray-100 relative w-[800px] max-w-full mx-auto print:p-0 print:shadow-none print:border-none"
            >
                {/* PDF Header Stripe */}
                <div className="h-2 bg-primary rounded-t-2xl -mt-6 -mx-6 md:-mt-8 md:-mx-8" />

                {/* Content Header */}
                <div className="flex justify-between items-start pt-4 border-b border-gray-100 pb-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-850 uppercase">{order.office_name}</h1>
                        <span className="inline-block mt-1 bg-primary/10 text-primary font-bold text-xs px-3 py-0.5 rounded-full uppercase tracking-wider">
                            ORDER FORM
                        </span>
                    </div>
                    {/* Top Right Corner Order Number & Date */}
                    <div className="text-right bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 shadow-xs min-w-[170px]">
                        <div className="mb-1.5">
                            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Order Number</span>
                            <span className="text-lg font-black text-primary leading-tight">{order.order_number}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-1.5">
                            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Order Date</span>
                            <span className="text-xs font-bold text-gray-700 leading-tight">{formatDate(order.order_date)}</span>
                        </div>
                    </div>
                </div>

                {/* Addresses Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4 border-t border-b border-gray-100 py-4">
                    <div className="space-y-2">
                        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Supplier Details</span>
                        <div className="text-sm space-y-1">
                            <p className="font-bold text-gray-800">{order.office_name}</p>
                            <p className="text-gray-600 whitespace-pre-line leading-relaxed">{order.office_address}</p>
                            <p className="text-gray-500"><strong>GSTIN:</strong> {order.office_gstin}</p>
                            <p className="text-gray-500"><strong>State:</strong> {order.office_state}</p>
                            <p className="text-gray-500"><strong>Contact:</strong> {order.office_mobile} | {order.office_email}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Customer Details</span>
                        <div className="text-sm space-y-1">
                            <p className="font-bold text-gray-800">{order.customer_name}</p>
                            {order.customer_address && <p className="text-gray-600 whitespace-pre-line leading-relaxed">{order.customer_address}</p>}
                            {order.gstin && <p className="text-gray-500"><strong>GSTIN:</strong> {order.gstin}</p>}
                            <p className="text-gray-500"><strong>State:</strong> {order.customer_state}</p>
                            {order.customer_mobile && <p className="text-gray-500"><strong>Mobile:</strong> {order.customer_mobile}</p>}
                            {order.customer_email && <p className="text-gray-500"><strong>Email:</strong> {order.customer_email}</p>}
                        </div>
                    </div>
                </div>

                {/* Status & Approval Details - Visible on screen, hidden in PDF/Print */}
                <div className="pdf-hide print:hidden grid grid-cols-2 md:grid-cols-4 gap-4 py-3 bg-gray-50/80 px-4 rounded-xl mt-4 border border-gray-200">
                    <div>
                        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Approval Status</span>
                        <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full mt-0.5 ${
                            order.approval_status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            order.approval_status === 'Rejected' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                            'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                            {order.approval_status || 'Pending'}
                        </span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</span>
                        <span className="text-sm font-bold text-gray-800 uppercase tracking-wider">{order.status || 'Active'}</span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Delivery Status</span>
                        <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full mt-0.5 ${
                            order.delivery_status === 'Delivered' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-gray-100 text-gray-650'
                        }`}>
                            {order.delivery_status || 'Not Delivered'}
                        </span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Payment Status</span>
                        <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full mt-0.5 ${
                            order.payment_status === 'Full Payment' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            order.payment_status === 'Half Payment' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            'bg-gray-100 text-gray-650'
                        }`}>
                            {order.payment_status || 'Not Received'}
                        </span>
                    </div>
                </div>

                {order.approval_status !== 'Rejected' && (
                    <div className="pdf-hide print:hidden space-y-3 mt-3">
                        {(order.payment_status === 'Half Payment' || order.payment_status === 'Full Payment') && (
                            <div className="py-2.5 bg-blue-50/20 border border-blue-100 px-4 rounded-xl text-xs flex justify-between items-center">
                                <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Initial Amount Received:</span>
                                <span className="text-sm font-bold text-emerald-700">₹{parseFloat(order.payment_amount || 0).toFixed(2)}</span>
                            </div>
                        )}

                        {order.queries && (
                            <div className="py-3 bg-gray-50/50 border border-gray-150 px-4 rounded-xl text-xs">
                                <span className="block font-bold text-gray-400 uppercase tracking-wider text-[9px] mb-1">Queries</span>
                                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{order.queries}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Items Table */}
                <div className="mt-8 overflow-hidden rounded-xl border border-gray-150">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="bg-primary text-white">
                                <th className="p-3 font-semibold text-xs uppercase w-12 text-center">S.No</th>
                                <th className="p-3 font-semibold text-xs uppercase">Description of Goods</th>
                                <th className="p-3 font-semibold text-xs uppercase text-right w-20">Qty</th>
                                <th className="p-3 font-semibold text-xs uppercase text-center w-16">Unit</th>
                                <th className="p-3 font-semibold text-xs uppercase text-right w-28">Rate</th>
                                {hasGst && <th className="p-3 font-semibold text-xs uppercase text-center w-16">GST %</th>}
                                <th className="p-3 font-semibold text-xs uppercase text-right w-28">Total (INR)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {orderItems.map((item, index) => {
                                const itemQty = parseFloat(item.quantity || 0);
                                const itemRate = parseFloat(item.price_per_unit || 0);
                                const itemAmount = itemQty * itemRate;
                                return (
                                    <tr key={item.id || index} className="align-top">
                                        <td className="p-3 text-center text-gray-500 font-semibold">{index + 1}</td>
                                        <td className="p-3">
                                            <div className="font-bold text-gray-800 text-sm">{item.item_type}</div>
                                            <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                                                {item.size && <p><strong>Size:</strong> {item.size}</p>}
                                                {item.slip_number && <p><strong>Slip No:</strong> {item.slip_number}</p>}
                                                {item.sheeter && <p><strong>Sheeter:</strong> {item.sheeter}</p>}
                                                {item.bottom_color && <p><strong>Bottom Color:</strong> {item.bottom_color}</p>}
                                                {item.top_color && <p><strong>Top Color:</strong> {item.top_color}</p>}
                                                {item.if_spl && <p><strong>Special Specs:</strong> {item.if_spl}</p>}
                                                {item.parsedDesigns && item.parsedDesigns.filter(d => d && (d.quantity || d.design_number)).length > 0 && (
                                                    <div className="mt-2 bg-gray-55 p-2.5 rounded-lg border border-gray-200/80 max-w-xs space-y-1">
                                                        <p className="font-bold text-[10px] uppercase text-gray-400 tracking-wider">Design wise quantities:</p>
                                                        <div className="grid grid-cols-2 gap-x-4 text-[11px] text-gray-655">
                                                            {item.parsedDesigns.filter(d => d && (d.quantity || d.design_number)).map((d, dIdx) => (
                                                                <div key={dIdx} className="flex justify-between border-b border-gray-100 py-0.5">
                                                                    <span className="font-medium">Design {d.design_number}:</span>
                                                                    <span className="font-bold">{d.quantity}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {item.details && (
                                                    <div className="mt-2 text-xs text-gray-700 bg-amber-50/40 p-2 rounded-lg border border-amber-200/60 leading-relaxed whitespace-pre-wrap">
                                                        <span className="font-bold text-gray-800">Details: </span>
                                                        {item.details}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3 text-right text-gray-800 font-semibold">{parseFloat(item.quantity || 0) > 0 ? item.quantity : '-'}</td>
                                        <td className="p-3 text-center text-gray-505 font-medium">{item.unit || '1'}</td>
                                        <td className="p-3 text-right text-gray-800 font-semibold">{parseFloat(item.price_per_unit || 0) > 0 ? `₹${parseFloat(item.price_per_unit).toFixed(2)}` : '-'}</td>
                                        {hasGst && <td className="p-3 text-center text-gray-650 font-semibold">{item.gst_rate}%</td>}
                                        <td className="p-3 text-right font-bold text-gray-900">{itemAmount > 0 ? `₹${itemAmount.toFixed(2)}` : '₹0.00'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Subtotals, Taxes & Payment Settlement block */}
                <div className="mt-6 flex flex-col md:flex-row justify-between gap-6 border-b border-gray-100 pb-6">
                    <div className="max-w-md text-xs text-gray-400 space-y-4 flex-1">
                        <div>
                            <span className="block font-bold uppercase tracking-wider text-[10px]">Amount in Words</span>
                            {hasGst ? (
                                <>
                                    {/* In View: show total with GST */}
                                    <p className="pdf-hide print:hidden text-sm font-bold text-gray-700 capitalize leading-relaxed">
                                        {formatCurrency(totalAmountWithGst)}
                                    </p>
                                    {/* In PDF/Print: show total excl GST */}
                                    <p className="hidden print:block pdf-show text-sm font-bold text-gray-700 capitalize leading-relaxed">
                                        {formatCurrency(totalAmount)}
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm font-bold text-gray-700 capitalize leading-relaxed">
                                    {formatCurrency(totalAmount)}
                                </p>
                            )}
                        </div>

                        {/* Bank Details */}
                        { (order.bank_name || order.account_no) && (
                            <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-150 space-y-1">
                                <span className="font-bold text-gray-700 uppercase tracking-wider block text-[10px] border-b border-gray-200 pb-1 mb-1">
                                    Bank Details
                                </span>
                                <div className="text-[11px] text-gray-700 space-y-0.5 leading-tight">
                                    {order.bank_name && <div><strong>Bank:</strong> {order.bank_name}</div>}
                                    {order.bank_branch && <div><strong>Branch:</strong> {order.bank_branch}</div>}
                                    {order.account_name && <div><strong>Account Name:</strong> {order.account_name}</div>}
                                    {order.account_no && <div><strong>A/c No:</strong> {order.account_no}</div>}
                                    {order.ifsc_code && <div><strong>IFSC:</strong> {order.ifsc_code}</div>}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-full md:w-80 space-y-2 text-sm text-gray-600">
                        {hasGst ? (
                            <>
                                {/* TOTAL AMOUNT (EXCLU GST) - Always visible in View and PDF */}
                                <div className="flex justify-between text-base border-t border-b border-gray-200 py-2 font-bold text-gray-900">
                                    <span>TOTAL AMOUNT (EXCLU GST):</span>
                                    <span className="text-primary text-lg">₹{totalAmount.toFixed(2)}</span>
                                </div>

                                {/* GST / TAX - Hidden in PDF/Print, visible in View */}
                                <div className="pdf-hide print:hidden space-y-1 bg-gray-50/80 p-2.5 rounded-xl border border-gray-150 text-xs">
                                    <div className="flex justify-between font-bold text-gray-700 text-sm">
                                        <span>GST/TAX:</span>
                                        <span className="text-gray-900">₹{(cgst + sgst + igst).toFixed(2)}</span>
                                    </div>
                                    {cgst > 0 && (
                                        <div className="flex justify-between text-[11px] text-gray-500 pl-2">
                                            <span>CGST:</span>
                                            <span>₹{cgst.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {sgst > 0 && (
                                        <div className="flex justify-between text-[11px] text-gray-500 pl-2">
                                            <span>SGST:</span>
                                            <span>₹{sgst.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {igst > 0 && (
                                        <div className="flex justify-between text-[11px] text-amber-600 pl-2">
                                            <span>IGST:</span>
                                            <span>₹{igst.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* TOTAL AMOUNT - Hidden in PDF/Print, visible in View */}
                                <div className="pdf-hide print:hidden flex justify-between text-base font-bold text-gray-900 bg-primary/5 px-2.5 py-1.5 rounded-xl border border-primary/20">
                                    <span>TOTAL AMOUNT:</span>
                                    <span className="text-primary text-lg">₹{totalAmountWithGst.toFixed(2)}</span>
                                </div>
                            </>
                        ) : (
                            /* WITHOUT GST: Only Total Amount showing the same value */
                            <div className="flex justify-between text-base border-t border-b border-gray-200 py-2 font-bold text-gray-900 bg-primary/5 px-2.5 rounded-xl">
                                <span>TOTAL AMOUNT:</span>
                                <span className="text-primary text-lg">₹{totalAmount.toFixed(2)}</span>
                            </div>
                        )}

                        {/* Payment Settlement Breakdown - Hidden in PDF/Print, visible in View */}
                        <div className="pdf-hide print:hidden">
                            {(() => {
                                let history = [];
                                if (order.payment_history) {
                                    try {
                                        const parsed = typeof order.payment_history === 'string' ? JSON.parse(order.payment_history) : order.payment_history;
                                        if (Array.isArray(parsed)) history = parsed;
                                    } catch (e) {}
                                }
                                
                                let totalPaid = 0;
                                if (history.length > 0) {
                                    totalPaid = history.reduce((sum, h) => sum + (parseFloat(h.amount) || 0), 0);
                                } else {
                                    const adv = parseFloat(order.advance_amount || 0);
                                    const sec = parseFloat(order.second_payment_amount || 0);
                                    totalPaid = (adv + sec > 0) ? (adv + sec) : parseFloat(order.payment_amount || 0);
                                    if (adv > 0) history.push({ note: 'Advance Received', date: order.order_date, amount: adv });
                                    if (sec > 0) history.push({ note: 'Next Payment', date: order.order_date, amount: sec });
                                }

                                const targetTotal = hasGst ? totalAmountWithGst : totalAmount;
                                const pending = Math.max(0, targetTotal - totalPaid);
                                const statusText = totalPaid <= 0 ? 'Pending' : (totalPaid >= targetTotal ? 'Fully Paid' : 'Partially Paid');

                                return (
                                    <div className="mt-4 pt-3 border-t border-gray-150">
                                        <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 flex justify-between items-center">
                                            <span>Payment Settlement Breakdown</span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                                statusText === 'Fully Paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                                statusText === 'Partially Paid' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-red-100 text-red-800 border border-red-200'
                                            }`}>
                                                {statusText}
                                            </span>
                                        </div>

                                        {history.length > 0 ? (
                                            <div className="bg-gray-50 rounded-xl border border-gray-150 overflow-hidden mb-2">
                                                <table className="w-full text-left text-[11px] border-collapse">
                                                    <thead>
                                                        <tr className="bg-gray-100 text-gray-600 font-bold border-b border-gray-200">
                                                            <th className="p-1.5 pl-2">Installment / Note</th>
                                                            <th className="p-1.5 text-center">Date</th>
                                                            <th className="p-1.5 pr-2 text-right">Amount Received</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {history.map((inst, idx) => (
                                                            <tr key={idx}>
                                                                <td className="p-1.5 pl-2 font-medium text-gray-700">{inst.note || `Payment #${idx + 1}`}</td>
                                                                <td className="p-1.5 text-center text-gray-500">{formatDate(inst.date)}</td>
                                                                <td className="p-1.5 pr-2 text-right font-bold text-emerald-700">₹{parseFloat(inst.amount || 0).toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : null}

                                        <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-2.5 rounded-xl border border-gray-150">
                                            <div>
                                                <span className="block text-[10px] font-bold text-gray-400 uppercase">Total Received</span>
                                                <span className="font-bold text-emerald-800">₹{totalPaid.toFixed(2)}</span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] font-bold text-amber-600 uppercase">Remaining Pending</span>
                                                <span className="font-bold text-amber-800">₹{pending.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* Sign-off */}
                <div className="mt-6 flex justify-end border-t border-gray-100 pt-4">
                    <div className="text-center w-56 space-y-8">
                        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                            For {order.office_name}
                        </div>
                        <div className="border-t border-gray-300 pt-1 text-xs text-gray-500 font-semibold">
                            Authorized Signatory
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderPreview;
