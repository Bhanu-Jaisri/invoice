// Utility functions for City Extraction and Word / Excel / PDF Document Exports

export const COMMON_CITIES = [
    'Sivakasi', 'Virudhunagar', 'Madurai', 'Chennai', 'Coimbatore', 'Tiruchirappalli', 'Trichy',
    'Tirunelveli', 'Salem', 'Erode', 'Tiruppur', 'Vellore', 'Thanjavur', 'Dindigul',
    'Rajapalayam', 'Srivilliputhur', 'Aruppukkottai', 'Sattur', 'Theni', 'Nagercoil',
    'Kanchipuram', 'Karur', 'Namakkal', 'Puducherry', 'Pondicherry', 'Tuticorin', 'Thoothukudi',
    'Cuddalore', 'Kumbakonam', 'Kanyakumari', 'Hosur', 'Pollachi', 'Karaikudi', 'Nagapattinam',
    'Bengaluru', 'Bangalore', 'Hyderabad', 'Mumbai', 'Delhi', 'Kolkata', 'Kochi', 'Trivandrum'
];

/**
 * Normalizes a word or city name to standard Title Case (e.g. 'sivakasi', 'SIVAKASI', 'SIvakasi' -> 'Sivakasi').
 */
export const toTitleCase = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

/**
 * Extracts a city name from an address string and formats it in uniform Title Case.
 * Uses known city matching first, followed by heuristic address segment parsing.
 */
export const extractCityFromAddress = (address) => {
    if (!address || typeof address !== 'string') return '';
    const cleaned = address.trim();
    if (!cleaned) return '';

    // 1. Check known common cities (case-insensitive word boundary match)
    for (const city of COMMON_CITIES) {
        const regex = new RegExp(`\\b${city}\\b`, 'i');
        if (regex.test(cleaned)) {
            return toTitleCase(city);
        }
    }

    // 2. Fallback heuristic: parse address lines / comma segments from bottom-up
    const parts = cleaned.split(/[\n,;]+/).map(p => p.trim()).filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
        let part = parts[i]
            .replace(/[-–—]?\s*\b\d{3}\s*\d{3}\b/g, '')
            .replace(/[-–—]?\s*\b\d{6}\b/g, '')
            .replace(/[.\-–—\s]+$/, '')
            .trim();

        // Skip state or country names
        if (/^(india|tamil nadu|tamilnadu|kerala|karnataka|andhra pradesh|telangana|maharashtra)$/i.test(part)) {
            continue;
        }

        // Must be reasonable length and not just numbers
        if (part.length >= 2 && !/^\d+$/.test(part)) {
            // If the segment has sub-words, take the city portion
            const subWords = part.split(/\s+/);
            if (subWords.length > 3) {
                return toTitleCase(subWords.slice(-2).join(' '));
            }
            return toTitleCase(part);
        }
    }

    return parts[parts.length - 1] ? toTitleCase(parts[parts.length - 1]) : '';
};

/**
 * Exports a tabular report as a native Microsoft Word (.doc) document.
 * Automatically chooses optimal A4 orientation (Landscape if > 5 columns, Portrait if <= 5 columns)
 * and wraps all content safely within A4 page dimensions so no columns are ever cut off.
 */
export const exportReportToWord = ({
    title = 'REPORT',
    company = {},
    subtitle = '',
    filterNotes = [],
    headers = [],
    rows = [],
    filename = 'Report',
    orientation = 'auto'
}) => {
    const officeName = company.name || 'NRG JAISRI PRINTERS';
    const officeAddress = company.address || '';
    const officeGstin = company.gstin || '';
    const officeMobile = company.mobile || '';

    // Auto-detect orientation: if more than 5 columns or table headers are wide, use landscape
    const isLandscape = orientation === 'landscape' || (orientation === 'auto' && headers.length > 5);

    const filterHtml = filterNotes.length > 0
        ? `<div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 8px 12px; margin: 10px 0 14px 0; border-radius: 6px; font-size: 9.5pt; color: #166534;">
            <strong>Applied Filters:</strong> ${filterNotes.join(' &nbsp;|&nbsp; ')}
           </div>`
        : '';

    const colWidthPct = headers.length > 0 ? (100 / headers.length).toFixed(1) : 'auto';

    const ths = headers.map((h, i) => `
        <th style="background-color: #0923b5; color: #ffffff; padding: 7px 8px; font-size: 8.5pt; text-align: left; border: 1px solid #0923b5; font-weight: bold; text-transform: uppercase; width: ${i === 0 ? '4%' : `${colWidthPct}%`};">
            ${h}
        </th>
    `).join('');

    const trs = rows.map((r, i) => {
        const bg = i % 2 === 0 ? '#ffffff' : '#f9fafb';
        const tds = r.map((c, colIdx) => `
            <td style="padding: 6px 8px; font-size: 8.5pt; border: 1px solid #e5e7eb; color: #1f2937; word-break: break-word; overflow-wrap: break-word; ${colIdx === 0 ? 'font-weight: bold; color: #4b5563; text-align: center;' : ''}">
                ${c === undefined || c === null || c === '' ? '-' : String(c)}
            </td>
        `).join('');
        return `<tr style="background-color: ${bg};">${tds}</tr>`;
    }).join('');

    const wordHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset='utf-8'>
            <title>${title}</title>
            <!--[if gte mso 9]>
            <xml>
                <w:WordDocument>
                    <w:View>Print</w:View>
                    <w:Zoom>100</w:Zoom>
                    <w:DoNotOptimizeForBrowser/>
                </w:WordDocument>
            </xml>
            <![endif]-->
            <style>
                @page Section1 {
                    size: ${isLandscape ? '297mm 210mm' : '210mm 297mm'};
                    mso-page-orientation: ${isLandscape ? 'landscape' : 'portrait'};
                    margin: 10mm 10mm 10mm 10mm;
                    mso-header-margin: 8mm;
                    mso-footer-margin: 8mm;
                }
                div.Section1 { page: Section1; }
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; margin: 0; padding: 0; }
                table { width: 100% !important; max-width: 100% !important; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; table-layout: fixed; }
                th, td { font-family: 'Segoe UI', Arial, sans-serif; word-wrap: break-word; overflow-wrap: break-word; }
                .company-name { font-size: 16pt; font-weight: 800; color: #0923b5; margin: 0; }
                .meta-text { font-size: 9pt; color: #4b5563; margin-top: 2px; }
                .report-title { font-size: 13pt; font-weight: 800; color: #111827; margin: 0; }
            </style>
        </head>
        <body>
            <div class="Section1">
                <div style="border-bottom: 2px solid #0923b5; padding-bottom: 10px; margin-bottom: 12px;">
                    <table style="width: 100%; border: none; margin: 0;">
                        <tr>
                            <td style="vertical-align: top; border: none; padding: 0;">
                                <h1 class="company-name">${officeName}</h1>
                                ${officeAddress ? `<div class="meta-text">${officeAddress.replace(/\n/g, ', ')}</div>` : ''}
                                ${officeGstin ? `<div class="meta-text">GSTIN: <strong>${officeGstin}</strong> &nbsp;|&nbsp; Mobile: <strong>${officeMobile}</strong></div>` : ''}
                            </td>
                            <td style="vertical-align: top; text-align: right; border: none; padding: 0;">
                                <div class="report-title">${title}</div>
                                <div class="meta-text">Generated: <strong>${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
                                <div class="meta-text">Total Records: <strong>${rows.length}</strong></div>
                            </td>
                        </tr>
                    </table>
                </div>

                ${filterHtml}

                <table>
                    <thead>
                        <tr>${ths}</tr>
                    </thead>
                    <tbody>
                        ${trs}
                    </tbody>
                </table>

                <div style="margin-top: 20px; font-size: 8pt; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 8px;">
                    Report generated by ${officeName} Invoice System &nbsp;•&nbsp; Page layout: A4 ${isLandscape ? 'Landscape' : 'Portrait'} &nbsp;•&nbsp; ${new Date().toLocaleString()}
                </div>
            </div>
        </body>
        </html>
    `;

    const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Exports a tabular report as a formatted Excel spreadsheet (.xls format with styling).
 */
export const exportReportToExcel = ({
    title = 'REPORT',
    company = {},
    filterNotes = [],
    headers = [],
    rows = [],
    filename = 'Report'
}) => {
    const officeName = company.name || 'NRG JAISRI PRINTERS';

    const ths = headers.map(h => `
        <th style="background-color: #0923b5; color: #ffffff; font-weight: bold; border: 1px solid #0923b5; padding: 6px 10px; font-size: 10pt;">
            ${h}
        </th>
    `).join('');

    const trs = rows.map((r, i) => {
        const bg = i % 2 === 0 ? '#ffffff' : '#f9fafb';
        const tds = r.map((c, colIdx) => `
            <td style="border: 1px solid #d1d5db; padding: 6px 10px; font-size: 9.5pt; ${colIdx === 0 ? 'font-weight: bold;' : ''}">
                ${c === undefined || c === null || c === '' ? '-' : String(c)}
            </td>
        `).join('');
        return `<tr style="background-color: ${bg};">${tds}</tr>`;
    }).join('');

    const filterText = filterNotes.length > 0 ? `Filters: ${filterNotes.join(' | ')}` : '';

    const excelHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="utf-8">
            <!--[if gte mso 9]>
            <xml>
                <x:ExcelWorkbook>
                    <x:ExcelWorksheets>
                        <x:ExcelWorksheet>
                            <x:Name>${title.slice(0, 31)}</x:Name>
                            <x:WorksheetOptions>
                                <x:DisplayGridlines/>
                            </x:WorksheetOptions>
                        </x:ExcelWorksheet>
                    </x:ExcelWorksheets>
                </x:ExcelWorkbook>
            </xml>
            <![endif]-->
        </head>
        <body>
            <table>
                <tr>
                    <td colspan="${headers.length}" style="font-size: 16pt; font-weight: bold; color: #0923b5;">
                        ${officeName}
                    </td>
                </tr>
                <tr>
                    <td colspan="${headers.length}" style="font-size: 12pt; font-weight: bold; color: #111827;">
                        ${title}
                    </td>
                </tr>
                ${filterText ? `<tr><td colspan="${headers.length}" style="font-size: 9.5pt; color: #047857; font-weight: bold;">${filterText}</td></tr>` : ''}
                <tr>
                    <td colspan="${headers.length}" style="font-size: 9pt; color: #6b7280;">
                        Date: ${new Date().toLocaleDateString()} | Total Records: ${rows.length}
                    </td>
                </tr>
                <tr><td colspan="${headers.length}"></td></tr>
                <thead>
                    <tr>${ths}</tr>
                </thead>
                <tbody>
                    ${trs}
                </tbody>
            </table>
        </body>
        </html>
    `;

    const blob = new Blob(['\ufeff', excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Exports a single invoice as a fully structured Microsoft Word document (.doc).
 */
export const exportInvoiceToWord = (invoice, items = [], company = {}, filename = 'Invoice') => {
    const officeName = invoice.office_name || company.name || 'NRG JAISRI PRINTERS';
    const officeAddress = invoice.office_address || company.address || '';
    const officeGstin = invoice.office_gstin || company.gstin || '';
    const officeMobile = invoice.office_mobile || company.mobile || '';
    const officeEmail = invoice.office_email || company.email || '';

    const customerCity = extractCityFromAddress(invoice.customer_address || '');

    const itemRows = (items || []).map((item, idx) => {
        const qty = item.quantity || 1;
        const rate = parseFloat(item.price_per_unit || 0).toFixed(2);
        const amt = parseFloat(item.amount || (qty * rate)).toFixed(2);
        return `
            <tr>
                <td style="border: 1px solid #d1d5db; padding: 6px 8px; text-align: center; font-size: 9pt;">${idx + 1}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px 8px; font-size: 9pt; font-weight: bold;">${item.description || '-'}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px 8px; text-align: center; font-size: 9pt;">${item.hsn_sac || '-'}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px 8px; text-align: center; font-size: 9pt;">${qty} ${item.unit || ''}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px 8px; text-align: right; font-size: 9pt;">₹${rate}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px 8px; text-align: right; font-size: 9pt; font-weight: bold;">₹${amt}</td>
            </tr>
        `;
    }).join('');

    const wordHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset='utf-8'>
            <title>Tax Invoice - ${invoice.invoice_number}</title>
            <!--[if gte mso 9]>
            <xml>
                <w:WordDocument>
                    <w:View>Print</w:View>
                    <w:Zoom>100</w:Zoom>
                    <w:DoNotOptimizeForBrowser/>
                </w:WordDocument>
            </xml>
            <![endif]-->
            <style>
                @page Section1 {
                    size: 210mm 297mm;
                    mso-page-orientation: portrait;
                    margin: 10mm 10mm 10mm 10mm;
                    mso-header-margin: 8mm;
                    mso-footer-margin: 8mm;
                }
                div.Section1 { page: Section1; }
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; margin: 0; padding: 0; }
                table { width: 100% !important; max-width: 100% !important; border-collapse: collapse; margin-top: 8px; table-layout: fixed; }
                th, td { font-family: 'Segoe UI', Arial, sans-serif; word-wrap: break-word; overflow-wrap: break-word; }
                .title-header { text-align: center; border-bottom: 2px solid #0923b5; padding-bottom: 10px; margin-bottom: 12px; }
                .bold { font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="Section1">
                <div class="title-header">
                <div style="font-size: 20pt; font-weight: 800; color: #0923b5;">${officeName}</div>
                ${officeAddress ? `<div style="font-size: 10pt; color: #4b5563;">${officeAddress.replace(/\n/g, ', ')}</div>` : ''}
                <div style="font-size: 10pt; color: #4b5563;">
                    GSTIN: <strong>${officeGstin}</strong> &nbsp;|&nbsp; Mobile: <strong>${officeMobile}</strong> &nbsp;|&nbsp; Email: <strong>${officeEmail}</strong>
                </div>
                <div style="display: inline-block; margin-top: 6px; padding: 2px 16px; background-color: #0923b5; color: #ffffff; font-weight: bold; font-size: 11pt; border-radius: 4px;">
                    TAX INVOICE
                </div>
            </div>

            <!-- Invoice & Customer Meta Details Table -->
            <table style="margin-bottom: 16px; border: 1px solid #d1d5db;">
                <tr>
                    <td style="width: 50%; vertical-align: top; padding: 10px; border-right: 1px solid #d1d5db; background-color: #f9fafb;">
                        <div style="font-size: 9.5pt; font-weight: bold; color: #0923b5; margin-bottom: 4px; text-transform: uppercase;">Customer Details (Billed To):</div>
                        <div style="font-size: 11pt; font-weight: bold; color: #111827;">${invoice.customer_name || '-'}</div>
                        ${invoice.customer_address ? `<div style="font-size: 9.5pt; color: #4b5563; margin-top: 2px;">${invoice.customer_address.replace(/\n/g, '<br/>')}</div>` : ''}
                        ${customerCity ? `<div style="font-size: 9.5pt; color: #0923b5; font-weight: bold; margin-top: 3px;">City: ${customerCity}</div>` : ''}
                        ${invoice.gstin ? `<div style="font-size: 9.5pt; color: #374151; margin-top: 2px;">GSTIN: <strong>${invoice.gstin}</strong></div>` : ''}
                        ${invoice.customer_email ? `<div style="font-size: 9pt; color: #6b7280;">Email: ${invoice.customer_email}</div>` : ''}
                    </td>
                    <td style="width: 50%; vertical-align: top; padding: 10px; background-color: #ffffff;">
                        <table style="width: 100%; border: none; margin: 0;">
                            <tr>
                                <td style="padding: 3px 0; font-size: 9.5pt; color: #4b5563;">Invoice No:</td>
                                <td style="padding: 3px 0; font-size: 10pt; font-weight: bold; color: #111827; text-align: right;">${invoice.invoice_number || '-'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 3px 0; font-size: 9.5pt; color: #4b5563;">Invoice Date:</td>
                                <td style="padding: 3px 0; font-size: 9.5pt; font-weight: bold; color: #111827; text-align: right;">${invoice.invoice_date || '-'}</td>
                            </tr>
                            ${invoice.bill_number ? `
                            <tr>
                                <td style="padding: 3px 0; font-size: 9.5pt; color: #4b5563;">Bill No:</td>
                                <td style="padding: 3px 0; font-size: 9.5pt; font-weight: bold; color: #111827; text-align: right;">${invoice.bill_number}</td>
                            </tr>` : ''}
                            <tr>
                                <td style="padding: 3px 0; font-size: 9.5pt; color: #4b5563;">State:</td>
                                <td style="padding: 3px 0; font-size: 9.5pt; font-weight: bold; color: #111827; text-align: right;">${invoice.office_state || 'Tamil Nadu'}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <!-- Itemized Table -->
            <table style="margin-bottom: 16px;">
                <thead>
                    <tr style="background-color: #0923b5; color: #ffffff;">
                        <th style="border: 1px solid #0923b5; padding: 8px 6px; font-size: 9.5pt; text-align: center; width: 40px;">#</th>
                        <th style="border: 1px solid #0923b5; padding: 8px 6px; font-size: 9.5pt; text-align: left;">Item Description</th>
                        <th style="border: 1px solid #0923b5; padding: 8px 6px; font-size: 9.5pt; text-align: center; width: 80px;">HSN/SAC</th>
                        <th style="border: 1px solid #0923b5; padding: 8px 6px; font-size: 9.5pt; text-align: center; width: 80px;">Qty</th>
                        <th style="border: 1px solid #0923b5; padding: 8px 6px; font-size: 9.5pt; text-align: right; width: 90px;">Rate (₹)</th>
                        <th style="border: 1px solid #0923b5; padding: 8px 6px; font-size: 9.5pt; text-align: right; width: 110px;">Amount (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemRows}
                </tbody>
            </table>

            <!-- Totals & Tax Table -->
            <table style="border: none;">
                <tr>
                    <td style="width: 55%; vertical-align: top; padding-right: 16px;">
                        <div style="border: 1px solid #e5e7eb; padding: 10px; border-radius: 4px; background-color: #f9fafb;">
                            <div style="font-size: 9pt; font-weight: bold; color: #0923b5; text-transform: uppercase;">Bank Account Details:</div>
                            <div style="font-size: 9pt; color: #374151; margin-top: 3px; line-height: 1.4;">
                                Bank: <strong>${invoice.bank_name || 'TAMILNAD MERCANTILE BANK'}</strong><br/>
                                Branch: <strong>${invoice.bank_branch || 'SIVAKASI'}</strong><br/>
                                A/c No: <strong>${invoice.account_no || '003150050802592'}</strong><br/>
                                IFSC Code: <strong>${invoice.ifsc_code || 'TMBL0000003'}</strong>
                            </div>
                        </div>
                    </td>
                    <td style="width: 45%; vertical-align: top;">
                        <table style="width: 100%; border: 1px solid #d1d5db;">
                            <tr>
                                <td style="padding: 5px 8px; font-size: 9pt; border-bottom: 1px solid #e5e7eb;">Sub Total</td>
                                <td style="padding: 5px 8px; font-size: 9.5pt; font-weight: bold; text-align: right; border-bottom: 1px solid #e5e7eb;">₹${parseFloat(invoice.subtotal || 0).toFixed(2)}</td>
                            </tr>
                            ${invoice.cgst_amount > 0 ? `
                            <tr>
                                <td style="padding: 5px 8px; font-size: 9pt; border-bottom: 1px solid #e5e7eb;">CGST (${invoice.cgst_rate}%)</td>
                                <td style="padding: 5px 8px; font-size: 9pt; font-weight: bold; text-align: right; border-bottom: 1px solid #e5e7eb;">₹${parseFloat(invoice.cgst_amount).toFixed(2)}</td>
                            </tr>` : ''}
                            ${invoice.sgst_amount > 0 ? `
                            <tr>
                                <td style="padding: 5px 8px; font-size: 9pt; border-bottom: 1px solid #e5e7eb;">SGST (${invoice.sgst_rate}%)</td>
                                <td style="padding: 5px 8px; font-size: 9pt; font-weight: bold; text-align: right; border-bottom: 1px solid #e5e7eb;">₹${parseFloat(invoice.sgst_amount).toFixed(2)}</td>
                            </tr>` : ''}
                            ${invoice.igst_amount > 0 ? `
                            <tr>
                                <td style="padding: 5px 8px; font-size: 9pt; border-bottom: 1px solid #e5e7eb;">IGST (${invoice.igst_rate}%)</td>
                                <td style="padding: 5px 8px; font-size: 9pt; font-weight: bold; text-align: right; border-bottom: 1px solid #e5e7eb;">₹${parseFloat(invoice.igst_amount).toFixed(2)}</td>
                            </tr>` : ''}
                            ${invoice.round_off ? `
                            <tr>
                                <td style="padding: 5px 8px; font-size: 9pt; border-bottom: 1px solid #e5e7eb;">Round Off</td>
                                <td style="padding: 5px 8px; font-size: 9pt; font-weight: bold; text-align: right; border-bottom: 1px solid #e5e7eb;">₹${parseFloat(invoice.round_off).toFixed(2)}</td>
                            </tr>` : ''}
                            <tr style="background-color: #0923b5; color: #ffffff;">
                                <td style="padding: 8px; font-size: 11pt; font-weight: bold;">GRAND TOTAL</td>
                                <td style="padding: 8px; font-size: 12pt; font-weight: bold; text-align: right;">₹${parseFloat(invoice.total_amount).toFixed(2)}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <!-- Signatory Footer -->
            <div style="margin-top: 30px; text-align: right;">
                <div style="font-size: 9.5pt; font-weight: bold; color: #374151;">For ${officeName}</div>
                <div style="height: 50px;"></div>
                <div style="font-size: 9pt; color: #6b7280; border-top: 1px solid #9ca3af; display: inline-block; padding-top: 4px; min-width: 160px; text-align: center;">
                    Authorized Signatory
                </div>
            </div>
            </div>
        </body>
        </html>
    `;

    const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Exports a full single order as a structured A4 Word document (.doc) with complete specs,
 * item sets, designs breakdown, payment history, and terms.
 * Automatically selects optimal A4 page orientation (Landscape if multi-item/designs, Portrait otherwise).
 */
export const exportOrderToWord = (order, items = [], company = {}, filename = 'Order') => {
    const officeName = order.office_name || company.name || 'NRG JAISRI PRINTERS';
    const officeAddress = order.office_address || company.address || '';
    const officeGstin = order.office_gstin || company.gstin || '';
    const officeMobile = order.office_mobile || company.mobile || '';
    const officeEmail = order.office_email || company.email || '';

    const customerCity = extractCityFromAddress(order.customer_address || '');
    const isLandscape = items.length > 2 || items.some(it => it.designs && it.designs.length > 0);

    const itemRows = (items || []).map((item, idx) => {
        const qty = item.quantity || 1;
        const rate = parseFloat(item.price_per_unit || 0).toFixed(2);
        const total = parseFloat((item.price_per_unit ? qty * item.price_per_unit : order.total_amount) || 0).toFixed(2);

        let detailsText = item.details || item.custom_item_type || '-';
        if (item.designs && Array.isArray(item.designs) && item.designs.length > 0) {
            const dText = item.designs.map(d => `D#${d.design_number}: ${d.quantity || 0}`).join(', ');
            detailsText += `<br/><span style="font-size: 8pt; color: #4b5563;">Designs: ${dText}</span>`;
        }

        return `
            <tr>
                <td style="border: 1px solid #d1d5db; padding: 6px 4px; text-align: center; font-size: 8.5pt;">${idx + 1}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px 6px; font-size: 8.5pt; font-weight: bold; color: #0923b5;">${item.item_category || item.item_type || '-'}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px 6px; font-size: 8.5pt;">${detailsText}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px 6px; text-align: center; font-size: 8.5pt;">${item.size || '-'}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px 6px; text-align: center; font-size: 8.5pt; font-weight: bold;">${item.slip_number || '-'}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px 6px; text-align: center; font-size: 8.5pt;">${item.sheeter || '-'}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px 6px; text-align: center; font-size: 8.5pt;">${item.bottom_color ? `B:${item.bottom_color}` : ''} ${item.top_color ? `T:${item.top_color}` : ''}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px 6px; text-align: center; font-size: 8.5pt; font-weight: bold;">${qty}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px 6px; text-align: right; font-size: 8.5pt;">₹${rate}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px 6px; text-align: right; font-size: 8.5pt; font-weight: bold;">₹${total}</td>
            </tr>
        `;
    }).join('');

    let paymentHistoryRows = '';
    if (order.payment_history) {
        try {
            const hist = typeof order.payment_history === 'string' ? JSON.parse(order.payment_history) : order.payment_history;
            if (Array.isArray(hist) && hist.length > 0) {
                paymentHistoryRows = hist.map((p, i) => `
                    <tr>
                        <td style="padding: 4px 8px; font-size: 8.5pt; border: 1px solid #e5e7eb;">${p.note || `Payment #${i + 1}`}</td>
                        <td style="padding: 4px 8px; font-size: 8.5pt; border: 1px solid #e5e7eb;">${p.date || '-'}</td>
                        <td style="padding: 4px 8px; font-size: 8.5pt; border: 1px solid #e5e7eb; text-align: right; font-weight: bold;">₹${parseFloat(p.amount || 0).toFixed(2)}</td>
                    </tr>
                `).join('');
            }
        } catch (e) {}
    }

    const subtotal = parseFloat(order.subtotal || 0);
    const cgst = parseFloat(order.cgst_amount || 0);
    const sgst = parseFloat(order.sgst_amount || 0);
    const igst = parseFloat(order.igst_amount || 0);
    const totalGst = cgst + sgst + igst;
    const totalAmount = parseFloat(order.total_amount || 0);
    const advancePaid = parseFloat(order.advance_amount || 0) + parseFloat(order.second_payment_amount || 0);
    const balanceDue = Math.max(0, totalAmount - advancePaid);

    const wordHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset='utf-8'>
            <title>Order Form - ${order.order_number}</title>
            <!--[if gte mso 9]>
            <xml>
                <w:WordDocument>
                    <w:View>Print</w:View>
                    <w:Zoom>100</w:Zoom>
                    <w:DoNotOptimizeForBrowser/>
                </w:WordDocument>
            </xml>
            <![endif]-->
            <style>
                @page Section1 {
                    size: ${isLandscape ? '297mm 210mm' : '210mm 297mm'};
                    mso-page-orientation: ${isLandscape ? 'landscape' : 'portrait'};
                    margin: 10mm 10mm 10mm 10mm;
                    mso-header-margin: 8mm;
                    mso-footer-margin: 8mm;
                }
                div.Section1 { page: Section1; }
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; margin: 0; padding: 0; }
                table { width: 100% !important; max-width: 100% !important; border-collapse: collapse; margin-top: 8px; margin-bottom: 12px; table-layout: fixed; }
                th, td { font-family: 'Segoe UI', Arial, sans-serif; word-wrap: break-word; overflow-wrap: break-word; }
                .title-header { text-align: center; border-bottom: 2px solid #047857; padding-bottom: 8px; margin-bottom: 10px; }
            </style>
        </head>
        <body>
            <div class="Section1">
                <div class="title-header">
                    <div style="font-size: 18pt; font-weight: 800; color: #0923b5;">${officeName}</div>
                    ${officeAddress ? `<div style="font-size: 9.5pt; color: #4b5563;">${officeAddress.replace(/\n/g, ', ')}</div>` : ''}
                    <div style="font-size: 9.5pt; color: #4b5563;">
                        GSTIN: <strong>${officeGstin}</strong> &nbsp;|&nbsp; Mobile: <strong>${officeMobile}</strong> &nbsp;|&nbsp; Email: <strong>${officeEmail}</strong>
                    </div>
                    <div style="display: inline-block; margin-top: 6px; padding: 3px 18px; background-color: #047857; color: #ffffff; font-weight: bold; font-size: 10.5pt; border-radius: 4px; text-transform: uppercase;">
                        JOB ORDER FORM
                    </div>
                </div>

                <!-- Meta & Customer Table -->
                <table style="border: 1px solid #d1d5db; margin-bottom: 10px;">
                    <tr>
                        <td style="width: 50%; vertical-align: top; padding: 8px 10px; border-right: 1px solid #d1d5db; background-color: #f9fafb;">
                            <div style="font-size: 9pt; font-weight: bold; color: #047857; text-transform: uppercase; margin-bottom: 2px;">Customer Details:</div>
                            <div style="font-size: 11pt; font-weight: bold; color: #111827;">${order.customer_name || '-'}</div>
                            ${order.customer_address ? `<div style="font-size: 9pt; color: #4b5563; margin-top: 2px;">${order.customer_address.replace(/\n/g, '<br/>')}</div>` : ''}
                            ${customerCity ? `<div style="font-size: 9pt; color: #0923b5; font-weight: bold; margin-top: 2px;">City: ${customerCity}</div>` : ''}
                            ${order.customer_mobile ? `<div style="font-size: 9pt; color: #374151; margin-top: 2px;">Mobile: <strong>${order.customer_mobile}</strong></div>` : ''}
                            ${order.gstin ? `<div style="font-size: 9pt; color: #374151; margin-top: 2px;">GSTIN: <strong>${order.gstin}</strong></div>` : ''}
                        </td>
                        <td style="width: 50%; vertical-align: top; padding: 8px 10px; background-color: #ffffff;">
                            <table style="width: 100%; border: none; margin: 0;">
                                <tr>
                                    <td style="padding: 2px 0; font-size: 9pt; color: #4b5563;">Order No:</td>
                                    <td style="padding: 2px 0; font-size: 10pt; font-weight: bold; color: #0923b5; text-align: right;">${order.order_number || '-'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 2px 0; font-size: 9pt; color: #4b5563;">Order Date:</td>
                                    <td style="padding: 2px 0; font-size: 9pt; font-weight: bold; color: #111827; text-align: right;">${order.order_date ? formatDate(order.order_date) : '-'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 2px 0; font-size: 9pt; color: #4b5563;">Delivery Status:</td>
                                    <td style="padding: 2px 0; font-size: 9pt; font-weight: bold; color: ${order.delivery_status === 'Delivered' ? '#047857' : '#b45309'}; text-align: right;">${order.delivery_status || 'Not Delivered'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 2px 0; font-size: 9pt; color: #4b5563;">Payment Status:</td>
                                    <td style="padding: 2px 0; font-size: 9pt; font-weight: bold; color: ${order.payment_status === 'Received' ? '#047857' : '#b45309'}; text-align: right;">${order.payment_status || 'Not Received'}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <!-- Items Specifications Table -->
                <table style="margin-bottom: 10px;">
                    <thead>
                        <tr style="background-color: #047857; color: #ffffff;">
                            <th style="border: 1px solid #047857; padding: 6px 4px; font-size: 8pt; text-align: center; width: 28px;">#</th>
                            <th style="border: 1px solid #047857; padding: 6px 6px; font-size: 8pt; text-align: left; width: 95px;">Category</th>
                            <th style="border: 1px solid #047857; padding: 6px 6px; font-size: 8pt; text-align: left;">Particulars / Details</th>
                            <th style="border: 1px solid #047857; padding: 6px 4px; font-size: 8pt; text-align: center; width: 60px;">Size</th>
                            <th style="border: 1px solid #047857; padding: 6px 4px; font-size: 8pt; text-align: center; width: 60px;">Slip #</th>
                            <th style="border: 1px solid #047857; padding: 6px 4px; font-size: 8pt; text-align: center; width: 60px;">Sheeter</th>
                            <th style="border: 1px solid #047857; padding: 6px 4px; font-size: 8pt; text-align: center; width: 60px;">Color</th>
                            <th style="border: 1px solid #047857; padding: 6px 4px; font-size: 8pt; text-align: center; width: 45px;">Qty</th>
                            <th style="border: 1px solid #047857; padding: 6px 6px; font-size: 8pt; text-align: right; width: 65px;">Rate (₹)</th>
                            <th style="border: 1px solid #047857; padding: 6px 6px; font-size: 8pt; text-align: right; width: 75px;">Total (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemRows}
                    </tbody>
                </table>

                <!-- Bottom Calculations & Payment History -->
                <table style="border: none;">
                    <tr>
                        <td style="width: 55%; vertical-align: top; padding-right: 12px; border: none;">
                            ${paymentHistoryRows ? `
                                <table style="margin: 0 0 8px 0; border: 1px solid #e5e7eb;">
                                    <thead>
                                        <tr style="background-color: #f3f4f6;">
                                            <th style="padding: 4px 6px; font-size: 8pt; text-align: left; border: 1px solid #e5e7eb;">Installment</th>
                                            <th style="padding: 4px 6px; font-size: 8pt; text-align: left; border: 1px solid #e5e7eb;">Date</th>
                                            <th style="padding: 4px 6px; font-size: 8pt; text-align: right; border: 1px solid #e5e7eb;">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${paymentHistoryRows}
                                    </tbody>
                                </table>
                            ` : ''}

                            <div style="border: 1px solid #e5e7eb; padding: 6px 8px; border-radius: 4px; background-color: #f9fafb; font-size: 8pt; color: #4b5563;">
                                <strong>Terms & Conditions:</strong><br/>
                                1. Goods once manufactured/printed cannot be returned.<br/>
                                2. Full balance payment due prior to final delivery.
                            </div>
                        </td>
                        <td style="width: 45%; vertical-align: top; border: none;">
                            <table style="border: 1px solid #d1d5db; background-color: #f9fafb; margin: 0;">
                                <tr>
                                    <td style="padding: 4px 8px; font-size: 9pt; color: #4b5563; border-bottom: 1px solid #e5e7eb;">Subtotal:</td>
                                    <td style="padding: 4px 8px; font-size: 9pt; font-weight: bold; text-align: right; border-bottom: 1px solid #e5e7eb;">₹${subtotal.toFixed(2)}</td>
                                </tr>
                                ${totalGst > 0 ? `
                                <tr>
                                    <td style="padding: 4px 8px; font-size: 8.5pt; color: #4b5563; border-bottom: 1px solid #e5e7eb;">GST Tax:</td>
                                    <td style="padding: 4px 8px; font-size: 8.5pt; font-weight: bold; text-align: right; border-bottom: 1px solid #e5e7eb;">₹${totalGst.toFixed(2)}</td>
                                </tr>` : ''}
                                <tr style="background-color: #047857; color: #ffffff;">
                                    <td style="padding: 6px 8px; font-size: 10pt; font-weight: bold;">Grand Total:</td>
                                    <td style="padding: 6px 8px; font-size: 11pt; font-weight: 800; text-align: right;">₹${totalAmount.toFixed(2)}</td>
                                </tr>
                                ${advancePaid > 0 ? `
                                <tr>
                                    <td style="padding: 4px 8px; font-size: 8.5pt; color: #047857; border-top: 1px solid #e5e7eb;">Advance Received:</td>
                                    <td style="padding: 4px 8px; font-size: 8.5pt; font-weight: bold; color: #047857; text-align: right; border-top: 1px solid #e5e7eb;">-₹${advancePaid.toFixed(2)}</td>
                                </tr>
                                <tr style="background-color: #fef3c7;">
                                    <td style="padding: 5px 8px; font-size: 9.5pt; font-weight: bold; color: #92400e;">Balance Due:</td>
                                    <td style="padding: 5px 8px; font-size: 10pt; font-weight: 800; color: #92400e; text-align: right;">₹${balanceDue.toFixed(2)}</td>
                                </tr>` : ''}
                            </table>
                        </td>
                    </tr>
                </table>

                <div style="margin-top: 16px; font-size: 7.5pt; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 6px;">
                    Order Form generated by ${officeName} • Page layout: A4 ${isLandscape ? 'Landscape' : 'Portrait'} • ${new Date().toLocaleString()}
                </div>
            </div>
        </body>
        </html>
    `;

    const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Exports a single quotation as a structured A4 Word document (.doc).
 */
export const exportQuotationToWord = (quotation, items = [], company = {}, filename = 'Quotation') => {
    const officeName = quotation.office_name || company.name || 'NRG JAISRI PRINTERS';
    const officeAddress = quotation.office_address || company.address || '';
    const officeGstin = quotation.office_gstin || company.gstin || '';
    const officeMobile = quotation.office_mobile || company.mobile || '';
    const officeEmail = quotation.office_email || company.email || '';

    const customerCity = extractCityFromAddress(quotation.customer_address || '');
    const isLandscape = items.length > 2;

    const itemRows = (items || []).map((item, idx) => {
        const qty = item.quantity || 1;
        const rate = parseFloat(item.price_per_unit || 0).toFixed(2);
        const amt = parseFloat((item.price_per_unit ? qty * item.price_per_unit : quotation.total_amount) || 0).toFixed(2);

        return `
            <tr>
                <td style="border: 1px solid #d1d5db; padding: 6px 4px; text-align: center; font-size: 8.5pt;">${idx + 1}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px 6px; font-size: 8.5pt; font-weight: bold; color: #0923b5;">${item.item_category || item.item_type || '-'}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px 6px; font-size: 8.5pt;">${item.details || item.custom_item_type || '-'}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px 4px; text-align: center; font-size: 8.5pt;">${item.size || '-'}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px 4px; text-align: center; font-size: 8.5pt;">${qty} ${item.unit || ''}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px 6px; text-align: right; font-size: 8.5pt;">₹${rate}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px 6px; text-align: right; font-size: 8.5pt; font-weight: bold;">₹${amt}</td>
            </tr>
        `;
    }).join('');

    const subtotal = parseFloat(quotation.subtotal || 0);
    const cgst = parseFloat(quotation.cgst_amount || 0);
    const sgst = parseFloat(quotation.sgst_amount || 0);
    const igst = parseFloat(quotation.igst_amount || 0);
    const totalGst = cgst + sgst + igst;
    const totalAmount = parseFloat(quotation.total_amount || 0);

    const wordHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset='utf-8'>
            <title>Quotation - ${quotation.quotation_number}</title>
            <!--[if gte mso 9]>
            <xml>
                <w:WordDocument>
                    <w:View>Print</w:View>
                    <w:Zoom>100</w:Zoom>
                    <w:DoNotOptimizeForBrowser/>
                </w:WordDocument>
            </xml>
            <![endif]-->
            <style>
                @page Section1 {
                    size: ${isLandscape ? '297mm 210mm' : '210mm 297mm'};
                    mso-page-orientation: ${isLandscape ? 'landscape' : 'portrait'};
                    margin: 10mm 10mm 10mm 10mm;
                    mso-header-margin: 8mm;
                    mso-footer-margin: 8mm;
                }
                div.Section1 { page: Section1; }
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; margin: 0; padding: 0; }
                table { width: 100% !important; max-width: 100% !important; border-collapse: collapse; margin-top: 8px; margin-bottom: 12px; table-layout: fixed; }
                th, td { font-family: 'Segoe UI', Arial, sans-serif; word-wrap: break-word; overflow-wrap: break-word; }
                .title-header { text-align: center; border-bottom: 2px solid #0923b5; padding-bottom: 8px; margin-bottom: 10px; }
            </style>
        </head>
        <body>
            <div class="Section1">
                <div class="title-header">
                    <div style="font-size: 18pt; font-weight: 800; color: #0923b5;">${officeName}</div>
                    ${officeAddress ? `<div style="font-size: 9.5pt; color: #4b5563;">${officeAddress.replace(/\n/g, ', ')}</div>` : ''}
                    <div style="font-size: 9.5pt; color: #4b5563;">
                        GSTIN: <strong>${officeGstin}</strong> &nbsp;|&nbsp; Mobile: <strong>${officeMobile}</strong> &nbsp;|&nbsp; Email: <strong>${officeEmail}</strong>
                    </div>
                    <div style="display: inline-block; margin-top: 6px; padding: 3px 18px; background-color: #0923b5; color: #ffffff; font-weight: bold; font-size: 10.5pt; border-radius: 4px; text-transform: uppercase;">
                        RATE QUOTATION
                    </div>
                </div>

                <table style="border: 1px solid #d1d5db; margin-bottom: 10px;">
                    <tr>
                        <td style="width: 50%; vertical-align: top; padding: 8px 10px; border-right: 1px solid #d1d5db; background-color: #f9fafb;">
                            <div style="font-size: 9pt; font-weight: bold; color: #0923b5; text-transform: uppercase; margin-bottom: 2px;">Quotation For:</div>
                            <div style="font-size: 11pt; font-weight: bold; color: #111827;">${quotation.customer_name || '-'}</div>
                            ${quotation.customer_address ? `<div style="font-size: 9pt; color: #4b5563; margin-top: 2px;">${quotation.customer_address.replace(/\n/g, '<br/>')}</div>` : ''}
                            ${customerCity ? `<div style="font-size: 9pt; color: #0923b5; font-weight: bold; margin-top: 2px;">City: ${customerCity}</div>` : ''}
                            ${quotation.customer_mobile ? `<div style="font-size: 9pt; color: #374151; margin-top: 2px;">Mobile: <strong>${quotation.customer_mobile}</strong></div>` : ''}
                        </td>
                        <td style="width: 50%; vertical-align: top; padding: 8px 10px; background-color: #ffffff;">
                            <table style="width: 100%; border: none; margin: 0;">
                                <tr>
                                    <td style="padding: 2px 0; font-size: 9pt; color: #4b5563;">Quotation No:</td>
                                    <td style="padding: 2px 0; font-size: 10pt; font-weight: bold; color: #0923b5; text-align: right;">${quotation.quotation_number || '-'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 2px 0; font-size: 9pt; color: #4b5563;">Date:</td>
                                    <td style="padding: 2px 0; font-size: 9pt; font-weight: bold; color: #111827; text-align: right;">${quotation.quotation_date ? formatDate(quotation.quotation_date) : '-'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 2px 0; font-size: 9pt; color: #4b5563;">Status:</td>
                                    <td style="padding: 2px 0; font-size: 9pt; font-weight: bold; color: #047857; text-align: right;">${quotation.approval_status || 'Pending'}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <table style="margin-bottom: 10px;">
                    <thead>
                        <tr style="background-color: #0923b5; color: #ffffff;">
                            <th style="border: 1px solid #0923b5; padding: 6px 4px; font-size: 8pt; text-align: center; width: 30px;">#</th>
                            <th style="border: 1px solid #0923b5; padding: 6px 6px; font-size: 8pt; text-align: left; width: 110px;">Category</th>
                            <th style="border: 1px solid #0923b5; padding: 6px 6px; font-size: 8pt; text-align: left;">Particulars / Description</th>
                            <th style="border: 1px solid #0923b5; padding: 6px 4px; font-size: 8pt; text-align: center; width: 70px;">Size</th>
                            <th style="border: 1px solid #0923b5; padding: 6px 4px; font-size: 8pt; text-align: center; width: 60px;">Qty</th>
                            <th style="border: 1px solid #0923b5; padding: 6px 6px; font-size: 8pt; text-align: right; width: 80px;">Rate (₹)</th>
                            <th style="border: 1px solid #0923b5; padding: 6px 6px; font-size: 8pt; text-align: right; width: 95px;">Amount (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemRows}
                    </tbody>
                </table>

                <table style="border: none;">
                    <tr>
                        <td style="width: 55%; vertical-align: top; padding-right: 12px; border: none;">
                            <div style="border: 1px solid #e5e7eb; padding: 8px; border-radius: 4px; background-color: #f9fafb; font-size: 8pt; color: #4b5563;">
                                <strong>Terms & Conditions:</strong><br/>
                                1. Rates are valid for 15 days from quotation date.<br/>
                                2. Taxes as applicable at time of invoicing.
                            </div>
                        </td>
                        <td style="width: 45%; vertical-align: top; border: none;">
                            <table style="border: 1px solid #d1d5db; background-color: #f9fafb; margin: 0;">
                                <tr>
                                    <td style="padding: 4px 8px; font-size: 9pt; color: #4b5563; border-bottom: 1px solid #e5e7eb;">Subtotal:</td>
                                    <td style="padding: 4px 8px; font-size: 9pt; font-weight: bold; text-align: right; border-bottom: 1px solid #e5e7eb;">₹${subtotal.toFixed(2)}</td>
                                </tr>
                                ${totalGst > 0 ? `
                                <tr>
                                    <td style="padding: 4px 8px; font-size: 8.5pt; color: #4b5563; border-bottom: 1px solid #e5e7eb;">GST Tax:</td>
                                    <td style="padding: 4px 8px; font-size: 8.5pt; font-weight: bold; text-align: right; border-bottom: 1px solid #e5e7eb;">₹${totalGst.toFixed(2)}</td>
                                </tr>` : ''}
                                <tr style="background-color: #0923b5; color: #ffffff;">
                                    <td style="padding: 6px 8px; font-size: 10pt; font-weight: bold;">Grand Total:</td>
                                    <td style="padding: 6px 8px; font-size: 11pt; font-weight: 800; text-align: right;">₹${totalAmount.toFixed(2)}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <div style="margin-top: 16px; font-size: 7.5pt; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 6px;">
                    Quotation generated by ${officeName} • Page layout: A4 ${isLandscape ? 'Landscape' : 'Portrait'} • ${new Date().toLocaleString()}
                </div>
            </div>
        </body>
        </html>
    `;

    const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Exports an HTML DOM element to a perfectly formatted A4 PDF (Portrait or Landscape).
 * Automatically calculates aspect ratio, selects optimal A4 orientation (or respects forced orientation),
 * and slices multi-page content cleanly across multiple A4 sheets so NO content is ever cut in half or lost.
 */
export const exportElementToA4Pdf = async (element, filename = 'document.pdf', options = {}) => {
    if (!element) throw new Error('Target element not found');

    const html2canvasModule = await import('html2canvas-pro');
    const html2canvas = html2canvasModule.default || html2canvasModule;
    const { jsPDF } = await import('jspdf');

    const marginMm = options.marginMm !== undefined ? options.marginMm : 8;
    const scale = options.scale || 2;

    // Temporarily remove live DOM shadow/border for clean edges
    const origShadow = element.style.boxShadow;
    const origBorder = element.style.border;
    const origRadius = element.style.borderRadius;

    element.style.boxShadow = 'none';
    element.style.border = 'none';
    element.style.borderRadius = '0';

    // Handle PDF hide/show elements
    const elementsToHide = element.querySelectorAll('.pdf-hide');
    elementsToHide.forEach(el => {
        el.dataset.origDisplay = el.style.display;
        el.style.display = 'none';
    });
    const elementsToShow = element.querySelectorAll('.pdf-show');
    elementsToShow.forEach(el => {
        el.dataset.origDisplay = el.style.display;
        el.style.display = 'block';
    });

    if (document.fonts) {
        try { await document.fonts.ready; } catch (e) {}
    }

    const canvas = await html2canvas(element, {
        scale,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff'
    });

    // Restore live DOM styles
    element.style.boxShadow = origShadow;
    element.style.border = origBorder;
    element.style.borderRadius = origRadius;
    elementsToHide.forEach(el => {
        el.style.display = el.dataset.origDisplay || '';
    });
    elementsToShow.forEach(el => {
        el.style.display = el.dataset.origDisplay || '';
    });

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // 1. Determine orientation: auto-detect based on aspect ratio unless forced
    let orientation = options.forcedOrientation;
    if (!orientation || orientation === 'auto') {
        // If canvas width is wider than height by > 10%, select landscape; otherwise portrait
        orientation = canvasWidth > canvasHeight * 1.10 ? 'landscape' : 'portrait';
    }

    const isLandscape = orientation === 'landscape';
    const pageWidth = isLandscape ? 297 : 210;
    const pageHeight = isLandscape ? 210 : 297;

    const printableWidth = pageWidth - (marginMm * 2);
    const printableHeight = pageHeight - (marginMm * 2);

    const pdf = new jsPDF(orientation, 'mm', 'a4');

    // Height in mm of the entire image if rendered to fill printableWidth
    const totalPdfHeight = (canvasHeight * printableWidth) / canvasWidth;

    // If it fits within 1 page (with 5% leeway)
    if (totalPdfHeight <= printableHeight * 1.05) {
        const finalHeight = Math.min(totalPdfHeight, printableHeight);
        const imgData = canvas.toDataURL('image/png', 1.0);
        pdf.addImage(imgData, 'PNG', marginMm, marginMm, printableWidth, finalHeight);
    } else {
        // Multi-page slicing: ensure NO content is cut off
        const pageCanvasHeight = (printableHeight / printableWidth) * canvasWidth;
        const totalPages = Math.ceil(canvasHeight / pageCanvasHeight);

        for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
            if (pageIdx > 0) {
                pdf.addPage(orientation, 'mm', 'a4');
            }

            const sourceY = pageIdx * pageCanvasHeight;
            const sliceCanvasHeight = Math.min(pageCanvasHeight, canvasHeight - sourceY);

            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = canvasWidth;
            sliceCanvas.height = sliceCanvasHeight;

            const ctx = sliceCanvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvasWidth, sliceCanvasHeight);
            ctx.drawImage(
                canvas,
                0, sourceY, canvasWidth, sliceCanvasHeight,
                0, 0, canvasWidth, sliceCanvasHeight
            );

            const sliceImgData = sliceCanvas.toDataURL('image/png', 1.0);
            const slicePdfHeight = (sliceCanvasHeight * printableWidth) / canvasWidth;

            pdf.addImage(sliceImgData, 'PNG', marginMm, marginMm, printableWidth, slicePdfHeight);
        }
    }

    const finalName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(finalName);
};

