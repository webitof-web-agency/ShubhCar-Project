# Admin Training Guide

## Welcome to Your E-Commerce Admin Panel

This guide will help you manage your e-commerce platform efficiently.

---

## 1. Getting Started

### Login
1. Go to: `https://admin.yourdomain.com`
2. Enter your admin email and password
3. Click "Login"
4. You'll be redirected to the dashboard

### First-Time Setup
1. Change your password (Profile → Security → Change Password)
2. Enable 2FA for extra security (optional)
3. Add your profile photo and details

---

## 2. Dashboard Overview

### What You See
- **Total Revenue** (today, this week, this month)
- **Orders** (pending, confirmed, shipped)
- **Low Stock Alerts**
- **New Customer Registrations**
- **Top Selling Products**

### Quick Actions
- View pending orders
- Respond to customer queries
- Generate reports

---

## 3. Managing Products

### Adding a New Product

**Step 1: Navigate**
- Click "Products" in sidebar
- Click "+ Add Product" button

**Step 2: Basic Information**
```
Product Name: e.g., "Brake Pad Set - Front"
SKU: e.g., "BRK-PAD-001"
Category: Select from dropdown
Brand: Enter brand name
Status: Draft (until ready to publish)
```

**Step 3: Description**
- Short Description: Brief summary (100-200 characters)
- Long Description: Detailed product information
- Specifications: Add key specs (size, weight, material, etc.)

**Step 4: Pricing**
```
Retail Price: ₹1,299.00
Wholesale Price: ₹999.00 (optional, for B2B customers)
Tax Rate: 18% (GST)
```

**Step 5: Images**
- Upload at least 4 high-quality images
- First image becomes the primary image
- Recommended: 800x800px, JPG/PNG format

**Step 6: Inventory**
```
Stock Quantity: 50
Low Stock Threshold: 10 (triggers auto-alert)
```

**Step 7: Variants** (if applicable)
- Size: S, M, L, XL
- Color: Red, Blue, Black
- Each variant has own SKU and stock

**Step 8: Save**
- Click "Save as Draft" (to review later)
- OR "Publish" (makes product live immediately)

### Editing a Product
1. Go to Products → All Products
2. Find product (use search or filters)
3. Click on product name
4. Make changes
5. Click "Update"

### Deleting a Product
1. Find product
2. Click "..." menu → Delete
3. Confirm deletion
4. Product moved to trash (can restore within 30 days)

### Managing Categories
1. Go to Products → Categories
2. Click "+ Add Category"
3. Enter:
   - Category Name
   - Parent Category (if subcategory)
   - Description
   - Display Order
4. Save

---

## 4. Managing Orders

### Viewing Orders
- **All Orders**: Products → All Orders
- **Filter by**:
  - Status (pending, confirmed, shipped, delivered)
  - Date range
  - Payment status
  - Customer name

### Order Status Workflow
```
Created → Confirmed → Shipped → Delivered
         ↓
      Cancelled (before shipping)
```

### Processing an Order

**Step 1: Review Order**
1. Click on Order Number (e.g., ORD-2024-001234)
2. Review:
   - Customer details
   - Shipping address
   - Products ordered
   - Payment status

**Step 2: Confirm Order** (if payment received)
- Status should auto-change to "Confirmed" after payment
- If manual confirmation needed:
  1. Click "Update Status"
  2. Select "Confirmed"
  3. Add note (optional)
  4. Click "Save"

**Step 3: Prepare for Shipping**
1. Print invoice (click "Download Invoice")
2. Print packing slip
3. Pack items
4. Generate shipping label (if integrated)

**Step 4: Mark as Shipped**
1. Click "Update Status" → "Shipped"
2. Enter:
   - Courier Name (e.g., Delhivery, BlueDart)
   - Tracking Number
   - Expected Delivery Date
3. Customer automatically receives tracking email

**Step 5: Mark as Delivered**
- System auto-updates when tracking shows delivered
- Or manually: Update Status → "Delivered"

### Cancelling an Order
**Before Shipping:**
1. Open order
2. Click "Cancel Order"
3. Select reason
4. System will:
   - Release reserved inventory
   - Initiate refund (if paid)
   - Email customer

**After Shipping:**
- Use "Returns & Refunds" process instead

### Refunds
1. Go to Order
2. Click "Issue Refund"
3. Enter:
   - Refund Amount (full or partial)
   - Reason
4. Click "Process Refund"
5. Refund processed to original payment method (3-5 business days)

---

## 5. Managing Customers

### Viewing Customers
- Go to Customers → All Customers
- See: Name, Email, Phone, Total Orders, Total Spent

### Customer Details
Click on customer name to view:
- Order history
- Addresses
- Total revenue generated
- Account status

### Customer Actions
- **Block Customer**: Prevents future orders
- **View Orders**: See all customer orders
- **Send Email**: Send custom message

---

## 6. Managing Inventory

### Stock Management
**View Current Stock:**
- Products → Inventory
- See real-time stock for all products

**Low Stock Alerts:**
- Dashboard shows low-stock products
- Email sent daily for items below threshold

**Updating Stock:**
1. Go to product
2. Update "Stock Quantity"
3. Save
4. Stock history logged automatically

**Bulk Import:**
1. Download template (Products → Import/Export)
2. Fill Excel with stock updates
3. Upload file
4. Review and confirm

---

## 7. Coupons & Discounts

### Creating a Coupon
1. Go to Marketing → Coupons
2. Click "+ Create Coupon"
3. Enter:
   ```
   Coupon Code: SAVE20
   Discount Type: Percentage / Fixed Amount
   Discount Value: 20% or ₹200
   Minimum Order: ₹500 (optional)
   Max Uses: 100 (optional)
   Valid From: 2024-01-01
   Valid Until: 2024-01-31
   ```
4. Click "Create"

### Coupon Types
- **Percentage Off**: e.g., 20% off
- **Fixed Amount**: e.g., ₹200 off
- **Free Shipping**: No shipping charge
- **First Order**: Only for new customers

### Deactivating a Coupon
1. Find coupon
2. Toggle "Active" switch to OFF
3. Coupon immediately stops working

---

## 8. Reports & Analytics

### Revenue Reports
- Go to Analytics → Revenue
- View:
  - Daily/Weekly/Monthly revenue
  - Revenue by product
  - Revenue by category
  - Payment method breakdown

### Top Products
- Analytics → Top Products
- See best sellers by:
  - Quantity sold
  - Revenue generated
  - Average order value

### Customer Analytics
- Analytics → Customers
- View:
  - New vs returning customers
  - Customer lifetime value
  - Geographic distribution

### Exporting Reports
1. Select report
2. Choose date range
3. Click "Export"
4. Download as CSV/Excel

---

## 9. Settings

### General Settings
- **Store Name**: Your business name
- **Contact Email**: Customer support email
- **Support Phone**: Customer service number
- **Currency**: INR
- **Tax Rate**: 18% (GST)

### Shipping Settings
- **Flat Rate**: ₹50 nationwide
- **Free Shipping**: Above ₹999
- **Delivery Time**: 3-7 business days

### Payment Settings
- **Stripe**: Live mode enabled
- **Razorpay**: Live mode enabled
- **COD**: Enabled/Disabled

### Email Settings
- **Order Confirmation**: Auto-send
- **Shipping Notification**: Auto-send
- **Delivery Confirmation**: Auto-send

---

## 10. Common Tasks

### Daily Tasks (10-15 minutes)
- [ ] Check new orders (confirm payment received)
- [ ] Process orders ready for shipping
- [ ] Respond to customer queries
- [ ] Check low-stock alerts

### Weekly Tasks (30 minutes)
- [ ] Review sales reports
- [ ] Update popular products with more stock
- [ ] Plan promotions/coupons for next week

### Monthly Tasks (1-2 hours)
- [ ] Generate monthly revenue report
- [ ] Analyze top/bottom performing products
- [ ] Review customer feedback
- [ ] Plan inventory restocking

---

## 11. Troubleshooting

### "Payment Received but Order Still Pending"
**Solution:**
- Check Payments → Find payment ID
- If payment shows "Success", manually confirm order
- If payment shows "Created", contact customer

### "Customer Says Product Out of Stock but System Shows Stock"
**Solution:**
- Go to Products → Find product
- Check "Reserved Quantity" (stock held in pending orders)
- Actual available = Stock Qty - Reserved Qty

### "Refund Not Processed"
**Solution:**
1. Go to Order → Refunds tab
2. Check refund status
3. If "Pending", click "Retry Refund"
4. If still fails, contact payment gateway support

### "Webhook Error" (Technical)
**Solution:**
- Contact technical team
- Provide: Order number, payment ID, error message
- They'll check webhook logs

---

## 12. Best Practices

### Product Management
✅ Use high-quality images (min 800x800px)  
✅ Write detailed descriptions (improves SEO)  
✅ Keep prices competitive  
✅ Update stock regularly  
✅ Set realistic low-stock thresholds  

### Order Fulfillment
✅ Confirm orders within 24 hours  
✅ Ship within 48 hours of confirmation  
✅ Add tracking numbers immediately  
✅ Double-check address before shipping  
✅ Pack items securely  

### Customer Service
✅ Respond to queries within 4 hours  
✅ Be polite and professional  
✅ Offer solutions, not excuses  
✅ Process refunds promptly  

---

## 13. Support

### Need Help?
- **Email**: support@yourdomain.com
- **Phone**: +91-XXXX-XXXXXX (Mon-Sat, 9 AM - 6 PM)
- **WhatsApp**: +91-XXXX-XXXXXX

### Training Videos
- Product management: [Link]
- Order processing: [Link]
- Inventory management: [Link]

### Documentation
- Full admin manual: `docs/admin-manual.pdf`
- Video tutorials: `training/videos/`

---

## Quick Reference Card

| Task | Path |
|------|------|
| Add Product | Products → + Add Product |
| View Orders | Orders → All Orders |
| Process Refund | Order → Issue Refund |
| Create Coupon | Marketing → Coupons → + Create |
| Check Stock | Products → Inventory |
| View Revenue | Analytics → Revenue |
| Export Report | Analytics → [Report] → Export |

---

**Questions?** Contact your technical team or refer to the full documentation.

**Last Updated**: January 2024
