# Database Schema

## Overview
- **Database**: MongoDB
- **ODM**: Mongoose
- **Strategy**: Hybrid (References for large relations, Embedding for performance-critical reads like Order Items).

---

## 1. User
**Purpose**: Stores customer and admin identities.
| Field | Type | Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `email` | String | Unique, Sparse | Primary identity (or phone) |
| `phone` | String | Unique, Sparse | Primary identity (or email) |
| `passwordHash` | String | Select: false | Argon2/Bcrypt hash |
| `role` | String | Enum | `customer`, `admin` |
| `customerType`| String | Enum | `retail` (default), `wholesale` |
| `sessions` | Array | - | Active refresh tokens for security |

✔️ **Implemented**

---

## 2. Product
**Purpose**: Catalog item definitions.
| Field | Type | Index | Description |
| :--- | :--- | :--- | :--- |
| `categoryId` | Ref(Category)| Yes | Hierarchy parent |
| `slug` | String | Unique | URL-friendly ID |
| `retailPrice` | Object | - | `{ mrp, salePrice }` |
| `wholesalePrice`| Object | - | Tiered pricing structure |
| `status` | Enum | Yes | `draft`, `active`, `inactive` |

✔️ **Implemented**

---

## 3. ProductVariant
**Purpose**: The actual sellable SKU (Inventory unit).
| Field | Type | Index | Description |
| :--- | :--- | :--- | :--- |
| `productId` | Ref(Product) | Yes | Parent generic product |
| `sku` | String | Unique | Stock Keeping Unit |
| `attributes` | Object | - | `{ color: "red", size: "XL" }` |
| `stockQty` | Number | - | Physical stock on hand |
| `reservedQty` | Number | - | Locked in active carts/pending orders |

✔️ **Implemented**

---

## 4. Cart
**Purpose**: Temporary holding for shopping session.
| Field | Type | Index | Description |
| :--- | :--- | :--- | :--- |
| `userId` | Ref(User) | Unique | Null for guest carts |
| `sessionId` | String | Unique| Cookie-based session ID |
| `items` | Embedded | - | Array of `{ variantId, qty, price }` |
| `couponId` | Ref(Coupon) | - | Applied discount |

✔️ **Implemented**

---

## 5. Order
**Purpose**: The central immutable record of a transaction.
| Field | Type | Index | Description |
| :--- | :--- | :--- | :--- |
| `orderNumber` | String | Unique | Human-readable (ORD-2024-...) |
| `userId` | Ref(User) | Yes | Buyer |
| `paymentStatus` | Enum | Yes | `pending`, `paid`, `failed` |
| `orderStatus` | Enum | Yes | `created`, `confirmed`, `shipped`... |
| `totalItems` | Number | - | Snapshot at checkout |
| `grandTotal` | Number | - | Final amount to charge |
| `isLocked` | Boolean | - | Prevents edits after confirmation |

✔️ **Implemented**

---

## 6. OrderItem
**Purpose**: Individual line items, separated for analytics/returns.
| Field | Type | Description |
| :--- | :--- | :--- |
| `orderId` | Ref(Order) | Parent order |
| `productVariantId`| Ref(Variant)| Link to sold item |
| `price` | Number | Unit price **at moment of purchase** |
| `status` | Enum | `pending`, `shipped`, `returned` |

✔️ **Implemented**

---

## 7. Payment
**Purpose**: Audit trail of payment attempts.
| Field | Type | Description |
| :--- | :--- | :--- |
| `orderId` | Ref(Order) | Target order |
| `gateway` | Enum | `stripe`, `razorpay` |
| `transactionId` | String | Gateway's remote ID |
| `gatewayResponse` | Mixed | Full dump of gateway JSON (for debugging) |
| `status` | Enum | `created`, `authorized`, `captured`, `failed` |

✔️ **Implemented**

---

## 8. Shipment
**Purpose**: Tracking logistics for fulfilled items.
| Field | Type | Description |
| :--- | :--- | :--- |
| `orderId` | Ref(Order) | - |
| `carrier` | String | FedEx, Delhivery, etc. |
| `trackingNumber`| String | - |
| `shippedAt` | Date | - |

⚠️ **Partial** (Basic schema exists, deep integration pending)

---

## 9. Coupon
**Purpose**: Discount logic.
| Field | Type | Description |
| :--- | :--- | :--- |
| `code` | String | Unique promo code |
| `discountType` | Enum | `flat`, `percent` |
| `minOrderValue` | Number | Restriction |
| `usageLimit` | Number | Global max uses |
| `usedCount` | Number | Current uses |

✔️ **Implemented**
