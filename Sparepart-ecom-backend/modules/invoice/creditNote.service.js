const Invoice = require('../../models/InvoiceSchema');
const EmailTemplate = require('../../models/EmailTemplate.model');
const { sendEmail } = require('../../utils/email');
const generateCreditNoteNumber = require('../../utils/creditNoteNumber');
const { error } = require('../../utils/apiResponse');
const invoiceRepo = require('./invoice.repo');

class CreditNoteService {
  async generate({ invoiceId, refundItems, refundMeta }) {
    const originalInvoice = await Invoice.findById(invoiceId);
    if (!originalInvoice) error('Invoice not found', 404);

    // 🔒 Idempotency: only one credit note per invoice
    const exists = await invoiceRepo.findCreditNoteByInvoice(invoiceId);
    if (exists) return exists;

    const creditNoteNumber = generateCreditNoteNumber(originalInvoice);

    const items = refundItems.map((i) => ({
      name: i.name,
      sku: i.sku,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      taxPercent: i.taxPercent,
      taxAmount: i.taxAmount,
      taxComponents: i.taxComponents || { cgst: 0, sgst: 0, igst: 0 },
      lineTotal: i.lineTotal,
    }));

    const totals = {
      subtotal: items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
      taxTotal: items.reduce((s, i) => s + i.taxAmount, 0),
      taxBreakdown: items.reduce(
        (acc, i) => ({
          cgst: acc.cgst + (i.taxComponents?.cgst || 0),
          sgst: acc.sgst + (i.taxComponents?.sgst || 0),
          igst: acc.igst + (i.taxComponents?.igst || 0),
        }),
        { cgst: 0, sgst: 0, igst: 0 },
      ),
      discountTotal: 0,
      grandTotal: items.reduce((s, i) => s + i.lineTotal, 0),
      currency: 'INR',
    };

    const creditNote = await Invoice.create({
      orderId: originalInvoice.orderId,
      type: 'credit_note',
      relatedInvoiceId: originalInvoice._id,
      invoiceNumber: creditNoteNumber,
      customerSnapshot: originalInvoice.customerSnapshot,
      items,
      totals,
      refundMeta,
    });

    await this.emailCreditNote(originalInvoice, creditNote);
    return creditNote;
  }

  async emailCreditNote(originalInvoice, creditNote) {
    const tpl = await EmailTemplate.findOne({
      name: 'order_credit_note',
    }).lean();

    if (!tpl) return;

    let html = tpl.bodyHtml;

    const vars = {
      appName: process.env.APP_NAME,
      creditNoteNumber: creditNote.invoiceNumber,
      invoiceNumber: originalInvoice.invoiceNumber,
      creditDate: creditNote.createdAt.toDateString(),
      customerName: creditNote.customerSnapshot.name,
      customerEmail: creditNote.customerSnapshot.email,
      items: creditNote.items,
      grandTotal: creditNote.totals.grandTotal,
    };

    Object.entries(vars).forEach(([k, v]) => {
      html = html.replaceAll(`{{${k}}}`, v ?? '');
    });

    await sendEmail({
      to: creditNote.customerSnapshot.email,
      subject: tpl.subject.replace(
        '{{invoiceNumber}}',
        originalInvoice.invoiceNumber,
      ),
      html,
    });
  }

  async generateFromOrder(order, refundMeta = {}) {
    const invoice = await invoiceRepo.findByOrder(order._id);
    if (!invoice) return null;

    const refundItems = invoice.items.map((i) => ({
      name: i.name,
      sku: i.sku,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      taxPercent: i.taxPercent,
      taxAmount: i.taxAmount,
      taxComponents: i.taxComponents || { cgst: 0, sgst: 0, igst: 0 },
      lineTotal: i.lineTotal,
    }));

    return this.generate({
      invoiceId: invoice._id,
      refundItems,
      refundMeta: { ...refundMeta, orderId: order._id },
    });
  }
}

module.exports = new CreditNoteService();
