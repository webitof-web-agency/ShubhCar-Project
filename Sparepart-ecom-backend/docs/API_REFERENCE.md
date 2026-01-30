# API Reference & Documentation

**Version**: 1.0.0  
**Base URL**: `https://api.yourdomain.com/api/v1` (or `/api` for relative)  
**Authentication**: Bearer Token (JWT)

---

## Quick Reference

### 🔐 Auth APIs
| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | No | - | Create new account |
| `POST` | `/auth/login` | No | - | Login with password/email/phone |
| `POST` | `/auth/otp/send` | No | - | Send OTP to phone/email |
| `POST` | `/auth/otp/verify` | No | - | Login via OTP |
| `POST` | `/auth/refresh` | No | - | Rotate tokens |
| `POST` | `/auth/logout` | Yes | Any | Invalidates current session |

### 📦 Product APIs
| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/products` | No | - | List/Search products |
| `GET` | `/products/:slug` | No | - | Get full product details |
| `POST` | `/products` | Yes | Admin | Create product |
| `PUT` | `/products/:id` | Yes | Admin | Update product |
| `DELETE` | `/products/:id` | Yes | Admin | Soft delete product |

### 🚗 Vehicle Management APIs
| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/vehicle-management/brands` | No | - | List vehicle brands |
| `GET` | `/vehicle-management/models` | No | - | List models for brand |
| `GET` | `/vehicle-management/vehicles/available-years` | No | - | List years for model |
| `GET` | `/vehicle-management/vehicles/available-attributes` | No | - | List attributes for filtering |
| `GET` | `/vehicle-management/vehicles` | No | - | Find matching vehicles |
| `GET` | `/vehicle-management/vehicles/:id` | No | - | Get vehicle details |
| `POST` | `/vehicle-management/vehicles` | Yes | Admin | Create vehicle variant |
| `PUT` | `/vehicle-management/vehicles/:id` | Yes | Admin | Update vehicle variant |
| `DELETE` | `/vehicle-management/vehicles/:id` | Yes | Admin | Soft delete vehicle |

### 🛒 Cart APIs
| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/cart` | Yes/Guest | - | Get current cart |
| `POST` | `/cart/items` | Yes/Guest | - | Add item to cart |
| `PATCH` | `/cart/items/:id`| Yes/Guest | - | Update qty |
| `DELETE` | `/cart/items/:id`| Yes/Guest | - | Remove item |
| `POST` | `/cart/coupon` | Yes/Guest | - | Apply coupon code |

### 📦 Order APIs
| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/orders` | Yes | Customer | Place new order |
| `GET` | `/orders` | Yes | Customer | List my orders |
| `GET` | `/orders/:id` | Yes | Customer | Get order details |
| `POST` | `/orders/:id/cancel`| Yes | Customer | Cancel (if eligible) |

### 💳 Payment APIs
| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/payments/initiate`| Yes | Customer | Start payment (Stripe/Razorpay) |
| `GET` | `/payments/:id` | Yes | Customer | Check status |
| `POST` | `/webhooks/stripe` | No | - | Stripe webhook handler |
| `POST` | `/webhooks/razorpay` | No | - | Razorpay webhook handler |

### 🛡️ Admin APIs
| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/admin/orders` | Yes | Admin | List all platform orders |
| `PATCH` | `/admin/orders/:id` | Yes | Admin | Force status update |
| `POST` | `/admin/inventory` | Yes | Admin | Adjust stock manually |

---

## Detailed Examples

### Authentication

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "phone": "+919876543210"
}

Response 201:
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": { "_id": "...", "name": "John Doe", "email": "john@example.com" },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  },
  "requestId": "req_abc123"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response 200:
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

#### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer {accessToken}
```

---

### Products

#### List Products
```http
GET /products?page=1&limit=20&category=electronics&sort=price_asc
Authorization: Bearer {accessToken} (optional)

Response 200:
{
  "success": true,
  "data": [
    {
      "_id": "prod_123",
      "name": "Product Name",
      "slug": "product-name",
      "price": 1299.99,
      "retailPrice": 1299.99,
      "wholesalePrice": 999.99,
      "images": [...],
      "averageRating": 4.5,
      "reviewCount": 23
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "requestId": "req_xyz"
  }
}
```

#### Get Product by Slug
```http
GET /products/{slug}
Authorization: Bearer {accessToken} (optional)

Response 200:
{
  "success": true,
  "data": {
    "_id": "prod_123",
    "name": "Product Name",
    "description": "...",
    "variants": [...],
    "specifications": {...}
  }
}
```

---

### Orders

#### Place Order
```http
POST /orders
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "shippingAddressId": "addr_123",
  "billingAddressId": "addr_123",
  "paymentMethod": "stripe"
}

Response 201:
{
  "success": true,
  "data": {
    "orderId": "order_123",
    "orderNumber": "ORD-2024-001234",
    "status": "created",
    "grandTotal": 1599.99,
    "items": [...]
  }
}
```

#### Get Order Details
```http
GET /orders/{orderId}
Authorization: Bearer {accessToken}

Response 200:
{
  "success": true,
  "data": {
    "_id": "order_123",
    "orderNumber": "ORD-2024-001234",
    "orderStatus": "confirmed",
    "paymentStatus": "paid",
    "items": [...],
    "shippingAddress": {...},
    "grandTotal": 1599.99,
    "createdAt": "2024-01-04T12:30:00Z"
  }
}
```

#### List User Orders
```http
GET /orders?page=1&limit=10&status=confirmed
Authorization: Bearer {accessToken}
```

#### Cancel Order
```http
POST /orders/{orderId}/cancel
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "reason": "Changed mind"
}
```

---

### Payments

#### Initiate Payment
```http
POST /payments/initiate
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "orderId": "order_123",
  "gateway": "stripe"
}

Response 200:
{
  "success": true,
  "data": {
    "paymentId": "pay_123",
    "clientSecret": "pi_xxx_secret_yyy",
    "amount": 1599.99,
    "currency": "INR"
  }
}
```

#### Get Payment Status
```http
GET /payments/{paymentId}/status
Authorization: Bearer {accessToken}

Response 200:
{
  "success": true,
  "data": {
    "paymentId": "pay_123",
    "status": "success",
    "amount": 1599.99,
    "transactionId": "ch_xxxxx"
  }
}
```

---

### Cart

#### Get Cart
```http
GET /cart
Authorization: Bearer {accessToken}

Response 200:
{
  "success": true,
  "data": {
    "_id": "cart_123",
    "items": [
      {
        "productId": "prod_123",
        "variantId": "var_456",
        "quantity": 2,
        "price": 1299.99,
        "total": 2599.98
      }
    ],
    "subtotal": 2599.98,
    "couponDiscount": 200,
    "grandTotal": 2399.98
  }
}
```

#### Add to Cart
```http
POST /cart/items
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "productVariantId": "var_456",
  "quantity": 1
}
```

#### Update Cart Item
```http
PATCH /cart/items/{itemId}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "quantity": 3
}
```

#### Remove from Cart
```http
DELETE /cart/items/{itemId}
Authorization: Bearer {accessToken}
```

#### Apply Coupon
```http
POST /cart/coupon
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "code": "SAVE20"
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `DUPLICATE_KEY` | 409 | Resource already exists |
| `PAYMENT_FAILED` | 402 | Payment processing failed |
| `INSUFFICIENT_STOCK` | 409 | Product out of stock |
| `INVALID_ORDER_STATE` | 400 | Order cannot be modified in current state |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### Error Response Format
```json
{
  "success": false,
  "message": "Access denied - order belongs to another user",
  "code": "FORBIDDEN",
  "requestId": "req_abc123"
}
```

---

## Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| Authentication | 5 requests/min per IP |
| General API | 1000 requests/15min per IP |
| Webhooks | 100 requests/min per IP |
| Payments | 10 requests/min per user |

Rate limit headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Time when limit resets

---

## Pagination

List endpoints support pagination:
```
GET /products?page=2&limit=20
```

Response includes meta:
```json
{
  "meta": {
    "total": 150,
    "page": 2,
    "limit": 20,
    "totalPages": 8
  }
}
```

---

## Swagger/OpenAPI

Interactive API documentation available at:
- Development: `http://localhost:8081/api-docs`
- Production: `https://api.yourdomain.com/api-docs`

To enable Swagger (already configured if `NODE_ENV !== 'production'`):
1. Access `/api-docs` endpoint
2. Try out endpoints directly in browser
3. View request/response schemas
4. Test authentication

---

## Webhooks

### Payment Webhooks

**Stripe Webhook:**
```
POST /api/v1/payments/webhook/stripe
Content-Type: application/json
Stripe-Signature: t=xxx,v1=yyy
```

**Razorpay Webhook:**
```
POST /api/v1/payments/webhook/razorpay
Content-Type: application/json
X-Razorpay-Signature: xxx
```

Webhook events trigger:
- Order confirmation
- Invoice generation  
- Email notifications
- Inventory updates

---

## Testing

### Using cURL
```bash
# Register
curl -X POST https://api.yourdomain.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'

# Login and get token
TOKEN=$(curl -X POST https://api.yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}' \
  | jq -r '.data.accessToken')

# Use token
curl https://api.yourdomain.com/api/v1/orders \
  -H "Authorization: Bearer $TOKEN"
```

### Using Postman
1. Import collection: `docs/postman/ecommerce-api.json`
2. Set environment variable `baseUrl`
3. Run authentication request
4. Token auto-saved to environment
5. Execute other requests

---

## Admin Endpoints

Require `role: admin` in JWT:

- `GET /admin/orders` - List all orders
- `PATCH /admin/orders/{id}` - Update order status
- `GET /admin/analytics/revenue` - Revenue summary
- `GET /admin/analytics/top-products` - Best sellers
- `POST /admin/products/bulk-update/preview` - Preview bulk product update
- `POST /admin/products/bulk-update/confirm` - Confirm bulk product update
- `GET /admin/products/bulk-update/template` - Download import template
- `GET /admin/products/bulk-update/export` - Export all products

All admin endpoints require `Authorization: Bearer {adminToken}`
