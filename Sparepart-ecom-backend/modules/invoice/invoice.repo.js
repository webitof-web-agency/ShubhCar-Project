const Invoice = require('../../models/InvoiceSchema');

class InvoiceRepo {
  findByOrder(orderId) {
    return Invoice.findOne({ orderId, type: 'invoice' });
  }

  findCreditNoteByInvoice(invoiceId) {
    return Invoice.findOne({
      relatedInvoiceId: invoiceId,
      type: 'credit_note',
    });
  }
}

module.exports = new InvoiceRepo();
