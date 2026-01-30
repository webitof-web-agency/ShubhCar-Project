# Backend Features List - Sparepart E-commerce

**Project**: Sparepart-ecom-backend  
**Version**: 1.0.0  
**Last Updated**: 2026-01-30

---

## 📧 Communication & Notifications

### Email System
- **Provider**: Nodemailer (v7.0.12)
- **Features**:
  - Transactional email templates
  - Email dispatch queue (BullMQ)
  - Template-based emails (order confirmation, shipping, etc.)
  - Email tracking via `EmailDispatch` model
  - Idempotent email sending (prevents duplicates)
- **Templates**:
  - Order placed
  - Order confirmed
  - Order shipped
  - Order delivered
  - Order cancelled
  - Payment receipts
  - User verification

### SMS Notifications
- **Provider**: Custom SMS utility
- **Features**:
  - OTP delivery
  - Order status updates
  - User verification

### In-App Notifications
- **Features**:
  - Real-time notifications
  - Multi-audience support (user, vendor, admin)
  - Notification caching
  - Read/unread status tracking

---

## 💳 Payment Processing

### Payment Gateways
- **Stripe** (v20.1.0)
  - Payment intents
  - Webhook handling (`payment_intent.succeeded`, `charge.refunded`)
  - Refund processing
  - Automatic invoice generation
- **Razorpay** (v2.9.6)
  - Order creation
  - Payment capture
  - Webhook handling (`payment.captured`, `order.paid`, `refund.processed`)
  - Refund processing

### Payment Features
- **Multi-gateway support**: Stripe + Razorpay
- **Payment methods**: Online, COD (Cash on Delivery)
- **Payment reconciliation**: Automated cron job (every 15 minutes)
- **Payment retry logic**: Background worker for failed payments
- **Webhook processing**: Async queue-based handling
- **Idempotency**: Prevents duplicate payment processing
- **Payment tracking**: Complete audit trail
- **Refunds**: Full and partial refund support
- **Credit notes**: Auto-generated for refunds

---

## 📊 Data Export & Import

### Excel/Spreadsheet
- **Library**: ExcelJS (v4.4.0)
- **Features**:
  - Product bulk import
  - Product bulk export
  - Order reports
  - Sales analytics export
  - Inventory reports
  - Custom data exports

### PDF Generation
- **Library**: PDFKit (v0.14.0)
- **Features**:
  - Invoice generation
  - Credit note generation
  - Order receipts
  - Shipping labels
  - Custom reports

### Bulk Operations
- **Product bulk create**: Queue-based worker (300+ lines)
- **Product bulk update**: Queue-based worker (200+ lines)
- **Data validation**: Schema validation before import
- **Error handling**: Detailed error reports for failed imports

---

## 🔐 Authentication & Authorization

### Authentication Methods
- **Email/Password**: Bcrypt hashing (v6.0.0)
- **Google OAuth**: Google Auth Library (v9.15.0)
- **Phone/OTP**: Custom OTP generation and verification
- **JWT Tokens**: jsonwebtoken (v9.0.3)

### Security Features
- **Token blacklisting**: Redis-based token revocation
- **Password hashing**: Bcrypt with salt rounds
- **JWT expiration**: Configurable token lifetime
- **Role-based access control (RBAC)**: Admin, User, Vendor roles
- **Session management**: Stateless JWT-based
- **Rate limiting**: Express rate limit (v8.2.1)
- **Input sanitization**: sanitize-html (v2.13.0)
- **Helmet security**: HTTP security headers (v8.1.0)

---

## 📦 File Storage & Media

### Storage Providers
- **AWS S3**: @aws-sdk/client-s3 (v3.971.0)
  - File upload
  - Pre-signed URLs
  - Public/private bucket support
- **Local Storage**: Multer (v2.0.0)
  - Temporary file uploads
  - Media processing

### File Handling
- **Image uploads**: Product images, user avatars
- **Document uploads**: Vendor documents, compliance files
- **Media library**: Centralized media management
- **File validation**: Type and size restrictions
- **CDN integration**: Ready for CDN invalidation

---

## 🗄️ Database & Caching

### Database
- **MongoDB**: Mongoose ODM (v9.0.1)
  - 47 data models
  - Schema validation
  - Indexes for performance
  - Soft delete pattern
  - Audit trails (OrderEvent, UserActivityLog)

### Caching
- **Redis**: ioredis (v5.8.2)
  - 12 cache utility files
  - Cache versioning
  - Pattern-based invalidation
  - TTL support
  - Cache metrics (hits/misses)
- **Cached Entities**:
  - Products
  - Categories
  - Users
  - Inventory
  - Notifications
  - Reviews
  - Wishlists
  - Order items
  - CMS content
  - OTP codes

---

## ⚙️ Background Jobs & Queues

### Queue System
- **BullMQ** (v5.66.1)
- **9 Queue Definitions**:
  - Order queue (auto-cancel, shipment prep, notifications)
  - Email queue
  - User queue (onboarding, verification)
  - Payment webhook queue
  - Payment retry queue
  - Payout queue
  - Manual review queue
  - Product bulk create queue
  - Product bulk update queue

### Workers (9 Background Processors)
- **Payment webhook worker**: Multi-gateway webhook processing
- **Order worker**: Order lifecycle management
- **Payment retry worker**: Failed payment retries
- **Product bulk workers**: Import/export operations
- **Payout worker**: Vendor payment disbursement
- **Email worker**: Email dispatch
- **Manual review worker**: Fraud/compliance review
- **Inventory release worker**: Stock management

### Scheduled Jobs (Cron)
- **Payment reconciliation**: Every 15 minutes
- **General reconciliation**: Configurable schedule
- **Distributed locking**: Redis-based to prevent concurrent runs

---

## 🛒 E-commerce Features

### Product Management
- **Product catalog**: Full CRUD operations
- **Categories**: Hierarchical category structure
- **Brands**: Brand management
- **Variants**: Product variants with attributes
- **Compatibility**: Vehicle compatibility matching
- **Reviews**: Product reviews and ratings
- **Tags**: Product tagging system
- **SEO**: SEO metadata management
- **Slugs**: URL-friendly slugs (slugify v1.6.6)

### Inventory Management
- **Stock tracking**: Real-time inventory
- **Reservation system**: Transaction-safe stock reservation
- **Inventory logs**: Complete audit trail
- **Low stock alerts**: Business metrics tracking
- **Concurrency handling**: Prevents overselling
- **Multi-vendor inventory**: Vendor-specific stock

### Cart & Checkout
- **Guest cart**: localStorage-based
- **Authenticated cart**: Database-backed
- **Cart sync**: Merge guest cart on login
- **Pricing engine**: Dynamic pricing calculation
- **Tax calculation**: GST (CGST/SGST/IGST) - 309 lines
- **Shipping calculation**: Rule-based shipping costs
- **Coupon system**: Discount coupons with usage tracking
- **Checkout totals**: Comprehensive total calculation

### Order Management
- **Order lifecycle**: State machine-based
- **Order status tracking**: 10+ status states
- **Order versioning**: Complete order history
- **Order events**: Audit trail
- **Auto-cancel**: 20-minute timeout for unpaid orders
- **Multi-vendor orders**: Vendor split management
- **Invoice generation**: Automatic PDF invoices
- **Shipment tracking**: Carrier integration ready

---

## 🏢 Multi-Vendor Support

### Order Management
- **Multi-vendor orders**: Order split management for products from different sellers
- **Vendor splits**: Automatic order item allocation by vendor
- **Commission calculation**: Configurable commission rates per vendor or category

---

## 📈 Analytics & Reporting

### Business Metrics
- **Order metrics**: Created, confirmed, cancelled
- **Payment metrics**: Initiated, completed, failed
- **Inventory metrics**: Reserved, committed, released
- **Auth metrics**: Registration, login, logout
- **Performance metrics**: Slow queries, slow requests
- **Sales reports**: Revenue and sales analytics

### Observability
- **Prometheus metrics**: prom-client (v15.1.3)
- **Sentry error tracking**: @sentry/node (v8.55.0)
- **Winston logging**: Structured JSON logs (v3.19.0)
- **Morgan HTTP logs**: Request logging (v1.10.1)
- **Request tracking**: Unique request IDs
- **Health checks**: `/health` endpoint for K8s probes

---

## 🧪 Testing & Quality

### Testing Tools
- **Jest**: Unit and integration tests (v29.7.0)
- **Supertest**: API testing (v7.1.3)
- **k6**: Load and performance testing
- **MongoDB Memory Server**: In-memory DB for tests (v10.4.3)

### Test Coverage
- **35 test files**: Services, repos, integration, workers
- **4 mock files**: BullMQ, Redis, Nodemailer, Google Auth
- **Load tests**: 5 k6 scenarios (auth, cart, checkout, webhook, rate-limit)

---

## 🔧 Developer Tools

### API Documentation
- **Swagger**: swagger-ui-express (v5.0.1)
- **OpenAPI spec**: swagger-jsdoc (v6.2.8)
- **Interactive docs**: Available at `/docs`

### Development
- **Nodemon**: Auto-restart on changes (v3.1.11)
- **Environment validation**: Joi schema validation (v18.0.2)
- **Compression**: Response compression (v1.8.1)
- **CORS**: Configurable CORS (v2.8.5)
- **Body parsing**: JSON and URL-encoded
- **Request validation**: express-validator (v7.3.1)

---

## 🚀 DevOps & Deployment

### Containerization
- **Docker**: Dockerfile included
- **Docker Compose**: Multi-service orchestration

### Kubernetes
- **K8s configs**: Deployment and ingress YAML
- **Health probes**: Readiness and liveness endpoints
- **Metrics endpoint**: `/metrics` with token auth

### Monitoring
- **Prometheus**: Metrics scraping
- **Alertmanager**: Alert rules (ops/alerts.yaml)
- **Log aggregation**: JSON logs for ELK/CloudWatch

### Backup & Recovery
- **MongoDB backups**: Snapshot guidance
- **Redis backups**: Persistence configuration
- **Disaster recovery**: Documented procedures

---

## 🌐 Third-Party Integrations

### Current Integrations
- **Stripe**: Payment processing
- **Razorpay**: Payment processing (India)
- **AWS S3**: File storage
- **Google OAuth**: Authentication
- **Sentry**: Error tracking
- **Prometheus**: Metrics collection

### Integration-Ready
- **Shipping carriers**: Shipment service abstraction
- **SMS providers**: SMS utility ready
- **CDN**: CDN invalidation examples
- **Analytics**: Event tracking infrastructure

---

## 🛡️ Security Features

### Application Security
- **Helmet**: Security headers
- **Rate limiting**: API and webhook rate limits
- **Input sanitization**: HTML and SQL injection prevention
- **CORS**: Strict origin validation
- **JWT blacklisting**: Token revocation
- **Webhook signature verification**: Payment gateway security
- **Fraud detection**: Manual review queue
- **Audit logging**: Admin and user activity logs

### Data Protection
- **Password hashing**: Bcrypt
- **Encryption utilities**: Custom encryption
- **Secure file uploads**: Type and size validation
- **Environment secrets**: Joi validation on startup

---

## 📋 Content Management

### CMS Features
- **Pages**: Dynamic page management
- **Media library**: Centralized media storage
- **SEO management**: Meta tags, descriptions
- **Email templates**: Template management
- **Settings**: Application-wide settings

---

## 🔢 Utilities & Helpers

### Number Generation
- **Order numbers**: Unique order numbering (nanoid v5.1.6)
- **Invoice numbers**: Sequential invoice numbering
- **Credit note numbers**: Credit note numbering

### Data Processing
- **Pagination**: Cursor and offset pagination
- **Slugification**: URL-friendly slugs
- **User agent parsing**: ua-parser-js (v2.0.8)
- **Date handling**: Native Date + timezone support

---

## 🔌 API Modules & Endpoints

### Complete Module List (43 Modules)

The backend is organized into **43 feature modules**, each with dedicated routes, services, controllers, and repositories:

#### Core E-commerce Modules (21 modules)
1. **auth** - JWT-based authentication, Google OAuth, OTP verification, password reset
2. **users** - User profiles, registration, account management, role assignment
3. **userAddresses** - Multiple shipping addresses per user, default address selection
4. **userActivityLogs** - Track user actions, login history, security audit trail
5. **products** - Full product catalog with bulk import/export (Excel/CSV), 562-line routes file
6. **productImages** - Multi-image upload, image ordering, CDN integration
7. **productAttribute** - Define custom product attributes (size, color, material, etc.)
8. **productAttributeValues** - Manage attribute value options and variants
9. **productCompatibility** - Vehicle-specific part compatibility matching
10. **categories** - Hierarchical category tree, nested categories, SEO-friendly URLs
11. **categoryAttribute** - Category-specific attributes and filters
12. **brands** - Brand catalog, brand pages, brand-based filtering
13. **models** - Vehicle model database for compatibility matching
14. **tags** - Product tagging for search and filtering
15. **cart** - Guest and authenticated carts, cart sync on login, item management
16. **orders** - Order creation, status tracking, auto-cancel, order history
17. **orderItems** - Individual line items, pricing, quantity management
18. **orderReview** - Admin order review workflow for fraud prevention
19. **payments** - Stripe & Razorpay integration, payment intents, webhook handling
20. **coupons** - Discount codes, usage limits, expiration, percentage/fixed discounts
21. **reviews** - Product ratings, verified purchase reviews, review moderation
22. **wishlist** - Save products for later, wishlist sharing

#### Inventory & Fulfillment (5 modules)
23. **inventory** - Real-time stock tracking, reservation system, low stock alerts
24. **inventoryLogs** - Complete inventory audit trail, stock movement history
25. **shipments** - Shipment tracking, carrier integration, delivery status updates
26. **shippingRules** - Zone-based shipping costs, weight-based pricing, free shipping rules
27. **returns** - Return request management, RMA workflow, refund processing

#### Analytics & Reporting (2 modules)
28. **analytics** - 14 comprehensive endpoints: revenue, sales by geography, inventory turnover, customer retention
29. **salesReports** - Detailed sales reports, export to Excel, date range filtering

#### Admin & Operations (4 modules)
30. **admin** - Admin dashboard, bulk operations, system management
31. **audit** - System-wide audit logging, admin action tracking
32. **roles** - Role-based access control (RBAC), permission management
33. **settings** - Application-wide settings, configuration management

#### Content Management (5 modules)
34. **pages** - Dynamic CMS pages, custom page builder, SEO metadata
35. **media** - Centralized media library, image optimization, S3 storage
36. **emailTemplates** - Customizable email templates, dynamic content injection
37. **seo** - Meta tags, Open Graph, structured data, sitemap generation
38. **entries** - Generic content entries for flexible data management

#### Financial (2 modules)
39. **invoice** - PDF invoice generation, credit notes, invoice numbering
40. **tax** - GST calculation (CGST/SGST/IGST), HSN code support, tax slabs

#### Communication (1 module)
41. **notifications** - Real-time notifications, email/SMS dispatch, notification preferences

#### Vehicle Management (1 module)
42. **vehicle-management** - Vehicle finder, make/model/year selection, part compatibility engine

---

## 📊 Key API Endpoints by Module

### Products Module (30+ Endpoints)
- **Public**:
  - `GET /products` - List products with filters
  - `GET /products/featured` - Featured products
  - `GET /products/category/:categoryId` - Products by category
  - `GET /products/:slug` - Product details by slug
  - `GET /products/id/:productId` - Product by ID
  - `GET /products/id/:productId/compatibility` - Vehicle compatibility
  - `GET /products/id/:productId/alternatives` - Alternative products
  
- **Admin**:
  - `GET /products/admin/list` - Admin product list
  - `POST /products/admin/bulk-create/preview` - Preview bulk import
  - `POST /products/admin/bulk-create/confirm` - Confirm bulk import
  - `GET /products/admin/bulk-create/template` - Download import template
  - `GET /products/admin/bulk-create/export` - Export products
  - `GET /products/admin/bulk-create/jobs/:jobId` - Check import status
  - `POST /products/admin/bulk-update/preview` - Preview bulk update
  - `POST /products/admin/bulk-update/confirm` - Confirm bulk update
  - `GET /products/admin/bulk-update/template` - Download update template
  - `GET /products/admin/bulk-update/export` - Export for update
  - `GET /products/admin/bulk-update/jobs/:jobId` - Check update status
  - `POST /products/admin/:productId/approve` - Approve product
  - `POST /products/admin/:productId/restore` - Restore deleted product
  - `DELETE /products/admin/empty-trash` - Empty trash
  - `DELETE /products/admin/:productId/force-delete` - Permanent delete
  
- **Vendor/Admin**:
  - `POST /products` - Create product
  - `PUT /products/:productId` - Update product
  - `DELETE /products/:productId` - Soft delete product
  - `POST /products/:productId/images` - Upload images

### Analytics Module (14 Endpoints)
- `GET /analytics/dashboard` - Dashboard stats
- `GET /analytics/dashboard/chart` - Revenue chart data
- `GET /analytics/revenue` - Revenue summary
- `GET /analytics/users` - User analytics
- `GET /analytics/top-products` - Best-selling products
- `GET /analytics/top-categories` - Top categories
- `GET /analytics/top-brands` - Top brands
- `GET /analytics/inventory` - Inventory analytics
- `GET /analytics/inventory-turnover` - Inventory turnover rate
- `GET /analytics/reviews` - Review analytics
- `GET /analytics/sales-by-state` - Geographic sales (state)
- `GET /analytics/sales-by-city` - Geographic sales (city)
- `GET /analytics/repeat-customers` - Customer retention
- `GET /analytics/fulfillment` - Fulfillment metrics
- `GET /analytics/funnel` - Order funnel analysis

### Authentication Module
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/google` - Google OAuth login
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/forgot-password` - Password reset request
- `POST /auth/reset-password` - Reset password
- `POST /auth/verify-email` - Email verification
- `POST /auth/resend-verification` - Resend verification email

### Cart Module
- `GET /cart` - Get user cart
- `POST /cart/items` - Add item to cart
- `PUT /cart/items/:itemId` - Update cart item
- `DELETE /cart/items/:itemId` - Remove cart item
- `DELETE /cart` - Clear cart
- `POST /cart/sync` - Sync guest cart on login

### Orders Module
- `GET /orders` - List user orders
- `GET /orders/:orderId` - Get order details
- `POST /orders` - Create order
- `POST /orders/:orderId/cancel` - Cancel order
- `GET /orders/:orderId/invoice` - Download invoice
- `GET /orders/:orderId/track` - Track shipment

### Payments Module
- `POST /payments/create-intent` - Create payment intent
- `POST /payments/webhooks/stripe` - Stripe webhook
- `POST /payments/webhooks/razorpay` - Razorpay webhook
- `POST /payments/:paymentId/refund` - Initiate refund



---

## 📊 Summary Statistics

| Category | Count |
|----------|-------|
| **Total Dependencies** | 37 packages |
| **Feature Modules** | 42 modules |
| **Route Files** | 41 routes |
| **Service Files** | 50 services |
| **Controller Files** | 40 controllers |
| **Data Models** | 47 models |
| **Queue Definitions** | 9 queues |
| **Background Workers** | 9 workers |
| **Cache Utilities** | 12 files |
| **Middlewares** | 16 middlewares |
| **Business Services** | 9 services |
| **Utility Functions** | 25 utilities |
| **Test Files** | 35+ tests |
| **API Endpoints** | 150+ endpoints |

---

## 🎯 Key Capabilities

✅ **Email & SMS**: Transactional emails, OTP, notifications  
✅ **Excel Import/Export**: Bulk operations with ExcelJS  
✅ **PDF Generation**: Invoices, receipts, reports  
✅ **Multi-Gateway Payments**: Stripe + Razorpay  
✅ **File Storage**: AWS S3 + local storage  
✅ **Advanced Caching**: Redis with 12 cache layers  
✅ **Background Jobs**: BullMQ with 9 workers  
✅ **Tax Calculation**: GST compliance (CGST/SGST/IGST)  
✅ **Multi-Vendor**: Complete vendor management  
✅ **Load Testing**: k6 performance tests  
✅ **API Documentation**: Swagger/OpenAPI  
✅ **Observability**: Prometheus + Sentry + Winston  
✅ **Security**: Helmet, rate limiting, JWT, encryption  
✅ **Testing**: Jest + Supertest + k6  
✅ **DevOps Ready**: Docker, K8s, health checks  

---

**Note**: This comprehensive features list is based on the complete inspection of all 22 backend folders including the `modules/` folder which contains 42 feature-specific implementations with 150+ API endpoints. The backend is production-ready with extensive testing, documentation, and observability features. The vendor management module has been removed as this is a single-seller platform.

