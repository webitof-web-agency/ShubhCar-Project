const Invoice = require('../../models/InvoiceSchema');
const EmailTemplate = require('../../models/EmailTemplate.model');
const { sendEmail } = require('../../utils/email');
const generateInvoiceNumber = require('../../utils/invoiceNumber');
const { error } = require('../../utils/apiResponse');
const invoiceRepo = require('./invoice.repo');
const orderRepo = require('../orders/order.repo');

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
      name: i.productSnapshot?.name || '',
      sku: i.sku,
      quantity: i.quantity,
      unitPrice: i.price,
      taxPercent: i.taxPercent,
      taxAmount: i.taxAmount,
      taxComponents: i.taxComponents || { cgst: 0, sgst: 0, igst: 0 },
      lineTotal: i.total,
    }));

    const invoice = await Invoice.create({
      orderId: order._id,
      invoiceNumber,
      customerSnapshot: {
        name: order.customerSnapshot.name,
        email: order.customerSnapshot.email,
        phone: order.customerSnapshot.phone,
        address: order.shippingAddress,
      },
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
}

module.exports = new InvoiceService();
