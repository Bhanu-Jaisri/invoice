import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { formatCurrency } from '../utils/numberToWords';

const InvoicePreview = () => {
    const { id } = useParams();
    const location = useLocation();
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetch(`${import.meta.env.VITE_API_URL}/api/invoices/${id}`)
            .then(res => res.json())
            .then(data => {
                setInvoice(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [id]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = async () => {
        try {
            console.log('[PDF] Generation started (Dynamic Scale)...');
            setGenerating(true);
            const element = document.getElementById('invoice-content');

            if (!element) {
                console.error('[PDF] Element #invoice-content not found!');
                setGenerating(false);
                return;
            }

            const originalStyle = element.getAttribute('style') || '';
            const decorators = element.querySelectorAll('.print\\:hidden');
            decorators.forEach(el => {
                el.setAttribute('data-original-display', el.style.display);
                el.style.display = 'none';
            });

            // Robust A4 setup
            element.style.width = '750px';
            element.style.minHeight = '1050px';
            element.style.display = 'flex';
            element.style.flexDirection = 'column';
            element.style.margin = '0';
            element.style.padding = '10px';
            element.style.backgroundColor = '#ffffff';

            const currentHeight = element.scrollHeight;
            const targetHeight = 1080;
            let zoomLevel = 1;

            if (currentHeight > targetHeight) {
                zoomLevel = targetHeight / currentHeight;
                element.style.zoom = zoomLevel;
            }

            const html2pdf = (await import('html2pdf.js')).default;
            const opt = {
                margin: 5,
                filename: `invoice-${invoice.invoice_number}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2 / zoomLevel,
                    useCORS: true,
                    letterRendering: true,
                    logging: false,
                    windowWidth: 800
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: 'avoid-all' }
            };

            await html2pdf().set(opt).from(element).save();

            element.setAttribute('style', originalStyle);
            element.style.zoom = '';
            decorators.forEach(el => {
                el.style.display = el.getAttribute('data-original-display') || '';
                el.removeAttribute('data-original-display');
            });

            setGenerating(false);
        } catch (err) {
            console.error('[PDF] Error:', err);
            setGenerating(false);
            alert('PDF creation failed. Please use Print -> Save as PDF.');
        }
    };

    const autoDownloadTriggered = useRef(false);
    useEffect(() => {
        if (loading || !invoice || autoDownloadTriggered.current) return;
        const params = new URLSearchParams(window.location.search);
        const autoDownload = params.get('autoDownload') === 'true';
        const sessionKey = `pdf_done_${id}`;
        if (autoDownload && !sessionStorage.getItem(sessionKey)) {
            autoDownloadTriggered.current = true;
            sessionStorage.setItem(sessionKey, 'true');
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
            setTimeout(() => { handleDownload(); }, 300);
        }
    }, [loading, invoice, id]);

    if (loading) return <div className="p-8 text-center">Loading Invoice...</div>;
    if (!invoice) return <div className="p-8 text-center text-red-500">Invoice not found</div>;

    const subTotal = invoice.items.reduce((sum, item) => sum + (item.quantity * item.price_per_unit), 0);

    return (
        <div className="max-w-5xl mx-auto mb-10">
            <div className="flex justify-between items-center mb-6 print:hidden">
                <Link to="/" className="flex items-center text-gray-600 hover:text-primary">
                    <ArrowLeft size={20} className="mr-2" />
                    Back to Dashboard
                </Link>
                <div className="flex space-x-2">
                    <button onClick={handleDownload} disabled={generating} className="flex items-center space-x-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <Download size={20} />
                        <span>{generating ? 'Generating...' : 'Download PDF'}</span>
                    </button>
                    <button onClick={handlePrint} className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition-colors">
                        <Printer size={20} />
                        <span>Print</span>
                    </button>
                </div>
            </div>

            <div className="bg-white p-2 print:p-0 flex flex-col" id="invoice-content" style={{ minHeight: '1050px' }}>
                {/* TOP MATTER */}
                <div className="flex-none">
                    <div className="bg-dark text-gray-900 p-4 rounded-lg relative overflow-hidden mb-2 print:p-4 print:mb-2 print:rounded-none">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary transform rotate-45 translate-x-32 -translate-y-32 opacity-20 print:hidden"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary transform -rotate-45 -translate-x-16 translate-y-16 opacity-20 print:hidden"></div>

                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-bold uppercase tracking-wider text-primary mb-1 print:text-xl">NRG JAISRI PRINTERS</h1>
                                <div className="text-xs text-gray-700 leading-tight max-w-md">
                                    8/26/D, KANNA NAGAR, Pudur Sivakasi, Naranapuram,<br />
                                    Virudhunagar, Tamil Nadu - 626 189.<br />
                                    Mobile: 9842719397 | Email: nrgjaisriprinters@gmail.com
                                </div>
                                <div className="mt-2 flex gap-4 text-xs">
                                    <div>
                                        <span className="text-gray-500 block text-xs uppercase">GSTIN</span>
                                        <span className="font-bold text-gray-800">33AGVPR1083P1ZK</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-xs uppercase">State</span>
                                        <span>Tamil Nadu</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-row justify-between items-start mt-4 px-4 print:mt-1 print:px-0 gap-4">
                        <div className="w-1/2">
                            {invoice.status === 'Cancelled' && (
                                <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-bold text-center mb-4 border-2 border-red-200 uppercase tracking-widest text-sm">
                                    This Invoice is Cancelled / Void
                                </div>
                            )}
                            <h3 className="text-primary font-bold text-lg mb-2">Bill To</h3>
                            <div className="text-xl font-bold text-gray-800">{invoice.customer_name}</div>
                            <div className="text-gray-600 whitespace-pre-line text-sm">{invoice.customer_address}</div>
                            <div className="mt-2 text-sm">
                                <span className="font-bold">GSTIN/UIN:</span> {invoice.gstin || 'N/A'}
                            </div>
                        </div>
                        <div className="w-1/2 text-right">
                            <h2 className="text-2xl font-bold text-gray-800 mb-2 uppercase">Tax Invoice</h2>
                            <div className="flex justify-end gap-6 text-xs text-right">
                                <div>
                                    <div className="font-bold text-gray-600 uppercase text-[10px]">Invoice No.</div>
                                    <div className="font-bold text-gray-800 text-sm">{invoice.invoice_number}</div>
                                </div>
                                <div>
                                    <div className="font-bold text-gray-600 uppercase text-[10px]">Date</div>
                                    <div className="font-bold text-gray-800 text-sm">{new Date(invoice.invoice_date).toLocaleDateString()}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Middle - Table Area */}
                <div className="flex-1 relative flex flex-col p-4 md:p-8 pt-0 main-content">
                    {/* Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
                        <div className="text-[60px] font-black text-gray-300 opacity-[0.30] -rotate-[25deg] whitespace-nowrap select-none uppercase tracking-widest">
                            NRG JAISRI PRINTERS
                        </div>
                    </div>

                    <div className="relative" style={{ zIndex: 1 }}>
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-dark text-gray-900 text-sm uppercase">
                                    <th className="p-2 text-left w-12">Qty</th>
                                    <th className="p-2 text-left">Item Name</th>
                                    <th className="p-2 text-center w-24">HSN/SAC</th>
                                    <th className="p-2 text-center w-20">Unit</th>
                                    <th className="p-2 text-right w-24">Price/Unit</th>
                                    <th className="p-2 text-right w-28">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm text-gray-700">
                                {invoice.items.map((item, idx) => (
                                    <tr key={idx} className="border-b border-gray-100">
                                        <td className="p-2 font-bold">{item.quantity}</td>
                                        <td className="p-2 font-medium">{item.description}</td>
                                        <td className="p-2 text-center">{item.hsn_sac}</td>
                                        <td className="p-2 text-center">{item.unit || '1'}</td>
                                        <td className="p-2 text-right">₹{parseFloat(item.price_per_unit).toFixed(2)}</td>
                                        <td className="p-2 text-right font-bold text-gray-900">₹{parseFloat(item.amount).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* BOTTOM (TOTALS & SIGNATORY) */}
                <div className="flex-none mt-auto">
                    <div className="flex flex-row border-t-2 border-gray-100 pt-2">
                        <div className="w-[65%] border-r border-gray-100 pr-4">
                            <div className="text-[10px] text-primary font-bold uppercase mb-1">Invoice Amount In Words</div>
                            <div className="text-gray-800 text-xs font-bold italic mb-3">
                                {formatCurrency(parseFloat(invoice.total_amount))}
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-3">
                                <div>
                                    <div className="text-[10px] text-primary font-bold uppercase mb-1">Bank Details</div>
                                    <div className="text-[10px] text-gray-700 leading-tight">
                                        <strong>Bank:</strong> Tamilnad Mercantile Bank<br />
                                        <strong>Branch:</strong> Sivakasi Palaniandavar<br />
                                        <strong>Account Name:</strong> Jaisri Printers<br />
                                        <strong>A/c No:</strong> 7689 | <strong>IFSC:</strong> 767
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-primary font-bold uppercase mb-1">Terms And Conditions</div>
                                    <div className="text-[9px] text-gray-500 leading-tight">
                                        1. Certified that the particulars given above are true and correct<br />
                                        2. Good once sold cannot be taken back.<br />
                                        3. Our responsibility ceases at godown.<br />
                                        4. Interest at 24% p.a. for late payment.<br />
                                        5. Subject to Sivakasi Jurisidiction.
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="w-[35%] pl-4">
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-gray-600">
                                    <span>Sub Total</span>
                                    <span className="font-bold text-gray-800">₹{parseFloat(invoice.subtotal || subTotal).toFixed(2)}</span>
                                </div>
                                {invoice.cgst_amount > 0 && (
                                    <div className="flex justify-between text-xs text-gray-600">
                                        <span>CGST ({invoice.cgst_rate}%)</span>
                                        <span className="font-bold text-gray-800">₹{parseFloat(invoice.cgst_amount).toFixed(2)}</span>
                                    </div>
                                )}
                                {invoice.sgst_amount > 0 && (
                                    <div className="flex justify-between text-xs text-gray-600">
                                        <span>SGST ({invoice.sgst_rate}%)</span>
                                        <span className="font-bold text-gray-800">₹{parseFloat(invoice.sgst_amount).toFixed(2)}</span>
                                    </div>
                                )}
                                {invoice.igst_amount > 0 && (
                                    <div className="flex justify-between text-xs text-gray-600">
                                        <span>IGST ({invoice.igst_rate}%)</span>
                                        <span className="font-bold text-gray-800">₹{parseFloat(invoice.igst_amount).toFixed(2)}</span>
                                    </div>
                                )}
                                {invoice.round_off !== 0 && (
                                    <div className="flex justify-between text-xs text-gray-600">
                                        <span>Round Off</span>
                                        <span className="font-bold text-gray-800">₹{parseFloat(invoice.round_off || 0).toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between p-2 bg-primary text-white rounded mt-2">
                                    <span className="font-bold text-xs uppercase">Total</span>
                                    <span className="font-bold text-lg">₹{parseFloat(invoice.total_amount).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="flex justify-end pr-4">
                            <div className="text-right">
                                <div className="text-xs font-bold text-gray-800 mb-8 lowercase">For: <span className="uppercase">NRG JAISRI PRINTERS</span></div>
                                <div className="text-[10px] text-gray-600">Authorized Signatory</div>
                            </div>
                        </div>
                        <div className="mt-8 text-center text-[10px] text-gray-400">
                            Powered by NRG JAISRI PRINTERS
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 0mm; }
                    body { margin: 0; padding: 0; background: #fff; }
                    .print\\:hidden { display: none !important; }
                    body * { visibility: hidden; -webkit-print-color-adjust: exact; }
                    #invoice-content, #invoice-content * { visibility: visible; }
                    #invoice-content {
                        position: absolute; left: 0; top: 0;
                        width: 210mm !important;
                        min-height: 297mm !important;
                        margin: 0 !important;
                        padding: 10mm !important;
                        box-sizing: border-box;
                        display: flex !important;
                        flex-direction: column !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default InvoicePreview;
