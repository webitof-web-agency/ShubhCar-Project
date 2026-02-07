const Invoice = require('../../models/InvoiceSchema');
const EmailTemplate = require('../../models/EmailTemplate.model');
const { sendEmail } = require('../../utils/email');
const generateInvoiceNumber = require('../../utils/invoiceNumber');
const { error } = require('../../utils/apiResponse');
const invoiceRepo = require('./invoice.repo');
const orderRepo = require('../orders/order.repo');
const User = require('../../models/User.model');
const UserAddress = require('../../models/UserAddress.model');
const logger = require('../../config/logger');

class InvoiceService {
  async generateFromOrder(order) {
    if (order.paymentStatus !== 'paid') {
      error('Invoice can only be generated for paid orders', 409);
    }

    const exists = await invoiceRepo.findByOrder(order._id);
    if (exists) return exists;

    const invoiceNumber = await generateInvoiceNumber(order);

    const orderItems = await orderRepo.findItemsByOrder(order._id);

    const items = orderItems.map((i) => ({
      name: i.productName || '[Product Deleted]',
      sku: i.sku,
      quantity: i.quantity,
      unitPrice: i.price,
      taxPercent: i.taxPercent,
      taxAmount: i.taxAmount,
      taxComponents: i.taxComponents || { cgst: 0, sgst: 0, igst: 0 },
      lineTotal: i.total,
    }));

    let customerSnapshot = order.customerSnapshot;

    // If snapshot is missing (common for raw orders), fetch details
    if (!customerSnapshot) {
      const user = await User.findById(order.userId).lean();
      const address = await UserAddress.findById(order.shippingAddressId).lean();

      if (!user && !address) {
        // Fallback or error? Let's use order data if available or empty strings
        customerSnapshot = {
          name: 'Guest',
          email: '',
          phone: '',
          address: {},
        };
      } else {
        customerSnapshot = {
          name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : (address?.fullName || 'Guest'),
          email: user?.email || '',
          phone: user?.phone || address?.phone || '',
          address: address || {},
        };
      }
    }

    const invoice = await Invoice.create({
      orderId: order._id,
      invoiceNumber,
      customerSnapshot,
      items,
      totals: {
        subtotal: order.subtotal,
        taxTotal: order.taxAmount,
        taxBreakdown: order.taxBreakdown || { cgst: 0, sgst: 0, igst: 0 },
        discountTotal: order.discountAmount || 0,
        grandTotal: order.grandTotal,
        currency: 'INR',
      },

      orderSnapshot: {
        orderNumber: order.orderNumber,
        placedAt: order.placedAt,
        paymentMethod: order.paymentMethod,
      },
    });

    await this.emailInvoice(order, invoice);

    return invoice;
  }

  async emailInvoice(order, invoice) {
    const tpl = await EmailTemplate.findOne({ name: 'order_invoice' }).lean();
    if (!tpl) return;

    let html = tpl.bodyHtml;

    const vars = {
      appName: process.env.APP_NAME,
      invoiceNumber: invoice.invoiceNumber,
      orderNumber: order.orderNumber || order._id,
      invoiceDate: invoice.issuedAt.toDateString(),
      customerName: invoice.customerSnapshot.name,
      customerEmail: invoice.customerSnapshot.email,
      customerPhone: invoice.customerSnapshot.phone,
      items: invoice.items,
      subtotal: invoice.totals.subtotal,
      taxTotal: invoice.totals.taxTotal,
      discountTotal: invoice.totals.discountTotal,
      grandTotal: invoice.totals.grandTotal,
    };

    // naive variable replacement (safe + predictable)
    Object.entries(vars).forEach(([k, v]) => {
      html = html.replaceAll(`{{${k}}}`, v ?? '');
    });

    await sendEmail({
      to: invoice.customerSnapshot.email,
      subject: tpl.subject.replace('{{orderNumber}}', order._id),
      html,
    });
  }

  /**
   * Generate credit note for cancelled/refunded order
   * @param {Object} order - The order that was cancelled
   * @param {Object} originalInvoice - The original invoice to credit
   * @returns {Object} Credit note document
   */
  async generateCreditNote(order, originalInvoice) {
    // Check if credit note already exists
    const existingCreditNote = await Invoice.findOne({
      type: 'credit_note',
      relatedInvoiceId: originalInvoice._id,
    });

    if (existingCreditNote) {
      return existingCreditNote;
    }

    // Generate credit note number
    const creditNoteNumber = `CN-${originalInvoice.invoiceNumber}`;

    // Create credit note (same data as invoice but marked as credit_note)
    const creditNote = await Invoice.create({
      type: 'credit_note',
      orderId: order._id,
      invoiceNumber: creditNoteNumber,
      relatedInvoiceId: originalInvoice._id,
      customerSnapshot: originalInvoice.customerSnapshot,
      items: originalInvoice.items, // Same items as original
      totals: originalInvoice.totals, // Same totals (will be shown as credit)
      orderSnapshot: {
        ...originalInvoice.orderSnapshot,
        cancelledAt: order.updatedAt || new Date(),
      },
      refundMeta: order.refundMeta || {},
    });

    // Email credit note to customer
    await this.emailCreditNote(order, creditNote, originalInvoice).catch((err) => {
      logger.error('Failed to email credit note', {
        orderId: order._id,
        creditNoteNumber: creditNote.invoiceNumber,
        error: err.message,
      });
    });
    
    return creditNote;
  }

  /**
   * Email credit note to customer
   */
  async emailCreditNote(order, creditNote, originalInvoice) {
    const tpl = await EmailTemplate.findOne({ name: 'credit_note' }).lean();
    
    // Fallback to order invoice template if credit note template doesn't exist
    if (!tpl) {
      logger.warn('Credit note email template not found, skipping email');
      return;
    }

    let html = tpl.bodyHtml;

    const vars = {
      appName: process.env.APP_NAME,
      creditNoteNumber: creditNote.invoiceNumber,
      originalInvoiceNumber: originalInvoice.invoiceNumber,
      orderNumber: order.orderNumber || order._id,
      creditNoteDate: creditNote.issuedAt ? creditNote.issuedAt.toDateString() : new Date().toDateString(),
      customerName: creditNote.customerSnapshot.name,
      customerEmail: creditNote.customerSnapshot.email,
      grandTotal: creditNote.totals.grandTotal,
      refundReason: order.cancelReason || 'Order cancelled',
    };

    // Naive variable replacement
    Object.entries(vars).forEach(([k, v]) => {
      html = html.replaceAll(`{{${k}}}`, v ?? '');
    });

    await sendEmail({
      to: creditNote.customerSnapshot.email,
      subject: tpl.subject.replace('{{orderNumber}}', order.orderNumber || order._id),
      html,
    });
  }
}

module.exports = new InvoiceService();
