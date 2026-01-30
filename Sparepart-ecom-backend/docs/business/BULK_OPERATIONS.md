# Bulk Operations System

## Overview

The Bulk Operations System enables administrators to perform mass create, update, and export operations on products using Excel/CSV files. It includes a preview/confirm workflow to ensure data accuracy before committing changes.

---

## Supported Operations

1. **Bulk Create**: Add multiple products at once
2. **Bulk Update**: Update existing products in batch
3. **Bulk Export**: Download all products as Excel/CSV
4. **Template Download**: Get pre-formatted template for imports

---

## Workflow: Bulk Update

### Step 1: Download Template or Export Existing Data

**Option A: Download Empty Template**
```
GET /v1/products/admin/bulk-update/template
Response: Excel file with columns:
- sku (required)
- name
- description
- categoryId
- brandId
- retailPrice
- wholesalePrice
- stockQty
- status
- ... (all product fields)
```

**Option B: Export Existing Products**
```
GET /v1/products/admin/bulk-update/export
Response: Excel file with all current products
```

### Step 2: Edit Excel File

Admin fills/modifies the Excel file:
```
| sku        | name              | retailPrice | stockQty | status |
|------------|-------------------|-------------|----------|--------|
| BRK-001    | Brake Pad Set     | 1299        | 50       | active |
| AIR-002    | Air Filter        | 450         | 100      | active |
| OIL-003    | Engine Oil 5W-30  | 899         | 75       | active |
```

### Step 3: Upload for Preview

```
POST /v1/products/admin/bulk-update/preview
Content-Type: multipart/form-data
Body: file=products.xlsx

Response: {
  success: true,
  data: {
    jobId: "bulk_update_123456",
    summary: {
      totalRows: 100,
      validRows: 95,
      invalidRows: 5,
      toCreate: 20,
      toUpdate: 75
    },
    errors: [
      {
        row: 5,
        field: "retailPrice",
        message: "Price must be greater than 0"
      },
      {
        row: 12,
        field: "categoryId",
        message: "Category not found"
      }
    ],
    preview: [
      {
        row: 1,
        action: "update",
        sku: "BRK-001",
        changes: {
          retailPrice: { old: 1199, new: 1299 },
          stockQty: { old: 30, new: 50 }
        }
      },
      {
        row: 2,
        action: "create",
        sku: "NEW-001",
        data: { name: "New Product", ... }
      }
    ]
  }
}
```

### Step 4: Review Preview

Admin reviews:
- ✅ Valid rows
- ❌ Invalid rows with error messages
- 📝 Changes to be applied (old vs new values)
- ➕ New products to be created
- ✏️ Existing products to be updated

### Step 5: Confirm or Cancel

**Confirm:**
```
POST /v1/products/admin/bulk-update/confirm
Body: {
  jobId: "bulk_update_123456"
}

Response: {
  success: true,
  data: {
    jobId: "bulk_update_123456",
    status: "processing",
    message: "Bulk update started. Check job status for progress."
  }
}
```

**Cancel:**
- Simply don't call confirm
- Job expires after 1 hour

### Step 6: Check Job Status

```
GET /v1/products/admin/bulk-update/jobs/bulk_update_123456

Response: {
  success: true,
  data: {
    jobId: "bulk_update_123456",
    status: "completed",  // "processing", "completed", "failed"
    progress: {
      total: 95,
      processed: 95,
      succeeded: 92,
      failed: 3
    },
    results: {
      created: 20,
      updated: 72,
      errors: [
        {
          row: 45,
          sku: "ERR-001",
          error: "Duplicate SKU"
        }
      ]
    },
    startedAt: "2024-01-30T10:00:00Z",
    completedAt: "2024-01-30T10:05:30Z"
  }
}
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products/admin/bulk-update/template` | Download empty template |
| GET | `/products/admin/bulk-update/export` | Export all products |
| POST | `/products/admin/bulk-update/preview` | Upload file for preview |
| POST | `/products/admin/bulk-update/confirm` | Confirm and execute bulk update |
| GET | `/products/admin/bulk-update/jobs/:jobId` | Check job status |

---

## Excel File Format

### Required Columns

- **sku**: Unique product identifier (required for updates)
- **name**: Product name
- **categoryId**: Category ObjectId or slug
- **retailPrice**: Selling price

### Optional Columns

- **description**: Product description
- **shortDescription**: Brief summary
- **brandId**: Brand ObjectId or slug
- **wholesalePrice**: B2B price
- **costPrice**: Purchase cost
- **stockQty**: Available quantity
- **lowStockThreshold**: Alert threshold
- **status**: "active", "inactive", "draft"
- **isFeatured**: true/false
- **metaTitle**: SEO title
- **metaDescription**: SEO description
- **tags**: Comma-separated tags
- **images**: Comma-separated image URLs

### Example Row

```
sku: BRK-PAD-001
name: Brake Pad Set - Front
description: High-quality ceramic brake pads
categoryId: brake-pads
brandId: bosch
retailPrice: 1299
wholesalePrice: 999
stockQty: 50
status: active
isFeatured: true
tags: brakes,safety,ceramic
images: https://cdn.example.com/img1.jpg,https://cdn.example.com/img2.jpg
```

---

## Validation Rules

### Pre-Upload Validation

- File must be `.xlsx` or `.csv`
- File size ≤ 10MB
- Maximum 1000 rows per upload

### Row-Level Validation

**SKU:**
- Required for updates
- Must be unique
- Max 50 characters

**Name:**
- Required
- Min 3 characters, max 200 characters

**Prices:**
- Must be positive numbers
- `retailPrice` ≥ `wholesalePrice` ≥ `costPrice`

**Category:**
- Must exist in database
- Can be ObjectId or slug

**Stock:**
- Must be non-negative integer

**Status:**
- Must be: "active", "inactive", or "draft"

**Images:**
- Must be valid HTTPS URLs
- Max 10 images per product

---

## Business Logic

### Create vs Update Decision

```javascript
if (row.sku exists in database) {
  action = "update"
  // Merge new data with existing product
} else if (row.sku provided) {
  action = "create"
  // Create new product with given SKU
} else {
  action = "create"
  // Auto-generate SKU
}
```

### Partial Updates

- Only provided columns are updated
- Empty cells = no change (not deletion)
- To clear a field, use special value: `__CLEAR__`

**Example:**
```
| sku     | name | description | stockQty |
|---------|------|-------------|----------|
| BRK-001 |      | __CLEAR__   | 100      |

Result:
- name: unchanged
- description: cleared (set to null)
- stockQty: updated to 100
```

### Duplicate Handling

- **Duplicate SKU in file**: Error, reject entire upload
- **Duplicate SKU in database**: Update existing product
- **Duplicate name**: Warning, but allowed

---

## Background Job Processing

### Job States

1. **Created**: Job created, preview generated
2. **Processing**: Bulk operation in progress
3. **Completed**: All rows processed
4. **Failed**: Job failed (system error)

### Job Lifecycle

```
┌─────────┐
│ Created │ (Preview generated, awaiting confirmation)
└────┬────┘
     │
     ├──[Confirm]──→  ┌────────────┐
     │                │ Processing │ (Batch updates running)
     │                └──────┬─────┘
     │                       │
     │                  [Success]
     │                       ↓
     │                 ┌───────────┐
     │                 │ Completed │
     │                 └───────────┘
     │
     └──[Timeout/Cancel]──→ ┌──────────┐
                            │ Expired  │
                            └──────────┘
```

### Batch Processing

- Processes 50 products at a time
- Uses MongoDB transactions for atomicity
- Rolls back batch on error
- Continues with next batch

---

## Error Handling

### File-Level Errors

- **Invalid file format**: Reject immediately
- **Missing required columns**: Reject immediately
- **File too large**: Reject immediately

### Row-Level Errors

- **Validation errors**: Shown in preview, row skipped
- **Database errors**: Logged, row skipped, job continues
- **Duplicate errors**: Shown in preview

### Recovery

- Failed rows are logged with error messages
- Admin can download error report
- Fix errors and re-upload

---

## Performance Optimization

### Batch Size

- **Preview**: Process all rows (max 1000)
- **Execution**: 50 rows per batch
- **Database**: Bulk write operations

### Caching

- Category/Brand lookups cached during job
- Reduces database queries by 80%

### Progress Tracking

- Real-time progress updates via job status
- Estimated time remaining
- Rows processed/remaining

---

## Security Considerations

- **Admin Only**: All bulk operations require admin role
- **Rate Limiting**: Max 5 uploads per hour per admin
- **File Validation**: Strict file type and size checks
- **SQL Injection**: All inputs sanitized
- **Audit Trail**: All bulk operations logged

---

## Use Cases

### Scenario 1: Initial Product Import

```
1. Download template
2. Fill 500 products in Excel
3. Upload for preview
4. Review: 495 valid, 5 errors
5. Fix errors in Excel
6. Re-upload for preview
7. Confirm: All 500 valid
8. Execute bulk create
9. Check status: 500 products created
```

### Scenario 2: Price Update Campaign

```
1. Export all products
2. Update retailPrice column (10% increase)
3. Upload for preview
4. Review: 1000 products to update
5. Confirm
6. Execute: All prices updated
```

### Scenario 3: Stock Sync from ERP

```
1. Export products from ERP system
2. Map columns to template format
3. Upload for preview
4. Review stock quantity changes
5. Confirm
6. Execute: Stock synced
```

---

## Limitations

- **Max rows per upload**: 1000
- **Max file size**: 10MB
- **Concurrent jobs**: 1 per admin
- **Job retention**: 24 hours
- **Preview expiry**: 1 hour

---

## Best Practices

1. **Always preview before confirming**
2. **Start with small batches** (test with 10-20 rows first)
3. **Use export as template** (ensures correct format)
4. **Keep backups** (export before bulk updates)
5. **Fix all errors** (don't skip validation errors)
6. **Monitor job status** (don't assume success)

---

## Related Documentation

- [Product Catalog](./PRODUCT_CATALOG.md)
- [Background Jobs](../infrastructure/BACKGROUND_JOBS.md)
- [Admin Guide](../operations/ADMIN_GUIDE.md)
