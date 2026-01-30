# Notifications System

## Overview

Multi-channel notification system supporting email, in-app, and push notifications for order updates, marketing campaigns, and system alerts.

---

## Notification Channels

### 1. **Email** (Transactional)
- Order confirmations
- Shipping updates
- Password resets
- Invoice delivery

### 2. **In-App Notifications**
- Order status changes
- Messages from vendors
- Product restocks
- Price drops

### 3. **Push Notifications** (Future)
- Mobile app alerts
- Flash sales
- Abandoned cart reminders

---

## Data Model

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  type: String,  // 'order', 'payment', 'product', 'system'  
  channel: String,  // 'email', 'in_app', 'push'
  priority: String,  // 'low', 'medium', 'high', 'urgent'
  
  // Content
  title: String,
  message: String,
  actionUrl: String,  // Deep link or page URL
  actionLabel: String,  // "View Order", "Shop Now"
  
  // Status
  isRead: Boolean,
  readAt: Date,
  isSent: Boolean,
  sentAt: Date,
  
  // Metadata
  metadata: {
    orderId: ObjectId,
    productId: ObjectId,
    // ... context-specific data
  },
  
  createdAt: Date,
  expiresAt: Date  // Auto-delete old notifications
}
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | List user notifications |
| GET | `/notifications/unread-count` | Get unread count |
| PATCH | `/notifications/:id/read` | Mark as read |
| PATCH | `/notifications/mark-all-read` | Mark all as read |
| DELETE | `/notifications/:id` | Delete notification |

---

## Notification Templates

### Order Confirmed
```
Title: Order Confirmed #ORD-2024-001
Message: Your order for ₹2,500 has been confirmed
Channel: Email + In-App
Priority: High
Action: View Order Details
```

### Order Shipped
```
Title: Your order is on the way!
Message: Track your package with ID: TRK123456
Channel: Email + In-App + Push
Priority: Medium
Action: Track Shipment
```

### Price Drop Alert
```
Title: Price Drop on Wishlist Item
Message: Laptop Bag now ₹1,200 (was ₹1,500)
Channel: In-App + Push
Priority: Low
Action: Buy Now
```

---

## Integration Points

- **Orders:** Status change notifications
- **Payments:** Payment success/failure alerts
- **Shipments:** Tracking updates
- **Products:** Restock alerts, price drops
- **Email Queue:** Async email delivery
- **Websockets:** Real-time in-app notifications

---

## User Preferences

Users can configure notification settings:

```javascript
{
  emailNotifications: {
    orderUpdates: true,
    marketing: false,
    newsletter: true
  },
  pushNotifications: {
    orderUpdates: true,
    promotions: false
  },
  inAppNotifications: {
   all: true
  }
}
```

---

## Related Documentation

- [Email Workflow](./EMAIL_WORKFLOW.md)
- [Background Jobs](./BACKGROUND_JOBS.md)
