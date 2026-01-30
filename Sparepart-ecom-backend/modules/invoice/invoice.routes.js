const express = require('express');
const router = express.Router();
const Invoice = require('../../models/InvoiceSchema');
const auth = require('../../middlewares/auth.middleware');
const { adminLimiter } = require('../../middlewares/rateLimiter.middleware');
const ROLES = require('../../constants/roles');
const PDFDocument = require('pdfkit');

const streamInvoicePdf = (invoice, res, { download = false } = {}) => {
  const doc = new PDFDocument({ margin: 50 });
  const filename = `invoice-${invoice.invoiceNumber || invoice._id}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
  );

  doc.pipe(res);

  doc.fontSize(18).text('Tax Invoice', { align: 'right' });
  doc.moveDown();

  doc.fontSize(12).text(`Invoice #: ${invoice.invoiceNumber || '-'}`);
  doc.text(`Date: ${invoice.issuedAt ? new Date(invoice.issuedAt).toDateString() : '-'}`);
  doc.text(`Order #: ${invoice.orderSnapshot?.orderNumber || '-'}`);
  doc.moveDown();

  doc.fontSize(12).text('Bill To:', { underline: true });
  doc.text(invoice.customerSnapshot?.name || '-');
  doc.text(invoice.customerSnapshot?.email || '-');
  doc.text(invoice.customerSnapshot?.phone || '-');
  const address = invoice.customerSnapshot?.address;
  if (address) {
    doc.text(
      [address.line1, address.line2, address.city, address.state, address.postalCode, address.country]
        .filter(Boolean)
        .join(', ')
    );
  }
  doc.moveDown();

  doc.fontSize(12).text('Items', { underline: true });
  doc.moveDown(0.5);

  invoice.items?.forEach((item, index) => {
    doc
      .fontSize(11)
      .text(
        `${index + 1}. ${item.name || 'Item'} | Qty: ${item.quantity} | Unit: ${item.unitPrice} | Tax: ${item.taxPercent || 0}% | Total: ${item.lineTotal}`,
      );
  });

  doc.moveDown();
  doc.fontSize(12).text(`Subtotal: ${invoice.totals?.subtotal ?? 0}`, { align: 'right' });
  doc.text(`Tax: ${invoice.totals?.taxTotal ?? 0}`, { align: 'right' });
  doc.text(`Discount: ${invoice.totals?.discountTotal ?? 0}`, { align: 'right' });
  doc.text(`Grand Total: ${invoice.totals?.grandTotal ?? 0}`, { align: 'right' });

  doc.end();
};

/**
 * @route GET /v1/invoices
 * @desc Get all invoices (admin only)
 * @access Private/Admin
 */
router.get('/', adminLimiter, auth([ROLES.ADMIN]), async (req, res) => {
  try {
    const { page = 1, limit = 50, type } = req.query;
    
    const query = {};
    if (type) query.type = type;

    const invoices = await Invoice.find(query)
      .sort({ issuedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await Invoice.countDocuments(query);

    return res.ok({
      invoices,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return res.fail('Failed to fetch invoices', 500);
  }
});

/**
 * @route GET /v1/invoices/:id
 * @desc Get single invoice by ID
 * @access Private/Admin
 */
router.get('/:id', adminLimiter, auth([ROLES.ADMIN]), async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).lean();

    if (!invoice) {
      return res.fail('Invoice not found', 404);
    }

    return res.ok({ invoice });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return res.fail('Failed to fetch invoice', 500);
  }
});

/**
 * @route GET /v1/invoices/:id/pdf
 * @desc Get invoice PDF
 * @access Private/Admin
 */
router.get('/:id/pdf', adminLimiter, auth([ROLES.ADMIN]), async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).lean();
    if (!invoice) {
      return res.fail('Invoice not found', 404);
    }
    const download = String(req.query.download || '').toLowerCase() === 'true';
    return streamInvoicePdf(invoice, res, { download });
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return res.fail('Failed to generate invoice PDF', 500);
  }
});

/**
 * @route GET /v1/invoices/order/:orderId
 * @desc Get invoice by order ID
 * @access Private/Admin
 */
router.get('/order/:orderId', adminLimiter, auth([ROLES.ADMIN]), async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ orderId: req.params.orderId }).lean();

    if (!invoice) {
      return res.fail('Invoice not found for this order', 404);
    }

    return res.ok({ invoice });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return res.fail('Failed to fetch invoice', 500);
  }
});

/**
 * @route GET /v1/invoices/order/:orderId/pdf
 * @desc Get invoice PDF by order ID
 * @access Private/Admin
 */
router.get('/order/:orderId/pdf', adminLimiter, auth([ROLES.ADMIN]), async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ orderId: req.params.orderId }).lean();
    if (!invoice) {
      return res.fail('Invoice not found for this order', 404);
    }
    const download = String(req.query.download || '').toLowerCase() === 'true';
    return streamInvoicePdf(invoice, res, { download });
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return res.fail('Failed to generate invoice PDF', 500);
  }
});

module.exports = router;
