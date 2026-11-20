/**
 * Kwickbot invoice PDF (A4), Pista brand.
 * Rendered on demand from the invoice record, so nothing is stored on disk and
 * every download uses the same snapshot that was frozen at payment time.
 */
const PDFDocument = require('pdfkit');
const { getBusinessProfile } = require('./billingService');

const C = {
  deep: '#2A3D18', olive: '#3D5A22', pista: '#B9DB97', pistaSoft: '#E4F0D5', pistaTint: '#EEF5E4',
  leaf: '#8DBF64', mist: '#F5F8EF', ink: '#1D2A13', ink2: '#3A4A2E', muted: '#556447', border: '#E1E9D3', white: '#FFFFFF'
};

// "₹" outline (Plus Jakarta Sans, SIL Open Font License), 1000 units/em, y-up.
const RUPEE_PATH = 'M477 0L88 290L88 365L348 365Q396 365 432 383.5Q468 402 488 436.5Q508 471 508 518Q508 565 488 599Q468 633 432 651.5Q396 670 348 670L88 670L88 745L648 745L648 680L487 680L506 695Q544 665 566 619.5Q588 574 588 517Q588 449 557.5 398Q527 347 472.5 318.5Q418 290 344 290L181 290L188 312L599 0ZM88 485L88 550L648 550L648 485Z';
const RUPEE_ADVANCE = 681;

const PAGE = { w: 595.28, h: 841.89, m: 48 };

const fmtNum = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const METHOD_LABELS = { upi: 'UPI', card: 'Card', netbanking: 'Net banking', wallet: 'Wallet', emi: 'EMI', paylater: 'Pay later' };
const fmtMethod = (m) => (m ? (METHOD_LABELS[String(m).toLowerCase()] || m) : '');
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

/* ---------- Amount in words (Indian system) ---------- */
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function twoDigits(n) { return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ' ' + ONES[n % 10] : ''}`; }
function threeDigits(n) {
  const h = Math.floor(n / 100); const r = n % 100;
  return [h ? `${ONES[h]} Hundred` : '', r ? twoDigits(r) : ''].filter(Boolean).join(' ');
}
function inWordsInteger(n) {
  if (n === 0) return 'Zero';
  const parts = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) parts.push(`${inWordsInteger(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (n) parts.push(threeDigits(n));
  return parts.join(' ');
}
function amountInWords(amount, currency = 'INR') {
  const rupees = Math.floor(Number(amount || 0));
  const paise = Math.round((Number(amount || 0) - rupees) * 100);
  if (currency !== 'INR') return `${currency} ${fmtNum(amount)}`;
  return `Indian Rupees ${inWordsInteger(rupees)}${paise ? ` and ${twoDigits(paise)} Paise` : ''} Only`;
}

/* ---------- Drawing helpers ---------- */
function drawMark(doc, x, y, size, { stem = C.mist, ai = C.pista, low = C.mist } = {}) {
  const s = size / 64;
  doc.save().translate(x, y).scale(s);
  doc.roundedRect(8, 7, 13, 50, 6.5).fill(stem);
  doc.lineCap('round').lineWidth(13);
  doc.moveTo(31, 29).lineTo(50, 10).stroke(ai);
  doc.moveTo(31, 36).lineTo(51, 55).stroke(low);
  doc.restore();
}

function rupeeWidth(size) { return (RUPEE_ADVANCE * size * 0.9) / 1000 + size * 0.06; }

/** Draw "₹1,234.00" right-aligned so it ends at xRight; returns nothing. */
function money(doc, value, xRight, y, { size = 10, bold = false, color = C.ink, currency = 'INR' } = {}) {
  const font = bold ? 'Helvetica-Bold' : 'Helvetica';
  const text = fmtNum(value);
  doc.font(font).fontSize(size);
  const tw = doc.widthOfString(text);
  if (currency !== 'INR') {
    const label = `${currency} ${text}`;
    doc.fillColor(color).text(label, xRight - doc.widthOfString(label), y, { lineBreak: false });
    return;
  }
  const rw = rupeeWidth(size);
  const x = xRight - tw - rw;
  const s = (size * 0.9) / 1000;
  doc.save().translate(x, y + size * 0.74).scale(s, -s).path(RUPEE_PATH).fill(color).restore();
  doc.fillColor(color).text(text, x + rw, y, { lineBreak: false });
}

function label(doc, text, x, y, opts = {}) {
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(opts.color || C.muted)
    .text(text.toUpperCase(), x, y, { characterSpacing: 0.8, width: opts.width, lineBreak: false });
}

function partyLines(p = {}) {
  const lines = [];
  if (p.addressLine) lines.push(p.addressLine);
  const cityLine = [p.city, p.state, p.pincode].filter(Boolean).join(', ');
  if (cityLine) lines.push(cityLine);
  if (p.country && p.country !== 'India') lines.push(p.country);
  if (p.gstin) lines.push(`GSTIN: ${p.gstin}`);
  if (p.pan && !p.gstin) lines.push(`PAN: ${p.pan}`);
  if (p.email) lines.push(p.email);
  if (p.phone) lines.push(p.phone);
  return lines;
}

/* ---------- Main renderer ---------- */
async function renderInvoicePdf(invoice) {
  const seller = invoice.seller || await getBusinessProfile();
  const buyer = invoice.buyer || {
    name: invoice.customerName, email: invoice.customerEmail, phone: invoice.customerPhone
  };
  const tax = invoice.tax || { registered: false };
  const currency = invoice.currency || 'INR';
  const isPaid = invoice.paymentStatus === 'completed' || invoice.status === 'paid';
  const title = tax.registered ? 'TAX INVOICE' : 'INVOICE';

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: { Title: `Invoice ${invoice.invoiceNumber}`, Author: seller.legalName || 'Kwickbot', Subject: 'Kwickbot subscription invoice' }
    });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const { w, m } = PAGE;
    const right = w - m;
    const contentW = w - m * 2;

    /* Header band */
    doc.rect(0, 0, w, 150).fill(C.deep);
    drawMark(doc, m - 6, 40, 52);
    doc.font('Helvetica-Bold').fontSize(26).fillColor(C.mist).text('kwickbot', m + 50, 50, { lineBreak: false });
    doc.font('Helvetica').fontSize(9.5).fillColor(C.pista).text('AI WhatsApp support for e-commerce', m + 51, 82, { lineBreak: false });

    doc.font('Helvetica-Bold').fontSize(22).fillColor(C.white);
    doc.text(title, right - doc.widthOfString(title), 44, { lineBreak: false, characterSpacing: 1 });
    doc.font('Helvetica-Bold').fontSize(12).fillColor(C.pista);
    doc.text(invoice.invoiceNumber, right - doc.widthOfString(invoice.invoiceNumber), 74, { lineBreak: false });

    const badge = isPaid ? 'PAID' : 'PAYMENT DUE';
    doc.font('Helvetica-Bold').fontSize(9);
    const bw = doc.widthOfString(badge, { characterSpacing: 1 }) + 22;
    doc.roundedRect(right - bw, 98, bw, 22, 11).fill(isPaid ? C.pista : '#FCEFD9');
    doc.fillColor(isPaid ? C.deep : '#7A4B05').text(badge, right - bw + 11, 104.5, { lineBreak: false, characterSpacing: 1 });

    /* Meta row */
    let y = 176;
    const metaCols = [
      ['Invoice date', fmtDate(invoice.issuedDate || invoice.createdAt)],
      ['Billing period', invoice.periodStart ? `${fmtDate(invoice.periodStart)} – ${fmtDate(invoice.periodEnd)}` : '—'],
      ['Payment reference', invoice.razorpayPaymentId || '—'],
      [tax.registered ? 'Place of supply' : 'Payment terms', tax.registered ? (tax.placeOfSupply || '—') : (invoice.paymentTerms || 'Due on receipt')]
    ];
    const colW = contentW / 4;
    metaCols.forEach(([k, v], i) => {
      const x = m + i * colW;
      label(doc, k, x, y, { width: colW - 10 });
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(C.ink).text(v, x, y + 13, { width: colW - 12 });
    });

    /* Parties */
    y = 228;
    const cardW = (contentW - 16) / 2;
    const sellerLines = partyLines(seller);
    const buyerLines = partyLines(buyer);
    const cardH = 54 + Math.max(sellerLines.length, buyerLines.length, 2) * 13;
    [[`Billed by`, seller.legalName || 'Kwickbot', sellerLines, m, C.mist],
     [`Billed to`, buyer.name || 'Customer', buyerLines, m + cardW + 16, C.pistaTint]].forEach(([k, name, lines, x, bg]) => {
      doc.roundedRect(x, y, cardW, cardH, 12).fill(bg);
      label(doc, k, x + 16, y + 16);
      doc.font('Helvetica-Bold').fontSize(11.5).fillColor(C.ink).text(name, x + 16, y + 30, { width: cardW - 32 });
      let ly = y + 48;
      doc.font('Helvetica').fontSize(9).fillColor(C.ink2);
      lines.forEach((line) => { doc.text(line, x + 16, ly, { width: cardW - 32, lineBreak: false, ellipsis: true }); ly += 13; });
    });

    /* Items table */
    y = y + cardH + 28;
    const cols = { desc: m + 14, sac: m + contentW * 0.56, qty: m + contentW * 0.68, rate: m + contentW * 0.86, amt: right - 14 };
    doc.roundedRect(m, y, contentW, 28, 8).fill(C.deep);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.mist);
    doc.text('DESCRIPTION', cols.desc, y + 10, { characterSpacing: 0.8, lineBreak: false });
    if (tax.registered && seller.sacCode) doc.text('SAC', cols.sac, y + 10, { characterSpacing: 0.8, lineBreak: false });
    doc.text('QTY', cols.qty, y + 10, { characterSpacing: 0.8, lineBreak: false });
    const rateLbl = 'RATE'; doc.text(rateLbl, cols.rate - doc.widthOfString(rateLbl), y + 10, { characterSpacing: 0.8, lineBreak: false });
    const amtLbl = 'AMOUNT'; doc.text(amtLbl, cols.amt - doc.widthOfString(amtLbl, { characterSpacing: 0.8 }), y + 10, { characterSpacing: 0.8, lineBreak: false });

    y += 40;
    (invoice.items || []).forEach((item) => {
      doc.font('Helvetica-Bold').fontSize(10).fillColor(C.ink).text(item.description || 'Subscription', cols.desc, y, { width: cols.sac - cols.desc - 12 });
      let sub = y + 15;
      if (invoice.periodStart) {
        doc.font('Helvetica').fontSize(8.5).fillColor(C.muted).text(`Service period ${fmtDate(invoice.periodStart)} to ${fmtDate(invoice.periodEnd)}`, cols.desc, sub, { lineBreak: false });
        sub += 12;
      }
      if (tax.registered && seller.sacCode) doc.font('Helvetica').fontSize(9.5).fillColor(C.ink2).text(seller.sacCode, cols.sac, y, { lineBreak: false });
      doc.font('Helvetica').fontSize(9.5).fillColor(C.ink2).text(String(item.quantity || 1), cols.qty, y, { lineBreak: false });
      money(doc, item.unitPrice, cols.rate, y, { size: 9.5, color: C.ink2, currency });
      money(doc, item.amount, cols.amt, y, { size: 10, bold: true, currency });
      y = Math.max(sub, y + 18) + 12;
      doc.moveTo(m, y).lineTo(right, y).lineWidth(0.8).stroke(C.border);
      y += 14;
    });

    /* Totals */
    const totX = m + contentW * 0.55;
    const totW = right - totX;
    const row = (k, v, opts = {}) => {
      doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5).fillColor(opts.color || C.ink2).text(k, totX, y, { lineBreak: false });
      if (opts.minus) {
        money(doc, v, right - 2, y, { size: 9.5, color: opts.color || C.ink2, currency });
        doc.font('Helvetica').fontSize(9.5).text('-', right - 2 - doc.widthOfString(fmtNum(v)) - rupeeWidth(9.5) - 8, y, { lineBreak: false });
      } else {
        money(doc, v, right - 2, y, { size: 9.5, bold: !!opts.bold, color: opts.color || C.ink2, currency });
      }
      y += 19;
    };
    const totalsTop = y;
    row('Subtotal', invoice.subtotal);
    if (invoice.discountAmount > 0) row(`Discount${invoice.couponCode ? ` (${invoice.couponCode})` : ''}`, invoice.discountAmount, { minus: true, color: C.olive });
    if (tax.registered) {
      row('Taxable value', tax.taxable);
      if (tax.intra) {
        row(`CGST @ ${tax.rate / 2}%`, tax.cgst);
        row(`SGST @ ${tax.rate / 2}%`, tax.sgst);
      } else {
        row(`IGST @ ${tax.rate}%`, tax.igst);
      }
    }
    y += 4;
    doc.roundedRect(totX - 12, y, totW + 12, 40, 10).fill(C.deep);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.mist).text(tax.registered ? 'Total (incl. GST)' : 'Total', totX, y + 14, { lineBreak: false });
    money(doc, invoice.totalAmount, right - 12, y + 12, { size: 15, bold: true, color: C.white, currency });
    y += 52;
    row('Amount paid', isPaid ? (invoice.amountPaid || invoice.totalAmount) : (invoice.amountPaid || 0));
    row('Balance due', Math.max(0, (invoice.totalAmount || 0) - (isPaid ? (invoice.amountPaid || invoice.totalAmount) : (invoice.amountPaid || 0))), { bold: true, color: C.ink });

    /* Left column beside totals: amount in words + payment */
    let ly = totalsTop;
    const lw = totX - m - 32;
    label(doc, 'Amount in words', m, ly);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(C.ink).text(amountInWords(invoice.totalAmount, currency), m, ly + 13, { width: lw });
    ly = doc.y + 18;
    label(doc, 'Payment', m, ly);
    const payLine = isPaid
      ? `Paid online via Razorpay${invoice.paymentMethod ? ` (${fmtMethod(invoice.paymentMethod)})` : ''} on ${fmtDate(invoice.paidDate || invoice.issuedDate || invoice.createdAt)}`
      : `Due on ${fmtDate(invoice.dueDate)}`;
    doc.font('Helvetica').fontSize(9.5).fillColor(C.ink2).text(payLine, m, ly + 13, { width: lw });
    if (invoice.razorpayOrderId) doc.font('Helvetica').fontSize(8.5).fillColor(C.muted).text(`Order ${invoice.razorpayOrderId}`, m, doc.y + 3, { width: lw });
    if (tax.registered) {
      ly = doc.y + 16;
      label(doc, 'Tax note', m, ly);
      doc.font('Helvetica').fontSize(8.5).fillColor(C.muted).text(`Prices are inclusive of GST @ ${tax.rate}%. Tax is not payable on reverse charge basis.`, m, ly + 13, { width: lw });
    }

    /* Footer */
    const fy = 760;
    doc.moveTo(m, fy).lineTo(right, fy).lineWidth(0.8).stroke(C.border);
    drawMark(doc, m - 4, fy + 14, 26, { stem: C.olive, ai: C.leaf, low: C.olive });
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(C.ink).text(seller.footerNote || 'Thank you for choosing Kwickbot.', m + 26, fy + 16, { width: contentW - 30, lineBreak: false });
    doc.font('Helvetica').fontSize(8).fillColor(C.muted).text('This is a computer-generated invoice and does not require a signature.', m + 26, fy + 30, { width: contentW - 30, lineBreak: false });
    const contact = [seller.email, seller.website, seller.phone].filter(Boolean).join('  ·  ');
    doc.text(contact, m + 26, fy + 42, { width: contentW - 30, lineBreak: false });

    doc.end();
  });
}

// Backwards-compatible name used elsewhere; returns the PDF as a Buffer.
const generateInvoicePDF = (invoice) => renderInvoicePdf(invoice);

module.exports = { renderInvoicePdf, generateInvoicePDF, amountInWords };
