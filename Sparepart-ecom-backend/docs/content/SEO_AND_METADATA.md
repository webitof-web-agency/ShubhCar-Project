# SEO & Metadata Management

## Overview

SEO optimization system for products, categories, and pages with meta tags, structured data, and sitemap generation.

---

## Features

- 🏷️ **Meta Tags**: Title, description, keywords per page
- 📊 **Structured Data**: Schema.org rich snippets
- 🗺️ **Sitemap**: Auto-generated XML sitemaps
- 🔗 **Canonical URLs**: Duplicate content prevention
- 🤖 **Robots.txt**: Crawl directives
- 📈 **Open Graph**: Social media previews

---

## SEO Data Model

```javascript
{
  entityType: String,  // 'product', 'category', 'page'
  entityId: ObjectId,
  
  // Meta Tags
  metaTitle: String (max 60 chars),
  metaDescription: String (max 160 chars),
  metaKeywords: [String],
  
  // Open Graph
  ogTitle: String,
  ogDescription: String,
  ogImage: String,
  ogType: String,  // 'product', 'website'
  
  // Twitter Card
  twitterCard: String,  // 'summary', 'summary_large_image'
  twitterTitle: String,
  twitterDescription: String,
  twitterImage: String,
  
  // Structured Data
  schemaType: String,  // 'Product', 'Organization', 'Article'
  schemaData: Object,   // JSON-LD
  
  // URLs
  canonicalUrl: String,
  
  createdAt: Date,
  updatedAt: Date
}
```

---

## Structured Data Examples

### Product Schema
```json
{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": "Laptop Bag",
  "image": "https://example.com/laptop-bag.jpg",
  "description": "Premium leather laptop bag",
  "sku": "BAG-001",
  "brand": {
    "@type": "Brand",
    "name": "SpareParts"
  },
  "offers": {
    "@type": "Offer",
    "url": "https://example.com/products/laptop-bag",
    "priceCurrency": "INR",
    "price": "2500",
    "availability": "https://schema.org/InStock"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "reviewCount": "25"
  }
}
```

### Breadcrumbs Schema
```json
{
  "@context": "https://schema.org/",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://example.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Electronics",
      "item": "https://example.com/categories/electronics"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Laptop Bag"
    }
  ]
}
```

---

## Sitemap Generation

### Products Sitemap (`sitemap-products.xml`)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/products/laptop-bag</loc>
    <lastmod>2024-01-08</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

### Sitemap Index (`sitemap.xml`)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap-products.xml</loc>
    <lastmod>2024-01-08</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-categories.xml</loc>
    <lastmod>2024-01-08</lastmod>
  </sitemap>
</sitemapindex>
```

---

## Slug Generation

```javascript
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with -
    .replace(/^-+|-+$/g, '');      // Trim dashes
}

// "Laptop Bag Premium" → "laptop-bag-premium"
```

**Uniqueness:**
- Append `-2`, `-3` if slug exists
- Store slug in indexed field for fast lookup

---

## Canonical URLs

Prevent duplicate content:

```html
<!-- Product page -->
<link rel="canonical" href="https://example.com/products/laptop-bag" />

<!-- Avoid duplicate with query params -->
https://example.com/products/laptop-bag?utm_source=email
→ Canonical: https://example.com/products/laptop-bag
```

---

## Robots.txt

```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /cart
Disallow: /checkout
Disallow: /api/

Sitemap: https://example.com/sitemap.xml
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/seo/:entityType/:id` | Get SEO metadata |
| PUT | `/seo/:entityType/:id` | Update metadata (admin) |
| GET | `/sitemap.xml` | Sitemap index |
| GET | `/sitemap-products.xml` | Products sitemap |
| GET | `/robots.txt` | Robots directives |

---

## Best Practices

### Meta Titles
- Include primary keyword
- 50-60 characters
- Brand name at end
- Example: "Laptop Bag Premium Quality | SpareParts"

### Meta Descriptions
- Compelling call-to-action
- 150-160 characters
- Include keywords naturally
- Example: "Shop premium leather laptop bags with lifetime warranty. Free shipping on orders over ₹1000. Order now!"

### URL Structure
- Use hyphens, not underscores
- Keep short and descriptive
- Include keywords
- Example: `/products/leather-laptop-bag`

---

## Integration Points

- **Products**: Auto-generate meta from product data
- **Categories**: Category-based meta tags
- **CMS Pages**: Custom pages meta management

---

## Related Documentation

- [Product Catalog](./PRODUCT_CATALOG.md)
- [CMS & Pages](./CMS_AND_PAGES.md)
