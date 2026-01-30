# Media Management System

## Overview  

Media upload, storage, and delivery system with CDN integration for product images, category images, and user uploads.

---

## Features

- 📤 **Multi-Upload**: Batch image uploads
- 🖼️ **Auto-Resize**: Generate thumbnails automatically
- 🌐 **CDN Integration**: Uploadcare, Cloudinary, AWS S3
- ✅ **Validation**: File type, size, dimensions
- 🗜️ **Optimization**: Compress, convert to WebP
- 🗑️ **Cleanup**: Delete unused media

---

## Data Model

```javascript
{
  _id: ObjectId,
  url: String,  // CDN URL
  filename: String,
  mimeType: String,  // image/jpeg, image/png
  size: Number,  // bytes
  
  // Variants
  variants: {
    thumbnail: String,  // 150x150
    medium: String,     // 600x600
    large: String       // 1200x1200
  },
  
  // Usage
  entityType: String,  // 'product', 'category', 'review'
  entityId: ObjectId,
  
  // Metadata
  uploadedBy: ObjectId (ref: User),
  createdAt: Date
}
```

---

## Upload Flow

```
1. User uploads file
2. Validate file type (jpg, png, webp only)
3. Validate file size (max 5MB)
4. Upload to CDN
5. Generate thumbnails (150x150, 600x600)
6. Optimize (compress, WebP conversion)
7. Save URLs to database
8. Return media URLs
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/media/upload` | Upload single/multiple images |
| GET | `/media/:id` | Get media details |
| DELETE | `/media/:id` | Delete media |
| POST | `/media/cleanup` | Remove unused media (admin) |

---

## CDN Integration

### Uploadcare
```javascript
const uploadcare = require('@uploadcare/upload-client');

const result = await uploadcare.uploadFile(file);
// https://ucarecdn.com/abc123/image.jpg
// https://ucarecdn.com/abc123/-/resize/600x600/image.jpg
```

### Cloudinary
```javascript
const cloudinary = require('cloudinary').v2;

const result = await cloudinary.uploader.upload(file.path);
// https://res.cloudinary.com/demo/ image/upload/v1/sample.jpg
// https://res.cloudinary.com/demo/image/upload/w_600/sample.jpg
```

---

## Image Transformations

```
Original: /image.jpg
Thumbnail: /image.jpg?w=150&h=150&fit=crop
Medium: /image.jpg?w=600&h=600
WebP: /image.webp
```

---

## Storage Cleanup

**Unused Media Detection:**
- Media not linked to any product/category/review
- Older than 30 days
- Automatically marked for deletion

**Cleanup Job:**
- Runs weekly
- Deletes unused media from CDN
- Removes DB records

---

## Security

- File type whitelist (jpg, png, webp only)
- Max file size: 5MB per image
- Virus scanning (via CDN provider)
- Authenticated uploads only

---

## Performance

- **Lazy Loading**: Load images on scroll
- **Responsive Images**: Serve appropriate size
- **WebP Format**: 30% smaller than JPEG
- **CDN Caching**: Edge caching for fast delivery

---

## Related Documentation

- [Product Catalog](./PRODUCT_CATALOG.md)
