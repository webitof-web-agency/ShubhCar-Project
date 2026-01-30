# Returns & Refunds System

## Overview

The Returns & Refunds system handles customer return requests, manages the approval workflow, and processes inventory reconciliation and refunds. It supports full and partial returns with multi-vendor coordination.

---

## Key Features

- 📦 **Full & Partial Returns** - Return entire orders or specific items
- 🔄 **Multi-Step Approval** - Customer → Admin → Vendor → Completion
- 💰 **Automatic Refunds** - Integrated with payment gateways
- 📊 **Inventory Reconciliation** - Automatic stock restoration
- 👥 **Multi-Vendor Support** - Vendor confirmation for marketplace items
- 🔒 **Transaction Safety** - MongoDB transactions for data consistency

---

## Return State Machine

```
┌──────────┐
│ pending  │ (Customer submits return request)
└────┬─────┘
     │
     ├──[Admin Approves]──→  ┌──────────┐
     │                       │ approved │
     │                       └────┬─────┘
     │                            │
     │                       [Vendor Confirms]
     │                            ↓
     │                       ┌─────────────────┐
     │                       │ vendor_confirmed│
     │                       └────┬────────────┘
     │                            │
     │                       [Admin Completes]
     │                            ↓
     │                       ┌───────────┐
     │                       │ completed │ (Inventory restored, refund issued)
     │                       └───────────┘
     │
     ├──[Admin Rejects]──→  ┌──────────┐
     │                      │ rejected │
     │                      └──────────┘
     │
     └──[Customer Cancels]──→  ┌───────────┐
                               │ cancelled │
                               └───────────┘
```

---

## Data Model

### Return Request Schema

```javascript
{
  _id: ObjectId,
  orderId: ObjectId (ref: Order),
  userId: ObjectId (ref: User),
  items: [
    {
      orderItemId: ObjectId (ref: OrderItem),
      vendorId: ObjectId (ref: Vendor),
      quantity: Number,
      reason: String,
      status: String // 'pending', 'approved', 'rejected'
    }
  ],
  status: String, // 'pending', 'approved', 'rejected', 'vendor_confirmed', 'completed', 'cancelled'
  adminNote: String,
  vendorNote: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

## API Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/returns` | Yes | Customer | Request a return |
| GET | `/returns` | Yes | Any | List return requests (filtered by role) |
| GET | `/returns/:id` | Yes | Owner/Admin/Vendor | Get return details |
| PATCH | `/returns/:id/admin-decision` | Yes | Admin | Approve/Reject return |
| PATCH | `/returns/:id/vendor-confirm` | Yes | Vendor | Vendor confirmation |
| PATCH | `/returns/:id/complete` | Yes | Admin | Complete return & process refund |

---

## Business Logic

### 1. Request Return (Customer)

**Validation:**
- Order must exist and belong to requesting user
- Order must be delivered (can't return before delivery)
- Return quantity must be ≤ original order quantity
- Each item must have a valid reason

**Process:**
1. Validate order ownership
2. Load order items
3. Validate return quantities against order quantities
4. Create return request with status `pending`
5. Notify admin of new return request

**Return Reasons:**
- Damaged item
- Wrong item received
- Quality not as expected
- Changed mind
- Other (with description)

---

### 2. Admin Decision

**Actions:**
- **Approve** - Move to `approved` status
- **Reject** - Move to `rejected` status, no further action

**Process:**
1. Validate return request exists
2. Update status to `approved` or `rejected`
3. Add admin notes if provided
4. Notify customer of decision
5. If approved and single vendor, move to completion
6. If approved and multi-vendor, wait for vendor confirmation

---

### 3. Vendor Confirmation (Marketplace Only)

**Authorization:**
- Vendor must own at least one item in the return request
- Only vendors can confirm their own items

**Process:**
1. Validate vendor ownership of at least one item
2. Update status to `vendor_confirmed`
3. Add vendor notes
4. Notify admin that return is ready for completion

---

### 4. Complete Return (Admin)

**Critical Process** - Uses MongoDB Transaction:

```javascript
Transaction Flow:
1. Start MongoDB transaction
2. Load return request
3. Load order items
4. For each returned item:
   - Restore inventory (inventoryService.release)
   - Update order item status to 'returned'
5. Update return status to 'completed'
6. Commit transaction
7. Outside transaction:
   - Process refund via payment gateway
   - Send refund confirmation email
   - Update order status if fully returned
```

**Inventory Reconciliation:**
- Stock quantity += returned quantity
- Reserved quantity unchanged (order already fulfilled)

**Refund Processing:**
- Calculate refund amount (item price × quantity)
- Include proportional tax refund
- Exclude non-refundable shipping fees (configurable)
- Process refund via original payment gateway
- Record refund transaction

**Email Notifications:**
- Customer: Refund processed confirmation
- Vendor(s): Return completed notification
- Admin: Completion summary

---

## Integration Points

### Orders Module
- Validates order ownership
- Updates order status if fully returned
- Loads order items for validation

### Inventory Module
- Calls `inventoryService.release()` to restore stock
- Updates product variant quantities

### Payments Module
- Processes refunds via Stripe/Razorpay
- Records refund transactions

### Order Items Module
- Updates item status to `returned`
- Validates return quantities

### Vendors Module
- Validates vendor ownership for confirmation
- Notifies vendors of returns

### Email Module
- Return request received (to admin)
- Return approved/rejected (to customer)
- Vendor confirmation needed (to vendor)
- Refund processed (to customer)

---

## Security Considerations

### Access Control
- **Customers**: Can only request returns for their own orders
- **Vendors**: Can only confirm returns for items they sold
- **Admins**: Full access to all return operations

### Validation
- Return quantity ≤ order quantity
- Order must be in returnable state (delivered, not already returned)
- Return window validation (e.g., 30 days from delivery)
- Duplicate return prevention (can't return same item twice)

### Transaction Safety
- MongoDB transactions ensure inventory + order item updates are atomic
- Rollback on failure prevents partial state
- Refund idempotency key prevents duplicate charges

---

## Return Window Configuration

**Environment Variables:**
```env
RETURN_WINDOW_DAYS=30         # Days after delivery to allow returns
ALLOW_PARTIAL_RETURNS=true    # Allow returning some items
REFUND_SHIPPING=false         # Refund original shipping cost
AUTO_APPROVE_RETURNS=false    # Skip admin approval step
```

**Return Eligibility Rules:**
1. Order must be `delivered` status
2. Within return window (default 30 days from delivery)
3. Item not marked as `non-returnable`
4. Item quantity available (not already returned)

---

## Common Use Cases

### Scenario 1: Simple Return (Single Vendor)
```
1. Customer receives damaged item
2. Customer submits return request with photos
3. Admin reviews and approves
4. Admin completes return
5. Inventory restored automatically
6. Refund processed to customer's payment method
7. Customer receives refund confirmation email
```

### Scenario 2: Multi-Vendor Return
```
1. Customer orders from 3 vendors, wants to return 1 item from each
2. Customer submits return request
3. Admin approves
4. Each vendor receives confirmation request
5. Vendors confirm item condition
6. Admin completes return
7. Inventory restored for all 3 vendors
8. Single refund issued to customer for total amount
```

### Scenario 3: Partial Return
```
1. Customer ordered 5 units, only 2 defective
2. Customer returns 2 units
3. Admin approves
4. System restores 2 units to inventory
5. Partial refund issued (2/5 of total)
6. Order remains in 'delivered' state (3 units still valid)
```

---

## Error Handling

### Common Errors

| Error Code | HTTP | Description | Solution |
|------------|------|-------------|----------|
| RETURN_ORDER_NOT_FOUND | 404 | Order doesn't exist | Verify order ID |
| RETURN_FORBIDDEN | 403 | Not order owner | Check user authentication |
| RETURN_INVALID_QUANTITY | 400 | Quantity exceeds ordered | Check return quantity |
| RETURN_WINDOW_EXPIRED | 400 | Past return deadline | Check delivery date |
| RETURN_ALREADY_RETURNED | 409 | Item already returned | Check return history |
| RETURN_NOT_DELIVERED | 400 | Order not delivered yet | Wait for delivery |
| REFUND_FAILED | 500 | Payment gateway error | Retry or manual refund |

---

## Performance Notes

### Database Queries
- Index on `orderId`, `userId`, `status` for filtering
- Populate order items only when needed
- Use projection to limit fields returned

### Caching
- Return eligibility rules cached (30s TTL)
- Vendor mappings cached to reduce DB calls

### Transaction Performance
- Keep transaction scope minimal
- Only inventory + order item updates inside transaction
- Refund processing happens after commit

---

## Testing

### Unit Tests
```bash
npm test -- return.service.test.js
```

**Test Cases:**
- ✅ Customer can request return for own order
- ✅ Cannot return more than ordered quantity
- ✅ Cannot return other user's orders
- ✅ Admin can approve/reject returns
- ✅ Vendor can confirm only own items
- ✅ Complete return restores inventory correctly
- ✅ Transaction rollback on failure
- ✅ Duplicate return prevention

### Integration Tests
```bash
npm run test:integration -- returns
```

**Scenarios:**
- End-to-end return flow
- Multi-vendor return coordination
- Refund processing
- Inventory reconciliation validation

---

## Known Issues & Limitations

### Current Limitations
1. **Return window**: Fixed at 30 days, not configurable per product
2. **Shipping cost**: Currently non-refundable (business decision)
3. **Restocking fee**: Not implemented yet
4. **Automatic approval**: Only admin can approve (no auto-approval rules)
5. **Return shipping**: Customer responsible for return shipping cost

### Planned Improvements
- [ ] Configurable return windows per category
- [ ] Automatic approval for specific reasons (e.g., damaged items with photo proof)
- [ ] Return shipping label generation
- [ ] Partial refund amounts (account for used/damaged items)
- [ ] Return analytics dashboard

---

## Monitoring & Metrics

### Key Metrics
- Return rate by product/category
- Average return processing time
- Return reasons breakdown
- Refund success rate
- Vendor confirmation time

### Alerts
- Return rate spike (> 20% for any product)
- Pending returns > 48 hours
- Failed refund transactions
- High rejection rate (potential quality issues)

---

## Related Documentation

- [Order Lifecycle](./ORDER_LIFECYCLE.md) - Order state management
- [Inventory & Cart Logic](./INVENTORY_AND_CART_LOGIC.md) - Inventory reconciliation
- [Payment Flow](./PAYMENT_FLOW.md) - Refund processing
- [Email Workflow](./EMAIL_WORKFLOW.md) - Return notifications
