# Reviews & Ratings System

## Overview

Product reviews and ratings system enabling customers to share feedback, with moderation capabilities and spam prevention.

---

## Key Features

- ⭐ **Star Ratings** (1-5 stars)
- 📝 **Text Reviews** with optional title
- 📸 **Review Images** (customer photos)
- ✅ **Verified Purchase** badge
- 🛡️ **Spam Prevention** & moderation
- 👍 **Helpful Votes** (upvote/downvote)
- 💬 **Vendor Responses** to reviews

---

## Data Model

```javascript
{
  _id: ObjectId,
  productId: ObjectId (ref: Product),
  userId: ObjectId (ref: User),
  orderId: ObjectId (ref: Order),        // Verified purchase
  
  // Rating & Review
  rating: Number (1-5),
  title: String,                          // Optional
  comment: String,
  
  // Images
  images: [String],                       // Customer photos
  
  // Verification
  isVerifiedPurchase: Boolean,
  
  // Moderation
  status: String,                         // 'pending', 'approved', 'rejected', 'flagged'
  moderationNote: String,
  
  // Engagement
  helpfulCount: Number,
  unhelpfulCount: Number,
  votedBy: [ObjectId],                    // Users who voted
  
  // Vendor Response
  vendorResponse: {
    text: String,
    respondedAt: Date,
    respondedBy: ObjectId (ref: User)
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

---

## API Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/products/:id/reviews` | Yes | Customer | Submit review |
| GET | `/products/:id/reviews` | No | - | List product reviews |
| GET | `/reviews/:id` | No | - | Get review details |
| PUT | `/reviews/:id` | Yes | Owner | Edit own review |
| DELETE | `/reviews/:id` | Yes | Owner/Admin | Delete review |
| POST | `/reviews/:id/helpful` | Yes | Any | Mark review helpful |
| POST | `/reviews/:id/report` | Yes | Any | Report inappropriate review |
| POST | `/reviews/:id/respond` | Yes | Vendor/Admin | Vendor response |
| PATCH | `/reviews/:id/moderate` | Yes | Admin | Approve/reject review |

---

## Business Logic

### Review Submission

**Requirements:**
1. User must be logged in
2. Product must exist and be active
3. User must have purchased product (verified purchase)
4. One review per product per user

**Process:**
```
1. Validate user purchased product
2. Check for existing review
3. Validate rating (1-5) and comment length
4. Create review with status 'pending' (if moderation enabled)
5. Update product average rating
6. Notify vendor of new review
```

### Moderation Workflow

**Auto-Approve Criteria:**
- Verified purchase ✅
- No profanity detected ✅
- Length > 20 characters ✅
- User has history of good reviews ✅

**Manual Review Required:**
- Rating = 1 star (negative review)
- Contains flagged keywords
- User is new (< 3 purchases)
- Product has < 5 total reviews

### Rating Calculation

```javascript
// Product average rating
totalRating = sum(review.rating for all approved reviews)
reviewCount = count(approved reviews)
averageRating = totalRating / reviewCount

// Rounded to 1 decimal
averageRating = Math.round(averageRating * 10) / 10
```

### Helpful Votes

```javascript
// User upvotes/downvotes review
if (user already voted):
  toggle vote or remove vote
else:
  add vote (helpful/unhelpful)
  increment helpfulCount or unhelpfulCount
```

---

## Spam Prevention

### Rate Limiting
- Max 3 reviews per day per user
- Max 10 reviews per month per user
- Cooldown 24 hours between reviews for same product

### Content Validation
- Minimum 20 characters
- Maximum 2000 characters
- No URLs/emails in review text
- Profanity filter
- Duplicate content detection

### Fraud Detection
- Flag if user created account recently + immediate review
- Flag if multiple 5-star reviews from same IP
- Flag if review text matches other reviews (copy-paste)

---

## Integration Points

- **Products**: Update average rating & review count
- **Orders**: Verify purchase for verification badge
- **Users**: Review history, trustworthiness score
- **Notifications**: Email vendor on new review, email user on vendor response
- **Media**: Image upload for review photos

---

## Common Use Cases

### Verified Purchase Review
```
User orders "Laptop"
Order delivered successfully
User submits 5⭐ review with photo
Status: auto-approved (verified purchase)
Product rating updated instantly
```

### Vendor Response
```
Customer leaves 3⭐ review: "Good but pricey"
Vendor responds: "Thank you! Use code SAVE10 for 10% off next purchase"
Response appears below review
```

---

## Security

- Only purchasers can review products
- Users can't review own vendor's products
- Rate limiting prevents review bombing
- Moderation prevents fake reviews

---

## Testing

**Key Scenarios:**
- ✅ Verified purchase badge only for actual buyers
- ✅ Average rating calculates correctly
- ✅ Duplicate reviews prevented
- ✅ Profanity filter blocks inappropriate content
- ✅ Helpful votes count accurately

---

## Related Documentation

- [Product Catalog](./PRODUCT_CATALOG.md)
- [Order Lifecycle](./ORDER_LIFECYCLE.md)
