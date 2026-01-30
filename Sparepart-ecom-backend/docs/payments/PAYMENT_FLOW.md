# Payment Flow

## Payment Initiation
1. Customer clicks "Pay".
2. Backend creates `Order` (State: `CREATED`).
3. Backend calls Gateway (Stripe/Razorpay) to create an "Intent" or "Order".
4. Gateway returns a `client_secret` or `order_id`.
5. Backend saves this mapping in `Payment` collection.
6. Frontend receives keys to open the payment modal.

## Order ↔ Payment Relationship
- **One-to-Many**: An order can have multiple payment attempts (failed attempts).
- **Constraint**: Only **ONE** payment can be `PAID` / `CAPTURED` per order.

## Webhook Handling
We rely on Webhooks for the source of truth, not the frontend success callback.
1. **Event**: `payment_intent.succeeded` (Stripe) or `payment.captured` (Razorpay).
2. **Verification**: 
   - Validate Webhook Signature (HMAC).
   - Find `Order` by metadata ID.
   - Idempotency Check: logical check "Is this order already paid?".
3. **Action**:
   - Update `Payment` record status to `PAID`.
   - Call `OrderService.confirmOrder(orderId)`.
4. **Response**: 200 OK to gateway.

## Failure Cases
- **User closes window**: Order remains `CREATED`. Auto-cancel job kills it later.
- **Card Decline**: Gateway returns error. Frontend allows retry. Backend logs failure in `Payment` record.
- **Webhook Missed**: We run a `PaymentReconciliationCron` every hour to poll gateway for "Lost" payments.

## PCI Safety
- **Compliance**: We use SAQ-A.
- **Data storage**: We **NEVER** store Card Numbers, CVV, or Expiry dates.
- **Transmission**: All raw card data goes directly from Frontend -> Gateway via Iframe/SDK.

## What Backend Stores
- Gateway Transaction IDs.
- Last 4 digits (optional, for UI).
- Card Brand (Visa/Master).
- Payment Status.
