# Invoicing & Receipts System

## Overview

Automated invoice generation for orders with GST/tax compliance, PDF generation, and email delivery.

---

## Features

- 🧾 **Auto-Generate**: Invoice created on order confirmation
- 📄 **PDF Export**: Professional invoice PDFs
- 💰 **Tax Compliance**: GST, VAT, sales tax calculations
- 📧 **Email Delivery**: Automatic invoice emails
- 🔢 **Sequential Numbering**: Invoice number generation

---

## Invoice Data Model

```javascript
{
  _id: ObjectId,
  invoiceNumber: String (unique),  // INV-2024-0001
  orderId: ObjectId (ref: Order),
  userId: ObjectId (ref: User),
  
  // Business Details
  seller: {
    name: String,
    address: String,
    gstin: String,  // GST number
    pan: String
  },
  
  buyer: {
    name: String,
    address: String,
    gstin String,  // Optional for B2B
    email: String, 
    phone: String
  },
  
  // Line Items
  items: [
    {
      description: String,
      hsn: String,  // HSN/SAC code
      quantity: Number,
      unitPrice: Number,
      taxRate: Number,
      taxAmount: Number,
      total: Number
    }
  ],
  
  // Totals
  subtotal: Number,
  taxAmount: Number,
  shippingCost: Number,
  discount: Number,
  grandTotal: Number,
  
  // Payment
  paymentMethod: String,
  paymentStatus: String,
  paidAt: Date,
  
  // PDF
  pdfUrl: String,
  
  // Dates
  invoiceDate: Date,
  dueDate: Date,
  createdAt: Date
}
```

---

## Invoice Number Format

```
INV-{YEAR}-{SEQUENCE}

Examples:
INV-2024-00001
INV-2024-00002
...
INV-2025-00001  // Resets annually
```

---

## Tax Calculation

### GST (India)
```
Intra-State (same state):
CGST: 9%
SGST: 9%
Total: 18%

Inter-State (different states):
IGST: 18%
```

### VAT/Sales Tax
```
Varies by region
Applied as single percentage
```

---

## PDF Generation

**Template:**
```
┌─────────────────────────────────┐
│ Company Logo    INVOICE         │
│                 INV-2024-00123  │
├─────────────────────────────────┤
│ Bill From:       Bill To:       │
│ [Seller Info]    [Buyer Info]   │
├─────────────────────────────────┤
│ Item | Qty | Price | Tax | Total│
│------|-----|-------|-----|------|
│ ...  | ... |  ...  | ... | ...  │
├─────────────────────────────────┤
│ Subtotal:            ₹1,000.00  │
│ Tax (18%):             ₹180.00  │
│ Shipping:               ₹50.00  │
│ Discount:              -₹30.00  │
│---------------------------------|
│ Grand Total:         ₹1,200.00  │
└─────────────────────────────────┘
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/invoices/:orderId` | Get invoice for order |
| GET | `/invoices/:id/pdf` | Download PDF |
| POST | `/invoices/:id/resend` | Resend invoice email |
| GET | `/admin/invoices` | List all invoices |

---

## Generation Flow

```
1. Order confirmed (payment successful)
2. Generate invoice number
3. Calculate tax breakdown
4. Create invoice record
5. Generate PDF
6. Upload PDF to S3/CDN
7. Send invoice email to customer
8. Update order with invoice ref
```

---

## Email Template

```
Subject: Invoice for Order #ORD-2024-001

Dear Customer,

Thank you for your purchase!

Your invoice INV-2024-00123 is attached.

Order Total: ₹1,200.00
Payment Status: Paid

[Download Invoice PDF]

Thanks,
SpareParts Team
```

---

## Compliance

- **GST Compliance**: Proper tax breakdown
- **Sequential Numbering**: No gaps in invoice numbers
- **Record Retention**: 7 years minimum
- **Digital Signature**: Optional for legal validity

---

## Integration Points

- **Orders**: Triggered on order confirmation
- **Payments**: Payment status reflected
- **Email Queue**: Invoice delivery
- **PDF Service**: Generate professional PDFs
- **Storage**: S3/CDN for PDF storage

---

## Related Documentation

- [Order Lifecycle](./ORDER_LIFECYCLE.md)
- [Payment Flow](./PAYMENT_FLOW.md)
- [Shipping & Tax](./SHIPPING_AND_TAX.md)
