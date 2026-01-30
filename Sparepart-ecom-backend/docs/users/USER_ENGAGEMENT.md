# User Engagement Features

## Overview

Customer engagement features including wishlists, favorites, product comparisons, and recently viewed items.

---

## Wishlist System

### Data Model
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  items: [
    {
      productId: ObjectId (ref: Product),
      variantId: ObjectId (ref: ProductVariant),
      addedAt: Date
    }
  ],
  isPublic: Boolean,
  shareToken: String,  // For sharing wishlist
  createdAt: Date,
  updatedAt: Date
}
```

### Features
- Add/remove products
- Move wishlist item to cart
- Share wishlist via link
- Email when price drops
- Email when back in stock

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/wishlist` | Get user wishlist |
| POST | `/wishlist/items` | Add item to wishlist |
| DELETE | `/wishlist/items/:id` | Remove item |
| POST | `/wishlist/move-to-cart/:id` | Move to cart |
| GET | `/wishlist/share/:token` | View shared wishlist |

---

## Recently Viewed

### Data Model
```javascript
{
  userId: ObjectId (ref: User),
  products: [
    {
      productId: ObjectId,
      viewedAt: Date
    }
  ]
}
```

**Logic:**
- Track last 20 products viewed
- Oldest products auto-removed
- Used for recommendations

---

## Product Comparison

### Features
- Compare up to 4 products
- Side-by-side specifications
- Price comparison
- Rating comparison

### Data Model
```javascript
{
  userId: ObjectId,
  products: [ObjectId],  // Max 4
  category: ObjectId,     // Products must be same category
  expiresAt: Date         // Comparison list expires after 7 days
}
```

---

## Notifications

### Price Drop Alert
```
Product in wishlist price decreased:
Was: ₹2,500
Now: ₹2,000 (20% off)

[Buy Now]
```

### Back in Stock
```
Good news! "Laptop Bag" is back in stock.

[Add to Cart]
```

---

## Integration Points

- **Products**: Product data for wishlist/comparison
- **Cart**: Move wishlist items to cart
- **Notifications**: Price drop/stock alerts
- **Recommendations**: Based on wishlist/viewed items

---

## Related Documentation

- [Product Catalog](./PRODUCT_CATALOG.md)
- [Notifications System](./NOTIFICATIONS_SYSTEM.md)
- [User Management](./USER_MANAGEMENT.md)
