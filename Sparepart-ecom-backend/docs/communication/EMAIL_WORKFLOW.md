## Order & Email Workflow Analysis

### Current Order Lifecycle

```
1. placeOrder() → Order created, status: "created", payment: "pending"
   ├─ Inventory reserved
   ├─ Cart cleared
   └─ Returns: orderId for payment initiation

2. Payment initiated by frontend
   └─ Payment gateway creates intent

3. Payment webhook received → confirmOrder()
   ├─ Order status: "confirmed"
   ├─ Payment status: "paid"
   ├─ Inventory committed
   ├─ Invoice generated
   ├─ Coupon usage recorded
   └─ ✉️ SEND ORDER CONFIRMATION EMAIL HERE

4. Admin marks as shipped → shipOrder()
   ├─ Order status: "shipped"
   ├─ Tracking number added
   └─ ✉️ SEND SHIPPING NOTIFICATION EMAIL HERE

5. Delivery confirmed
   ├─ Order status: "delivered"
   └─ ✉️ SEND DELIVERY CONFIRMATION EMAIL HERE
```

### Email Trigger Points

**DO NOT send email on:**
- ❌ Order creation (status: "created") - Payment not yet done
- ❌ Payment initiation - Not confirmed yet

**DO send email on:**
- ✅ Order confirmation (after payment webhook success)
- ✅ Order shipped (tracking number added)
- ✅ Order delivered
- ✅ Password reset request
- ✅ Low stock alert (to admin, daily cron)

### Implementation Plan

1. Add email triggers in `orders.service.js`:
   - `confirmOrder()` → Order confirmation email
   - `shipOrder()` → Shipping notification

2. Add email triggers in `auth.service.js`:
   - `forgotPassword()` → Password reset email

3. Add low stock cron job

4. Create email templates if missing
