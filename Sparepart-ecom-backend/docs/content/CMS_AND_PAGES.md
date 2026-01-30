# CMS & Content Pages

## Overview

Content Management System for static pages like About Us, Terms & Conditions, Privacy Policy, and custom landing pages.

---

## Features

- 📄 **Static Pages**: Create custom pages
- ✏️ **Rich Text Editor**: WYSIWYG content editing
- 🔗 **SEO Optimization**: Meta tags per page
- 📱 **Responsive**: Mobile-friendly pages
- 🗂️ **Version Control**: Page revision history

---

## Data Model

```javascript
{
  _id: ObjectId,
  title: String,
  slug: String (unique, indexed),
  content: String,  // HTML content
  
  // SEO
  metaTitle: String,
  metaDescription: String,
  
  // Display
  isPublished: Boolean,
  publishedAt: Date,
  
  // Hierarchy
  parentPageId: ObjectId,  // null for root pages
  displayOrder: Number,
  
  // Management
  createdBy: ObjectId (ref: User),
  lastEditedBy: ObjectId (ref: User),
  
  createdAt: Date,
  updatedAt: Date
}
```

---

##Default Pages

1. **About Us** (`/about`)
2. **Contact Us** (`/contact`)
3. **Terms & Conditions** (`/terms`)
4. **Privacy Policy** (`/privacy`)
5. **Refund Policy** (`/refund-policy`)
6. **Shipping Policy** (`/shipping-policy`)
7. **FAQ** (`/faq`)

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/pages` | List all published pages |
| GET | `/pages/:slug` | Get page by slug |
| POST | `/admin/pages` | Create page (admin) |
| PUT | `/admin/pages/:id` | Update page (admin) |
| DELETE | `/admin/pages/:id` | Delete page (admin) |

---

## Content Editor

**Supported Formatting:**
- Headings (H1-H6)
- Bold, Italic, Underline
- Lists (ordered, unordered)
- Links
- Images
- Tables
- Code blocks
- Blockquotes

**Sanitization:**
- Strip unsafe HTML (script tags, iframes)
- XSS prevention
- Whitelist allowed tags

---

## Version History

Track page changes:

```javascript
{
  pageId: ObjectId,
  version: Number,
  content: String,
  editedBy: ObjectId,
  editedAt: Date,
  changesSummary: String
}
```

**Restore Previous Version:**
- Admin can revert to any past version
- Changes logged in audit trail

---

## Navigation Menu

Pages can be organized in menu:

```javascript
{
  label: "Customer Service",
  children: [
    { label: "FAQ", slug: "/faq" },
    { label: "Shipping Policy", slug: "/shipping-policy" },
    { label: "Refund Policy", slug: "/refund-policy" }
  ]
}
```

---

## Common Use Cases

### Landing Page
```
Title: "Welcome to SpareParts"
Slug: /welcome-offer
Content: HTML with images, CTA buttons
SEO: Optimized for "spare parts online India"
```

### Legal Page
```
Title: "Terms & Conditions"
Slug: /terms
Content: Legal text
SEO: No-index (not for search engines)
```

---

## Security

- Only admins can create/edit pages
- Content sanitized against XSS
- Version control for accountability

---

## Related Documentation

- [SEO & Metadata](./SEO_AND_METADATA.md)
- [Admin Guide](./ADMIN_GUIDE.md)
