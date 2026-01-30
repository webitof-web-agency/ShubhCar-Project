# Analytics & Reporting

## Overview

Business intelligence and reporting system providing insights into sales, inventory, customer behavior, and product performance.

---

## Key Metrics

### Sales Analytics
- **Revenue**: Total sales, daily/weekly/monthly trends
- **Orders**: Order count, average order value (AOV)
- **Conversion Rate**: Visitors → customers
- **Top Products**: Best-selling items
- **Revenue by Category**: Category performance

### Customer Analytics
- **New vs Returning**: Customer segmentation
- **Customer Lifetime Value (CLV)**
- **Churn Rate**: Lost customers
- **Geographic Distribution**: Sales by location

### Product Analytics
- **Inventory Turnover**: How fast products sell
- **Low Stock Alerts**: Products needing restock
- **Product Performance**: Views vs sales ratio

### Vendor Analytics (Marketplace)
- **Vendor Sales**: Revenue by vendor
- **Commission Earned**: Platform earnings
- **Payout Summary**: Money owed to vendors

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/analytics/dashboard` | Overview metrics |
| GET | `/admin/analytics/revenue` | Revenue analytics |
| GET | `/admin/analytics/top-products` | Best sellers |
| GET | `/admin/analytics/customers` | Customer insights |
| GET | `/vendor/analytics/sales` | Vendor sales data |
| GET | `/analytics/export` | Export reports (CSV/PDF) |

---

## Dashboard Widgets

### Revenue Card
```
Today: ₹45,000 (+12%)
This Month: ₹12,50,000 (+8%)
This Year: ₹1,25,00,000
```

### Orders Card
```
Pending: 25
Processing: 12
Shipped: 156
Delivered: 1,205
```

### Top Products
```
1. Laptop Bag - ₹1,25,000 (50 sales)
2. Office Chair - ₹98,000 (20 sales)
3. Desk Lamp - ₹45,000 (90 sales)
```

---

## Report Types

### 1. Sales Report
- Date range filter
- Group by: day/week/month
- Breakdown by: category, vendor, product
- Export: CSV, PDF

### 2. Inventory Report
- Current stock levels
- Low stock items
- Out of stock items
- Inventory value

### 3. Customer Report
- New customers
- Repeat customers
- Top customers by spend
- Customer segments

### 4. Vendor Payout Report
- Sales by vendor
- Commission breakdown
- Payouts processed
- Outstanding payments

---

## Query Optimization

### Aggregation Pipeline Example

```javascript
// Monthly revenue
await Order.aggregate([
  { $match: { orderStatus: 'delivered', createdAt: { $gte: startDate } } },
  { $group: {
      _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
      revenue: { $sum: '$grandTotal' },
      orderCount: { $sum: 1 }
  }},
  { $sort: { _id: 1 } }
]);
```

### Caching Strategy

```
analytics:dashboard          // 5 min TTL
analytics:revenue:{range}    // 15 min TTL
analytics:top-products       // 30 min TTL
```

---

## Scheduled Reports

- **Daily Sales Summary**: Emailed at 9 AM
- **Weekly Inventory Alert**: Emailed Monday 10 AM
- **Monthly Performance Report**: Generated on 1st of month

---

## Related Documentation

- [Admin Guide](./ADMIN_GUIDE.md)
- [Observability](./OBSERVABILITY.md)
