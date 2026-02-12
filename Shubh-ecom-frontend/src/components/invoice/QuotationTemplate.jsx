"use client";
import { forwardRef } from 'react';
import { useSiteConfig } from '@/hooks/useSiteConfig';
import { formatPrice, getDisplayPrice } from '@/services/pricingService';
import { formatTaxBreakdown } from '@/services/taxDisplayService';

const QuotationTemplate = forwardRef(({ items = [], summary = {}, profile = {} }, ref) => {
  const { siteName, logoDark, logoLight } = useSiteConfig();

  // Use settings or defaults
  const settings = summary?.settings || {};
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

  // Generate Quote Details
  const now = new Date();
  const quoteNumber = `QT-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
  
  const quoteDate = now.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  // Valid Until (15 days from now)
  const validUntilDate = new Date(now);
  validUntilDate.setDate(validUntilDate.getDate() + 15);
  const validUntil = validUntilDate.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  // Calculate Totals using logic consistent with Invoice/Checkout
  // Note: summary might be partial if coming from CartContext, ensure defaults
  // Calculate Totals using logic consistent with Invoice/Checkout
  // Note: summary might be partial if coming from CartContext, ensure defaults
  const subtotal = summary?.taxableAmount || summary?.subtotal || 0;
  const discount = summary?.discountAmount || 0;
  const taxAmount = summary?.taxAmount || 0;
  const shippingFee = summary?.shippingFee || 0;
  const grandTotal = summary?.total || summary?.grandTotal || 0;
  const taxBreakdown = summary?.taxDetails || summary?.taxBreakdown || { cgst: 0, sgst: 0, igst: 0 };

  // Prioritize Net Subtotal calculation for display consistency
  // If we have grandTotal, work backwards: Net = Total - Tax - Shipping
  const displaySubtotal = grandTotal ? Math.max(0, grandTotal - taxAmount - shippingFee) : subtotal;

  // Logo
  const logo = settings.invoice_logo_url || logoDark || logoLight;

  return (
    <div ref={ref} className="bg-white text-sm leading-tight text-gray-900 p-8 print:p-8" id="quotation-template" style={{ transform: 'scale(1.1)' }}>
      {/* Force HEX colors for html2canvas compatibility (fixes 'lab'/'oklch' error) */}
      <style>{`
        .bg-white { background-color: #ffffff !important; }
        .bg-gray-50 { background-color: #f9fafb !important; }
        .bg-orange-500 { background-color: #f97316 !important; }
        .text-gray-900 { color: #111827 !important; }
        .text-gray-800 { color: #1f2937 !important; }
        .text-gray-600 { color: #4b5563 !important; }
        .text-gray-500 { color: #6b7280 !important; }
        .text-gray-400 { color: #9ca3af !important; }
        .text-orange-600 { color: #ea580c !important; }
        .text-black { color: #000000 !important; }
        .text-white { color: #ffffff !important; }
        .text-green-600 { color: #16a34a !important; }
        .border-gray-200 { border-color: #e5e7eb !important; }
        .border-gray-100 { border-color: #f3f4f6 !important; }
      `}</style>
       {/* Header */}
      <div className="flex flex-row justify-between items-start mb-8 pb-6 border-b-2 border-gray-200">
        <div className="flex flex-col">
           <div className="mb-4">
             {logo ? (
              <img src={logo} alt={companyName} className="h-15 w-auto object-contain" />
            ) : (
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">{companyName.substring(0, 2).toUpperCase()}</span>
              </div>
            )}
          </div>
          <div className="text-xs text-gray-600 leading-relaxed">
            <p className="font-bold text-gray-900 text-sm mb-1">{companyName}</p>
            <p>{addressLine1}</p>
            {addressLine2 && <p>{addressLine2}</p>}
            <p>{city}, {state} - {pincode}</p>
            {gstin && gstin !== 'GSTIN NOT CONFIGURED' && (
                <p>GSTIN: {gstin}</p>
            )}
            <p className="mt-1">
                 {companyEmail} | {companyPhone}
            </p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold text-black mb-10">QUOTATION</h2>
          <div className="text-xs mt-10 space-y-1.5">
            <p><span className="text-gray-500 w-24 inline-block">Quote No:</span> <span className="font-semibold">{quoteNumber}</span></p>
            <p><span className="text-gray-500 w-24 inline-block">Date:</span> <span className="font-semibold">{quoteDate}</span></p>
            <p><span className="text-gray-500 w-24 inline-block">Valid Until:</span> <span className="font-semibold text-orange-600">{validUntil}</span></p>
          </div>
        </div>
      </div>

      {/* Bill To (Current User or Guest) */}
      <div className="mb-8">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">Quotation For</h3>
        <div className="text-xs leading-relaxed">
          {profile.name || profile.fullName ? (
             <>
                <p className="font-semibold text-gray-900 text-sm">{profile.name || profile.fullName}</p>
                {profile.email && <p className="text-gray-600">{profile.email}</p>}
                {profile.phone && <p className="text-gray-600">{profile.phone}</p>}
                {(profile.address || profile.addresses?.[0]) && (
                    <div className="mt-1 text-gray-500">
                        {profile.addresses?.[0]?.line1 && <p>{profile.addresses[0].line1}</p>}
                        {profile.addresses?.[0]?.city && <p>{profile.addresses[0].city}, {profile.addresses[0].state}</p>}
                    </div>
                )}
             </>
          ) : (
            <p className="text-gray-500 italic">Guest User</p>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-12" />
            <col />
            <col className="w-16" />
            <col className="w-24" />
            <col className="w-20" />
            <col className="w-28" />
          </colgroup>
          <thead>
            <tr className="bg-gray-50 border-y border-gray-200">
              <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase">#</th>
              <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase">Item Description</th>
              <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 uppercase">Qty</th>
              <th className="text-right py-3 px-3 text-xs font-semibold text-gray-600 uppercase">Unit Price</th>
              <th className="text-right py-3 px-3 text-xs font-semibold text-gray-600 uppercase">Tax (%)</th>
              <th className="text-right py-3 px-3 text-xs font-semibold text-gray-600 uppercase">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
                // 1. Get Base Pricing (Likely Inclusive in Context of E-com)
                const pricing = getDisplayPrice(item.product || item, profile);
                const rawPrice = pricing.price || item.price || 0;
                const itemQty = item.quantity || 1;

                // 2. Resolve Tax Info
                // Try item specific tax info first, fallback to summary inference if available
                let taxRate = item.taxPercent;
                // Use safe navigation for summary
                const summaryTaxable = summary?.taxableAmount || 0;
                const summaryTax = summary?.taxAmount || 0;

                if ((!taxRate || taxRate === 0) && summaryTaxable > 0 && summaryTax > 0) {
                    // Infer global rate from summary (approx)
                    taxRate = (summaryTax / summaryTaxable) * 100;
                }
      
                taxRate = taxRate || 0;

                // 3. Calculate Components
                // Assuming rawPrice is INCLUSIVE (Standard for E-com display) unless specified
                // If taxAmount is explicitly provided, use it. Otherwise back-calculate.
                let itemTaxAmount = item.taxAmount;
                let unitPriceExcl = rawPrice;

                if (!itemTaxAmount && taxRate > 0) {
                     // Back-calculate from inclusive price
                     // Price = Base * (1 + rate/100)  =>  Base = Price / (1 + rate/100)
                     unitPriceExcl = rawPrice / (1 + (taxRate / 100));
                     itemTaxAmount = (unitPriceExcl * taxRate) / 100;
                     // Adjust unit price to be per item
                     // Note: itemTaxAmount here is per UNIT if calculated from rawPrice (unit price)
                     // But item.taxAmount usually is line tax. Let's stick to Unit logic first.
                     // Actually rawPrice is Unit Price.
                     itemTaxAmount = itemTaxAmount * itemQty; // Total tax for line
                } else if (!itemTaxAmount) {
                     itemTaxAmount = 0;
                }

                // If we used provided item.taxAmount, we can derive Excl Unit Price
                // NetLine = TotalLine - TaxLine
                // UnitNet = NetLine / Qty
                const lineTotal = item.lineTotal || (rawPrice * itemQty); // This is usually inclusive total
                // Recalculate robustly
                const totalAmount = lineTotal; 
                const netAmount = totalAmount - itemTaxAmount;
                const unitNetPrice = netAmount / itemQty;

               return (
                  <tr key={index} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 px-3 text-xs text-gray-500">{index + 1}</td>
                    <td className="py-3 px-3">
                      <p className="text-xs font-medium text-gray-900">{item.product?.name || item.name || 'Product'}</p>
                      {item.variant && <p className="text-[10px] text-gray-500">{item.variant.name}</p>}
                    </td>
                    <td className="py-3 px-3 text-center text-xs text-gray-600">{itemQty}</td>
                    {/* Display Net Unit Price */}
                    <td className="py-3 px-3 text-right text-xs text-gray-600 whitespace-nowrap">{formatPrice(unitNetPrice)}</td>
                    <td className="py-3 px-3 text-right text-xs text-gray-600 whitespace-nowrap">
                         {formatPrice(itemTaxAmount)}
                    </td>
                    <td className="py-3 px-3 text-right text-xs font-medium text-gray-900 whitespace-nowrap">{formatPrice(totalAmount)}</td>
                  </tr>
               );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="flex justify-end mb-8">
        <div className="w-80 bg-gray-50 p-4 rounded-lg">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">{formatPrice(displaySubtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            )}
            
            {/* Tax Breakdown */}
            {formatTaxBreakdown(taxBreakdown).map((component) => {
              // Calculate effective rate for this component based on taxable amount
              const effectiveRate = displaySubtotal > 0 ? (component.value / displaySubtotal) * 100 : 0;
              const labelWithPercent = effectiveRate > 0 ? `${component.label} (${effectiveRate.toFixed(0)}%)` : component.label;

              return (
                <div key={component.key} className="flex justify-between text-gray-500">
                  <span>{labelWithPercent}</span>
                  <span>{component.formatted}</span>
                </div>
              );
            })}

            <div className="flex justify-between">
              <span className="text-gray-600">Shipping Estimate</span>
              <span>{shippingFee === 0 ? 'Free' : formatPrice(shippingFee)}</span>
            </div>
            
            <div className="flex justify-between py-2 border-t border-gray-200 mt-2 text-base">
              <span className="font-bold text-gray-900">Total Estimate</span>
              <span className="font-bold text-orange-600">{formatPrice(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Notes */}
      <div className="border-t border-gray-200 pt-6 text-center">
         <p className="text-xs font-medium text-gray-800 mb-2">Terms & Conditions</p>
         <div className="text-[10px] text-gray-500 space-y-1 max-w-2xl mx-auto">
            <p>1. This is a computer-generated quotation and does not require a signature.</p>
            <p>2. Prices are subject to change without prior notice.</p>
            <p>3. This quotation is valid until {validUntil}.</p>
            <p>4. Shipping charges are estimates and may vary at actual checkout based on location.</p>
         </div>
         <p className="text-xs text-gray-400 mt-4">Generated via {siteName}</p>
      </div>

    </div>
  );
});

QuotationTemplate.displayName = "QuotationTemplate";
export default QuotationTemplate;
