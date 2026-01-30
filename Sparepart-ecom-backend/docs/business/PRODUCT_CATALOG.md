# Product Catalog System

## Overview

The Product Catalog is the core inventory management system handling products, variants, attributes, images, and categorization. It supports multi-variant products, dynamic attributes, and flexible pricing (retail/wholesale).

---

## Key Features

- 🏷️ **Multi-Variant Products** - Size, color, material combinations
- 🎨 **Dynamic Attributes** - Flexible attribute system per category
- 💰 **Dual Pricing** - Retail and wholesale prices
- 📸 **Multi-Image Support** - Product and variant-level images
- 📁 **Hierarchical Categories** - Nested category structure
- 🔍 **SEO Optimization** - Slugs, meta tags, structured data
- ✅ **Admin Approval** - Product moderation workflow

---

## System Architecture

```
┌──────────────┐
│   Product    │ (Base product information)
└──────┬───────┘
       │
       ├──────→ ┌────────────────┐
       │        │ Product Variant│ (SKU, price, stock per variant)
       │        └────────────────┘
       │
       ├──────→ ┌────────────────┐
       │        │ Product Images │ (Gallery, thumbnails)
       │        └────────────────┘
       │
       ├──────→ ┌────────────────┐
       │        │ Product Attrs  │ (e.g., Brand, Material)
       │        └────────────────┘
       │
       └──────→ ┌────────────────┐
                │   Categories   │ (Hierarchical classification)
                └────────────────┘
```

---

## Data Models

### Product Schema

```javascript
{
  _id: ObjectId,
  name: String,                    // Product title
  slug: String (unique, indexed),  // URL-friendly identifier
  description: String,             // Full description
  shortDescription: String,        // Brief summary
  
  // Categorization
  categoryId: ObjectId (ref: Category),
  
  // Pricing (base prices, overridden by variants)
  retailPrice: Number,
  wholesalePrice: Number,
  costPrice: Number,               // For margin calculation
  
  // Inventory (summed from variants)
  stockQty: Number (virtual),      // Total stock across variants
  
  // Images
  images: [String],                // Array of image URLs
  thumbnail: String,               // Primary thumbnail
  
  // SEO
  metaTitle: String,
  metaDescription: String,
  metaKeywords: [String],
  
  // Status
  isActive: Boolean,               // Published/Draft
  isFeatured: Boolean,             // Homepage featured
  
  // Attributes (flexible key-value pairs)
  attributes: [
    {
      attributeId: ObjectId (ref: ProductAttribute),
      value: String or [String]
    }
  ],
  
  // Ratings & Reviews
  averageRating: Number,           // Calculated from reviews
  reviewCount: Number,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

### Product Variant Schema

```javascript
{
  _id: ObjectId,
  productId: ObjectId (ref: Product),
  
  // SKU
  sku: String (unique, indexed),   // e.g., "SHOE-BLK-42"
  
  // Variant Attributes (e.g., Size: 42, Color: Black)
  attributeValues: [
    {
      attributeId: ObjectId (ref: ProductAttribute),
      valueId: ObjectId (ref: ProductAttributeValue)
    }
  ],
  
  // Pricing (can override product base price)
  retailPrice: Number,
  wholesalePrice: Number,
  
  // Inventory
  stockQty: Number,
  reservedQty: Number,             // Held in pending orders
  
  // Images (variant-specific, optional)
  images: [String],
  
  // Status
  isActive: Boolean,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

### Product Attribute Schema

```javascript
{
  _id: ObjectId,
  name: String,                    // e.g., "Size", "Color", "Brand"
  slug: String (unique),
  type: String,                    // 'select', 'multiselect', 'text', 'number'
  
  // Category-specific (optional - null = global)
  categoryId: ObjectId (ref: Category),
  
  // Display
  displayOrder: Number,
  isRequired: Boolean,
  isFilterable: Boolean,           // Show in search filters
  isVariant: Boolean,              // Used to create variants
  
  createdAt: Date,
  updatedAt: Date
}
```

### Product Attribute Value Schema

```javascript
{
  _id: ObjectId,
  attributeId: ObjectId (ref: ProductAttribute),
  value: String,                   // e.g., "Red", "XL", "Nike"
  slug: String,
  displayOrder: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Category Schema

```javascript
{
  _id: ObjectId,
  name: String,
  slug: String (unique, indexed),
  description: String,
  
  // Hierarchy
  parentId: ObjectId (ref: Category), // null for root categories
  level: Number,                      // 0 = root, 1 = subcategory, etc.
  
  // Images
  image: String,
  icon: String,
  
  // SEO
  metaTitle: String,
  metaDescription: String,
  
  // Display
  displayOrder: Number,
  isActive: Boolean,
  
  createdAt: Date,
  updatedAt: Date
}
```

---

## API Endpoints

### Products

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/products` | No | - | List/search products (public) |
| GET | `/products/:slug` | No | - | Get product details |
| POST | `/products` | Yes | Admin | Create product |
| PUT | `/products/:id` | Yes | Admin | Update product |
| DELETE | `/products/:id` | Yes | Admin | Soft delete product |
| GET | `/products/:id/variants` | No | - | List product variants |

### Variants

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/products/:productId/variants` | Yes | Admin | Create variant |
| PUT | `/variants/:id` | Yes | Admin | Update variant |
| DELETE | `/variants/:id` | Yes | Admin | Delete variant |

### Categories

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/categories` | No | - | List categories (tree structure) |
| GET | `/categories/:slug` | No | - | Get category details |
| POST | `/categories` | Yes | Admin | Create category |
| PUT | `/categories/:id` | Yes | Admin | Update category |
| DELETE | `/categories/:id` | Yes | Admin | Delete category |

### Attributes

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/attributes` | No | - | List attributes (public) |
| POST | `/attributes` | Yes | Admin | Create attribute |
| POST | `/attributes/:id/values` | Yes | Admin | Add attribute value |

---

## Business Logic

### Product Creation Workflow

**For Admin:**
1. Create product with base details
2. Product immediately `isActive = true`
3. Create variants (optional)
4. Add images
5. Product visible in catalog

### Variant Generation

**Automatic Variant Creation:**
```
Product: T-Shirt
Variant Attributes: Size (S, M, L), Color (Red, Blue, Black)

Auto-generate 9 variants:
- S-Red, S-Blue, S-Black
- M-Red, M-Blue, M-Black
- L-Red, L-Blue, L-Black

Each variant gets unique SKU: TSHIRT-S-RED, TSHIRT-M-BLUE, etc.
```

**Manual Variant Creation:**
- Vendor creates specific combinations only
- Useful when not all combinations available

### Pricing Logic

**Retail vs Wholesale:**
- **Retail Price**: Default price for all customers
- **Wholesale Price**: Applied when:
  - User role = `wholesale_customer`
  - Order quantity ≥ wholesale threshold (e.g., 10 units)

**Price Hierarchy:**
```
1. Variant-specific price (if set)
2. Product base price
3. Category default price
```

### Stock Calculation

**Product Total Stock (Virtual):**
```javascript
productStock = sum(variant.stockQty for all variants)
```

**Available Stock per Variant:**
```javascript
availableStock = variant.stockQty - variant.reservedQty
```

**Stock Status:**
- `In Stock`: availableStock > 0
- `Low Stock`: availableStock ≤ lowStockThreshold (default: 5)
- `Out of Stock`: availableStock = 0

---

## Search & Filtering

### Search Indexing

**Indexed Fields:**
- Product name (text index)
- Description (text index)
- Category name
- Attributes (brand, material, etc.)
- SKU

**Search Query:**
```javascript
GET /products?search=blue+shoes&category=footwear&brand=Nike&minPrice=1000&maxPrice=5000&sort=price_asc
```

### Filter Options

**Category Filter:**
- Hierarchical filtering (includes subcategories)
- Multiple category selection

**Attribute Filters:**
- Dynamic based on category
- Multi-select (e.g., multiple brands)

**Price Range:**
- Min/Max price slider
- Configurable price buckets

**Availability:**
- In stock only
- Include out of stock

### Sorting Options

- `price_asc` - Price: Low to High
- `price_desc` - Price: High to Low
- `name_asc` - Name: A-Z
- `name_desc` - Name: Z-A
- `rating_desc` - Highest Rated
- `newest` - Recently Added
- `featured` - Featured Products First

---

## Integration Points

### Inventory Module
- Variant stock quantities
- Reserved quantity management
- Low stock alerts

### Cart Module
- Product/variant selection
- Price calculation (retail vs wholesale)
- Stock availability check

### Orders Module
- Order item creation
- Variant identification
- Price locking at checkout

### Reviews Module
- Average rating calculation
- Review count updates
- Product quality signals

### Media Module
- Image upload and optimization
- CDN integration
- Image variant generation (thumbnails)

### SEO Module
- Slug generation
- Meta tag management
- Structured data (schema.org)

---

## Image Management

### Image Types

**Product Images:**
- Gallery images (multiple)
- Primary image (first in gallery)
- Thumbnail (auto-generated or manual)

**Variant Images:**
- Override product images (optional)
- Color-specific images

### Image Processing

**Upload Flow:**
1. Upload to CDN (Uploadcare, Cloudinary, S3)
2. Generate thumbnails (150x150, 300x300, 600x600)
3. Optimize for web (compression, WebP conversion)
4. Store CDN URLs in database

**Image URLs:**
```
Original: https://cdn.example.com/products/image_123_original.jpg
Thumbnail: https://cdn.example.com/products/image_123_thumb.jpg
Medium: https://cdn.example.com/products/image_123_medium.jpg
```

---

## Security Considerations

### Access Control
- **Public**: View active products
- **Admins**: Full access, product management

### Validation
- Slug uniqueness enforcement
- SKU uniqueness per variant
- Price validation (must be > 0)
- Stock quantity validation (must be ≥ 0)
- Image URL validation (must be HTTPS)

### Product Moderation
- Inappropriate content detection
- Duplicate product prevention

---

## Performance Optimization

### Database Indexes
```javascript
// Products
{ slug: 1 }                    // Unique
{ categoryId: 1, isActive: 1 } // Category filtering
{ name: 'text', description: 'text' } // Full-text search

// Variants
{ productId: 1 }               // Product variants
{ sku: 1 }                     // Unique SKU lookup
{ 'attributeValues.valueId': 1 } // Attribute filtering

// Categories
{ slug: 1 }                    // Unique
{ parentId: 1 }                // Hierarchy queries
```

### Caching Strategy

**Cache Keys:**
```
product:{slug}         // Individual product (1 hour TTL)
products:list:{hash}   // Product listings (15 min TTL)
category:{slug}        // Category details (1 hour TTL)
attributes:list        // All attributes (1 day TTL)
```

**Cache Invalidation:**
- On product update: invalidate `product:{slug}`
- On variant update: invalidate parent `product:{slug}`
- On category update: invalidate `category:{slug}` and `products:list:*`

---

## Common Use Cases

### Scenario 1: Simple Product (No Variants)
```
Product: "Laptop Bag"
- Single SKU
- One price
- No size/color options
- Stock: 50 units
```

### Scenario 2: Multi-Variant Product
```
Product: "Running Shoes"
Variants:
- Size 8, Color Black  (SKU: SHOE-8-BLK,  Stock: 10)
- Size 8, Color White  (SKU: SHOE-8-WHT,  Stock: 5)
- Size 9, Color Black  (SKU: SHOE-9-BLK,  Stock: 15)
- Size 9, Color White  (SKU: SHOE-9-WHT,  Stock: 0) // Out of stock
```

### Scenario 3: Wholesale Pricing
```
Product: "Office Chair"
Retail Price: ₹5,000
Wholesale Price: ₹3,500

Customer A (retail): Pays ₹5,000
Customer B (vendor): Pays ₹3,500
Customer C (retail, buys 50): Pays ₹3,500 (wholesale threshold)
```

---

## Testing

### Unit Tests
- Product CRUD operations
- Variant generation logic
- Price calculation (retail/wholesale)
- Stock availability checks
- Slug generation

### Integration Tests
- Product creation workflow (admin vs vendor)
- Multi-variant product setup
- Search and filtering
- Image upload and processing

---

## Known Issues & Limitations

1. **Variant Limit**: Maximum 100 variants per product
2. **Attribute Limit**: Maximum 20 attributes per product
3. **Image Limit**: Maximum 10 images per product
4. **Bulk Operations**: Bulk import not fully optimized for 1000+ products
5. **Real-time Stock**: Stock updates not real-time (15s cache delay)

---

## Related Documentation

- [Inventory & Cart Logic](./INVENTORY_AND_CART_LOGIC.md)
- [Media Management](./MEDIA_MANAGEMENT.md)
- [SEO & Metadata](./SEO_AND_METADATA.md)
- [API Reference](./API_REFERENCE.md)
