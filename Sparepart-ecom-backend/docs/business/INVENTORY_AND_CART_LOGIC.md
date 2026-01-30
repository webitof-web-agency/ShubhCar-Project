# Inventory & Cart Logic (CRITICAL)

## Core Concepts
- **StockQty**: Physical on-hand count in warehouse.
- **ReservedQty**: Units currently sitting in unpaid orders (or active checkouts).
- **AvailableToShell**: `StockQty - ReservedQty`.

## Cart Validation Rules
1. **Add to Cart**: 
   - Check `(StockQty - ReservedQty) >= RequestedQty`.
   - If User is Wholesale, check `RequestedQty >= MinWholesaleQty`.
2. **Quantity Update**: 
   - Re-check availability.
3. **Review/Checkout**: 
   - **Hard Check**: Before creating order, we Atomic-Check-And-Reserve.
   - If stock claimed by another parallel user, throw `409 Conflict`.

## Race Condition Handling
We use **MongoDB Atomic Updates** (`$inc` operator with query predicates) to handle high concurrency.

**Example (Reservation):**
```javascript
db.productVariants.updateOne(
  { 
    _id: variantId, 
    stockQty: { $gte: reservedQty + requestQty } // Condition
  }, 
  { $inc: { reservedQty: requestQty } } // Action
)
```
If `modifiedCount === 0`, it means stock changed between the read and the write. We fail the request immediately ("Item sold out").

## Edge Cases
- **Parallel Checkouts**: Two users click "Pay" for the last item exactly same time. MongoDB atomicity ensures only one succeeds. The other gets an error.
- **Stock Exhaustion**: If `StockQty` hits 0, checks fail.
- **Abandoned Carts**: We do **NOT** reserve stock for items merely in Cart. We only reserve once the **Order Object** is created (Checkout initialized). This prevents cart hoarding.

## Known Risks / Flaws
1. **⚠️ No "Hold" timer**: Stock isn't held while user is typing card details, only after they click "Place Order". Could lead to frustration if item sells out while typing.
2. **⚠️ Cache Consistency**: Redis cache for product views might show "In Stock" for 30s after it's sold out. We validate against DB at Checkout to catch this.
