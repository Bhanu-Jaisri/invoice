import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { formatCurrency } from '../utils/numberToWords';
import { applyTheme } from '../utils/theme';

const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
};

const QuotationPreview = () => {
    const { id } = useParams();
    const [quotation, setQuotation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        fetch(`${import.meta.env.VITE_API_URL}/api/quotations/${id}`, {
            headers: { 'x-user-id': user ? user.id : '' }
        })
            .then(res => res.json())
            .then(data => {
                setQuotation(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [id]);

    useEffect(() => {
        if (quotation && quotation.office_theme) {
            applyTheme(quotation.office_theme);
        }
        return () => {
            const user = JSON.parse(localStorage.getItem('user'));
            if (user && user.office_theme) {
                applyTheme(user.office_theme);
            } else {
                applyTheme('blue');
            }
        };
    }, [quotation]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = async () => {
        try {
            console.log('[PDF] Generating exact 1-page A4 Quotation PDF...');
            setGenerating(true);
            const element = document.getElementById('quotation-content');

            if (!element) {
                console.error('[PDF] Element #quotation-content not found!');
                setGenerating(false);
                return;
            }

            const dateVal = quotation.quotation_date || new Date().toISOString();
            const dateObj = new Date(dateVal);
            const dayStr = String(isNaN(dateObj.getTime()) ? new Date().getDate() : dateObj.getDate()).padStart(2, '0');
            const monthStr = String(isNaN(dateObj.getTime()) ? (new Date().getMonth() + 1) : (dateObj.getMonth() + 1)).padStart(2, '0');
            const yearStr = isNaN(dateObj.getTime()) ? new Date().getFullYear() : dateObj.getFullYear();
            const dateFormatted = `${dayStr}${monthStr}${yearStr}`;

            const customerNameStr = quotation.customer_name || 'customer';
            const sanitizedCustomerName = customerNameStr
                .toLowerCase()
                .trim()
                .replace(/\s+/g, '_')
                .replace(/[^a-z0-9_]/g, '');

            const quotationNumStr = quotation.quotation_number || 'quotation';
            const pdfFilename = `${quotationNumStr.replace(/\//g, '_')}_${sanitizedCustomerName}_${dateFormatted}.pdf`;

            const html2canvasModule = await import('html2canvas-pro');
            const html2canvas = html2canvasModule.default || html2canvasModule;
            const { jsPDF } = await import('jspdf');

            // Temporarily strip card border, shadow, and rounded corners for clean full-page PDF
            const origShadow = element.style.boxShadow;
            const origBorder = element.style.border;
            const origRadius = element.style.borderRadius;

            element.style.boxShadow = 'none';
            element.style.border = 'none';
            element.style.borderRadius = '0';

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            // Restore original styles
            element.style.boxShadow = origShadow;
            element.style.border = origBorder;
            element.style.borderRadius = origRadius;

            const imgData = canvas.toDataURL('image/jpeg', 0.98);
            const pdf = new jsPDF('portrait', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            let imgWidth = pdfWidth;
            let imgHeight = (canvas.height * pdfWidth) / canvas.width;

            if (imgHeight > pdfHeight) {
                imgHeight = pdfHeight;
                imgWidth = (canvas.width * pdfHeight) / canvas.height;
            }

            const xOffset = (pdfWidth - imgWidth) / 2;
            const yOffset = 0;

            pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);
            pdf.save(pdfFilename);

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
                <div className="text-gray-500 font-semibold">Loading quotation details...</div>
            </div>
        );
    }

    if (!quotation) {
        return (
            <div className="text-center my-12">
                <h3 className="text-lg font-bold text-red-650">Quotation not found</h3>
                <Link to="/" className="text-primary hover:underline mt-2 inline-block">Go back to dashboard</Link>
            </div>
        );
    }

    const subtotal = parseFloat(quotation.subtotal || 0);
    const cgst = parseFloat(quotation.cgst_amount || 0);
    const sgst = parseFloat(quotation.sgst_amount || 0);
    const igst = parseFloat(quotation.igst_amount || 0);
    const totalGst = cgst + sgst + igst;
    const totalAmount = parseFloat(quotation.total_amount || 0);

    const quotationItems = (quotation.items && quotation.items.length > 0
        ? quotation.items
        : [{
            item_type: quotation.item_type,
            hsn_sac: quotation.hsn_sac,
            quantity: quotation.quantity,
            unit: quotation.unit,
            price_per_unit: quotation.price_per_unit,
            gst_rate: quotation.gst_rate,
            size: quotation.size,
            slip_number: quotation.slip_number,
            sheeter: quotation.sheeter,
            bottom_color: quotation.bottom_color,
            top_color: quotation.top_color,
            if_spl: quotation.if_spl,
            designs: quotation.designs,
            designs_total_qty: quotation.designs_total_qty
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

    return (
        <div className="w-[800px] max-w-full mx-auto space-y-6">
            {/* Top Bar Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <Link to="/" className="flex items-center space-x-1.5 text-sm text-gray-550 hover:text-gray-800 transition-colors">
                    <ArrowLeft size={18} />
                    <span>Back to Dashboard</span>
                </Link>
                <div className="flex space-x-3 w-full sm:w-auto">
                    <button
                        onClick={handlePrint}
                        className="flex-1 sm:flex-none justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-bold transition-all text-sm flex items-center space-x-1.5"
                    >
                        <Printer size={16} />
                        <span>Print Quote</span>
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={generating}
                        className="flex-1 sm:flex-none justify-center bg-primary hover:bg-secondary text-white px-5 py-2.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all text-sm flex items-center space-x-1.5 disabled:opacity-50"
                    >
                        <Download size={16} />
                        <span>{generating ? 'Downloading...' : 'Download PDF'}</span>
                    </button>
                </div>
            </div>

            {/* Printable Area */}
            <div
                id="quotation-content"
                className="bg-white p-6 md:p-8 rounded-2xl shadow-md border border-gray-100 relative w-[800px] max-w-full mx-auto print:p-0 print:shadow-none print:border-none"
            >
                {/* PDF Header Stripe */}
                <div className="h-2 bg-primary rounded-t-2xl -mt-6 -mx-6 md:-mt-8 md:-mx-8" />

                {/* Content Header */}
                <div className="flex justify-between items-center pt-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-850 uppercase">{quotation.office_name}</h1>
                    </div>
                    <div className="text-right">
                        <span className="bg-primary/10 text-primary font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider">
                            QUOTATION
                        </span>
                    </div>
                </div>

                {/* Addresses Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4 border-t border-b border-gray-100 py-4">
                    <div className="space-y-2">
                        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Quotation From</span>
                        <div className="text-sm space-y-1">
                            <p className="font-bold text-gray-800">{quotation.office_name}</p>
                            <p className="text-gray-600 whitespace-pre-line leading-relaxed">{quotation.office_address}</p>
                            <p className="text-gray-500"><strong>GSTIN:</strong> {quotation.office_gstin}</p>
                            <p className="text-gray-500"><strong>State:</strong> {quotation.office_state}</p>
                            <p className="text-gray-500"><strong>Contact:</strong> {quotation.office_mobile} | {quotation.office_email}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Quotation To</span>
                        <div className="text-sm space-y-1">
                            <p className="font-bold text-gray-800">{quotation.customer_name}</p>
                            {quotation.customer_address && <p className="text-gray-600 whitespace-pre-line leading-relaxed">{quotation.customer_address}</p>}
                            {quotation.gstin && <p className="text-gray-500"><strong>GSTIN:</strong> {quotation.gstin}</p>}
                            <p className="text-gray-500"><strong>State:</strong> {quotation.customer_state}</p>
                            {quotation.customer_mobile && <p className="text-gray-500"><strong>Mobile:</strong> {quotation.customer_mobile}</p>}
                            {quotation.customer_email && <p className="text-gray-500"><strong>Email:</strong> {quotation.customer_email}</p>}
                        </div>
                    </div>
                </div>

                {/* Metadata Details */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 py-4 bg-gray-50/50 px-4 rounded-xl mt-6">
                    <div>
                        <span className="block text-[10px] font-bold text-gray-400 uppercase">Quotation Number</span>
                        <span className="text-sm font-bold text-gray-800">{quotation.quotation_number}</span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-bold text-gray-400 uppercase">Date of Issue</span>
                        <span className="text-sm font-semibold text-gray-800">{formatDate(quotation.quotation_date)}</span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-bold text-gray-400 uppercase">Valid Until</span>
                        <span className="text-sm font-semibold text-gray-800">
                            {formatDate(new Date(new Date(quotation.quotation_date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString())}
                        </span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-bold text-gray-400 uppercase">Approval Status</span>
                        <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full mt-0.5 ${
                            quotation.approval_status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            quotation.approval_status === 'Rejected' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                            'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                            {quotation.approval_status || 'Pending'}
                        </span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-bold text-gray-400 uppercase">Status</span>
                        <span className="text-sm font-bold text-gray-800 uppercase tracking-wider">{quotation.status}</span>
                    </div>
                </div>

                {quotation.approval_status !== 'Rejected' && (
                    <div className="space-y-3 mt-3">
                        <div className="grid grid-cols-3 gap-4 py-3 bg-blue-50/10 border border-blue-50/30 px-4 rounded-xl text-xs">
                            <div>
                                <span className="block font-bold text-gray-400 uppercase tracking-wider text-[9px] mb-0.5">Delivery Status</span>
                                <span className={`inline-block font-bold px-2 py-0.5 rounded-full ${
                                    quotation.delivery_status === 'Delivered' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-gray-100 text-gray-650'
                                }`}>
                                    {quotation.delivery_status || 'Not Delivered'}
                                </span>
                            </div>
                            <div>
                                <span className="block font-bold text-gray-400 uppercase tracking-wider text-[9px] mb-0.5">Payment Status</span>
                                <span className={`inline-block font-bold px-2 py-0.5 rounded-full ${
                                    quotation.payment_status === 'Full Payment' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                    quotation.payment_status === 'Half Payment' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                    'bg-gray-100 text-gray-650'
                                }`}>
                                    {quotation.payment_status || 'Not Received'}
                                </span>
                            </div>
                            {(quotation.payment_status === 'Half Payment' || quotation.payment_status === 'Full Payment') && (
                                <div>
                                    <span className="block font-bold text-gray-400 uppercase tracking-wider text-[9px] mb-0.5">Amount Received</span>
                                    <span className="text-xs font-bold text-gray-800">₹{parseFloat(quotation.payment_amount || 0).toFixed(2)}</span>
                                </div>
                            )}
                        </div>

                        {quotation.queries && (
                            <div className="py-3 bg-gray-50/50 border border-gray-100 px-4 rounded-xl text-xs">
                                <span className="block font-bold text-gray-400 uppercase tracking-wider text-[9px] mb-1">Queries</span>
                                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{quotation.queries}</p>
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
                                <th className="p-3 font-semibold text-xs uppercase text-center w-16">GST %</th>
                                <th className="p-3 font-semibold text-xs uppercase text-right w-28">Total (INR)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {quotationItems.map((item, index) => {
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
                                                {item.parsedDesigns && item.parsedDesigns.length > 0 && (
                                                    <div className="mt-2 bg-gray-55 p-2.5 rounded-lg border border-gray-200/80 max-w-xs space-y-1">
                                                        <p className="font-bold text-[10px] uppercase text-gray-400 tracking-wider">Design wise quantities:</p>
                                                        <div className="grid grid-cols-2 gap-x-4 text-[11px] text-gray-600">
                                                            {item.parsedDesigns.map((d, dIdx) => (
                                                                <div key={dIdx} className="flex justify-between border-b border-gray-100 py-0.5">
                                                                    <span className="font-medium">Design {d.design_number}:</span>
                                                                    <span className="font-bold">{d.quantity}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3 text-right text-gray-800 font-semibold">{item.quantity}</td>
                                        <td className="p-3 text-center text-gray-505 font-medium">{item.unit || '1'}</td>
                                        <td className="p-3 text-right text-gray-800 font-semibold">₹{parseFloat(item.price_per_unit || 0).toFixed(2)}</td>
                                        <td className="p-3 text-center text-gray-650 font-semibold">{item.gst_rate}%</td>
                                        <td className="p-3 text-right font-bold text-gray-900">₹{itemAmount.toFixed(2)}</td>
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
                            <p className="text-sm font-bold text-gray-700 capitalize leading-relaxed">
                                {formatCurrency(totalAmount)}
                            </p>
                        </div>

                        {/* Bank Details */}
                        { (quotation.bank_name || quotation.account_no) && (
                            <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-150 space-y-1">
                                <span className="font-bold text-gray-700 uppercase tracking-wider block text-[10px] border-b border-gray-200 pb-1 mb-1">
                                    Bank Details
                                </span>
                                <div className="text-[11px] text-gray-700 space-y-0.5 leading-tight">
                                    {quotation.bank_name && <div><strong>Bank:</strong> {quotation.bank_name}</div>}
                                    {quotation.bank_branch && <div><strong>Branch:</strong> {quotation.bank_branch}</div>}
                                    {quotation.account_name && <div><strong>Account Name:</strong> {quotation.account_name}</div>}
                                    {quotation.account_no && <div><strong>A/c No:</strong> {quotation.account_no}</div>}
                                    {quotation.ifsc_code && <div><strong>IFSC:</strong> {quotation.ifsc_code}</div>}
                                </div>
                            </div>
                        )}

                        {/* Terms & Conditions Below Bank Details */}
                        <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-150 space-y-1">
                            <span className="font-bold uppercase tracking-wider block text-gray-700 text-[10px] border-b border-gray-200 pb-1 mb-1">Terms & Conditions</span>
                            {quotation.terms_conditions ? (
                                <div className="whitespace-pre-line leading-relaxed text-gray-600 text-xs">{quotation.terms_conditions}</div>
                            ) : (
                                <div className="text-gray-600 text-xs space-y-0.5 leading-relaxed">
                                    <p>1. Estimate is valid for 30 days from issue date.</p>
                                    <p>2. Payment terms: 50% advance, balance on delivery.</p>
                                    <p>3. Subject to Sivakasi Jurisdiction.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-full md:w-80 space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between">
                            <span>Subtotal Amount:</span>
                            <span className="font-bold text-gray-800">₹{subtotal.toFixed(2)}</span>
                        </div>
                        {cgst > 0 && (
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>CGST ({parseFloat(quotation.gst_rate) / 2}%):</span>
                                <span>₹{cgst.toFixed(2)}</span>
                            </div>
                        )}
                        {sgst > 0 && (
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>SGST ({parseFloat(quotation.gst_rate) / 2}%):</span>
                                <span>₹{sgst.toFixed(2)}</span>
                            </div>
                        )}
                        {igst > 0 && (
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>IGST ({quotation.gst_rate}%):</span>
                                <span>₹{igst.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-base border-t border-gray-100 pt-2 font-bold text-gray-900">
                            <span>Grand Total:</span>
                            <span className="text-primary text-lg">₹{totalAmount.toFixed(2)}</span>
                        </div>

                        {/* Payment Settlement Summary */}
                        {(() => {
                            let history = [];
                            if (quotation.payment_history) {
                                try {
                                    const parsed = typeof quotation.payment_history === 'string' ? JSON.parse(quotation.payment_history) : quotation.payment_history;
                                    if (Array.isArray(parsed)) history = parsed;
                                } catch (e) {}
                            }
                            
                            let totalPaid = 0;
                            if (history.length > 0) {
                                totalPaid = history.reduce((sum, h) => sum + (parseFloat(h.amount) || 0), 0);
                            } else {
                                const adv = parseFloat(quotation.advance_amount || 0);
                                const sec = parseFloat(quotation.second_payment_amount || 0);
                                totalPaid = (adv + sec > 0) ? (adv + sec) : parseFloat(quotation.payment_amount || 0);
                                if (adv > 0) history.push({ note: 'Advance Received', date: quotation.quotation_date, amount: adv });
                                if (sec > 0) history.push({ note: 'Next Payment', date: quotation.quotation_date, amount: sec });
                            }

                            const pending = Math.max(0, totalAmount - totalPaid);
                            const statusText = totalPaid <= 0 ? 'Pending' : (totalPaid >= totalAmount ? 'Fully Paid' : 'Partially Paid');

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

                {/* Sign-off */}
                <div className="mt-6 flex justify-end border-t border-gray-100 pt-4">
                    <div className="text-center w-56 space-y-8">
                        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                            For {quotation.office_name}
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

export default QuotationPreview;
