# Shipping & Tax

## Shipping Calculation
Currently implemented as a **Tiered Flat Rate** strategy (Can be upgraded to dynamic carrier API later).

### Strategy
1. **Calculate Subtotal**.
2. **Apply Rules**:
   - If `Subtotal > FreeShippingThreshold` (e.g., ₹5000): **₹0**.
   - If `Weight > 5kg`: Surcharge applies (⚠️ Partially Implemented).
   - Standard: **Flat Fee** (e.g., ₹100).

## Tax Calculation (GST - India)
We follow standard GST rules:
- **Intra-State** (Buyer State == Seller State): CGST (50%) + SGST (50%).
- **Inter-State** (Buyer State != Seller State): IGST (100%).

### Logic
1. Each Product has an `hsnCode` and `taxPercent` (e.g., 18%).
2. At checkout, we compare `UserAddress.state` vs `Vendor.state`.
3. Formula:
   ```javascript
   TaxAmount = (Price * Quantity) * (TaxRate / 100)
   ```
4. Tax is calculated **Per Line Item** to allow mixed-tax carts (e.g., 5% item and 18% item).

## Current Limitations
- ❌ No automatic HSN lookup.
- ❌ Cross-border (International) tax/duties not handled.
- ⚠️ Shipping rates are hardcoded in config, not fetched live from Shiprocket/FedEx.
