//src/components/invoice/InvoiceTemplate.jsx
"use client";
import { forwardRef } from 'react';
import { useSiteConfig } from '@/hooks/useSiteConfig';
import { formatPrice } from '@/services/pricingService';
import { formatTaxBreakdown } from '@/services/taxDisplayService';

const InvoiceTemplate = forwardRef(({ order, items = [], address, settings = {} }, ref) => {
  const { siteName } = useSiteConfig();
  if (!order) return null;

  // Use settings with fallbacks
  const companyName = settings.invoice_company_name || `${siteName} India Pvt Ltd`;
  const addressLine1 = settings.invoice_company_address_line1 || '123, Industrial Area, Phase 2';
  const addressLine2 = settings.invoice_company_address_line2 || '';
  const city = settings.invoice_company_city || 'Gurugram';
  const state = settings.invoice_company_state || 'Haryana';
  const pincode = settings.invoice_company_pincode || '122001';
  const gstin = settings.invoice_company_gstin || 'GSTIN NOT CONFIGURED';
  const companyEmail = settings.invoice_company_email || 'support@example.com';
  const companyPhone = settings.invoice_company_phone || '+91 1800-123-4567';
  const companyWebsite = settings.invoice_company_website || '';

  const invoiceNumber = `INV-${order.orderNumber || order._id}`;
  const invoiceDateSource = order.placedAt || order.createdAt;
  const invoiceDate = invoiceDateSource ? new Date(invoiceDateSource).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }) : 'N/A';

  const subtotal = order.subtotal || 0;
  const discount = order.discountAmount || 0;
  const taxAmount = order.taxAmount || 0;
  const shippingFee = order.shippingFee || 0;
  const grandTotal = order.grandTotal || 0;
  const taxBreakdown = order.taxBreakdown || { cgst: 0, sgst: 0, igst: 0 };

  // This ensures Taxable + Tax + Shipping = Grand Total always holds true
  const taxableAmount = Math.max(0, grandTotal - shippingFee - taxAmount);

  // Get logo from settings or config
  const logoUrl = settings.invoice_logo_url;
  const { logoDark, logoLight } = useSiteConfig();
  const logo = logoUrl || logoDark || logoLight;

  return (
    <div ref={ref} className="text-sm leading-tight text-gray-900 p-6 print:p-10 print:text-[11px]" id="invoice-template">
      <div className="flex flex-row justify-between items-start mb-6 pb-4 border-b-2 border-gray-200 print:mb-3 print:pb-2">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {logo ? (
              <img src={logo} alt={companyName} className="h-15 w-auto object-contain" />
            ) : (
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">{companyName.substring(0, 2).toUpperCase()}</span>
              </div>
            )}
          </div>
          <div className="mt-3 text-xs text-gray-600 leading-relaxed">
            <p>{companyName}</p>
            <p>{addressLine1}</p>
            {addressLine2 && <p>{addressLine2}</p>}
            <p>{city}, {state} - {pincode}</p>
            <p>GSTIN: {gstin}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold text-gray-900 mt-3 ">TAX INVOICE</h2>
          <div className="text-xs mt-12 space-y-1">
            <p><span className="text-gray-500">Invoice No:</span> <span className="font-semibold">{invoiceNumber}</span></p>
            <p><span className="text-gray-500">Invoice Date:</span> <span className="font-semibold">{invoiceDate}</span></p>
            <p><span className="text-gray-500">Order No:</span> <span className="font-semibold">{order.orderNumber}</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6 print:grid-cols-2 print:gap-4 print:mb-3">
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Bill To</h3>
          <div className="text-xs leading-relaxed">
            <p className="font-semibold text-gray-900">{address?.fullName || '-'}</p>
            <p className="text-gray-600">{address?.line1 || '-'}</p>
            {address?.line2 && <p className="text-gray-600">{address.line2}</p>}
            <p className="text-gray-600">{address?.city || '-'}, {address?.state || '-'} - {address?.postalCode || '-'}</p>
            <p className="text-gray-600 mt-1">Phone: {address?.phone || '-'}</p>
          </div>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ship To</h3>
          <div className="text-xs leading-relaxed">
            <p className="font-semibold text-gray-900">{address?.fullName || '-'}</p>
            <p className="text-gray-600">{address?.line1 || '-'}</p>
            {address?.line2 && <p className="text-gray-600">{address.line2}</p>}
            <p className="text-gray-600">{address?.city || '-'}, {address?.state || '-'} - {address?.postalCode || '-'}</p>
            <p className="text-gray-600 mt-1">Phone: {address?.phone || '-'}</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-12" />
            <col />
            <col className="w-16" />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-28" />
          </colgroup>
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase">#</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase">Item Description</th>
              <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase">Qty</th>
              <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase">Unit Price</th>
              <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase">Tax</th>
              <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item._id || item.id || index} className="border-b border-gray-100">
                <td className="py-2.5 px-3 text-xs text-gray-600">{index + 1}</td>
                <td className="py-2.5 px-3">
                  <p className="text-xs font-medium text-gray-900 truncate">{item.product?.name || 'Product'}</p>
                </td>
                <td className="py-2.5 px-3 text-center text-xs text-gray-600">{item.quantity}</td>
                <td className="py-2.5 px-3 text-right text-xs text-gray-600 whitespace-nowrap">{formatPrice(item.price || 0)}</td>
                <td className="py-2.5 px-3 text-right text-xs text-gray-600 whitespace-nowrap">{formatPrice(item.taxAmount || 0)}</td>
                <td className="py-2.5 px-3 text-right text-xs font-medium text-gray-900 whitespace-nowrap">{formatPrice(item.total || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mb-6">
        <div className="w-72">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between py-1.5">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">{formatPrice(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between py-1.5 text-green-600">
                <span>Discount</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            )}
            <div className="flex justify-between py-1.5">
              <span className="text-gray-600">Taxable Amount</span>
              <span className="font-medium">{formatPrice(taxableAmount)}</span>
            </div>
            {formatTaxBreakdown(taxBreakdown).map((component) => (
              <div key={component.key} className="flex justify-between py-1.5">
                <span className="text-gray-600">{component.label}</span>
                <span>{component.formatted}</span>
              </div>
            ))}
            <div className="flex justify-between py-1.5">
              <span className="text-gray-600">Shipping</span>
              <span>{shippingFee === 0 ? 'Free' : formatPrice(shippingFee)}</span>
            </div>
            <div className="flex justify-between py-2 border-t-2 border-gray-900 mt-1.5">
              <span className="text-base font-bold text-gray-900">Grand Total</span>
              <span className="text-base font-bold text-gray-900">{formatPrice(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6 pt-4 border-t border-gray-200">
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Payment Information</h3>
          <div className="text-xs text-gray-600 leading-relaxed">
            <p><span className="text-gray-500">Payment Method:</span> {order.paymentMethod}</p>
            <p><span className="text-gray-500">Payment Status:</span> <span className="text-green-600 font-medium">{order.paymentStatus}</span></p>
          </div>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Terms & Conditions</h3>
          <div className="text-[10px] text-gray-500 space-y-0.5 leading-relaxed">
            <p>* Goods once sold will not be taken back or exchanged.</p>
            <p>* All disputes are subject to Gurugram jurisdiction.</p>
            <p>* This is a computer generated invoice.</p>
          </div>
        </div>
      </div>

      <div className="text-center pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-600 mb-1">Thank you for shopping with {companyName}!</p>
        <p className="text-[10px] text-gray-400">
          For queries, contact: {companyEmail} | {companyPhone}
          {companyWebsite && ` | ${companyWebsite}`}
        </p>
      </div>
    </div>
  );
});

InvoiceTemplate.displayName = 'InvoiceTemplate';

export default InvoiceTemplate;
