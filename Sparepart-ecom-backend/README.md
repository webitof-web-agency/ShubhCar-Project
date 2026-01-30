# SpareParts E-com Backend V4

## Purpose
This is the production-grade backend for the SpareParts E-commerce platform. It handles all core business logic including user management, product catalog, inventory tracking, cart management, order processing, payments, and shipping integrations.

## Tech Stack
- **Runtime**: Node.js (Late v18+)
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Caching & Queues**: Redis
- **Background Jobs**: BullMQ
- **Logging**: Winston + Morgan
- **Testing**: Jest, Supertest, k6
- **Validation**: Joi
- **Payment Gateways**: Stripe, Razorpay

## Environment Separation
We maintain strict separation between environments:
- **Development**: Local `env.development` or `.env`. Swagger enabled.
- **Staging**: `env.staging`. Mirrors production with test data. Swagger password-protected.
- **Production**: `env.production`. Optimized for performance. Swagger disabled. Strict security headers.

## High-Level Architecture
```ascii
[Client Apps]       [Admin Dashboard]
      |                    |
      +--------+-----------+
               |
        +------+------+
        | Load Balancer |
        +------+------+
               |
      +--------v--------+      +-----------+
      |  API Gateway    +<---->| Redis (Cache/Queues)
      | (Express App)   |      +-----------+
      +--------+--------+
               |
      +--------v--------+      +-----------+
      |  Core Services  +<---->| MongoDB (Data)
      | (Order, Inv...) |      +-----------+
      +--------+--------+
               |
      +--------v--------+
      | External APIs   |
      | (Stripe, Ship)  |
      +-----------------+
```

## Service Boundaries
The backend is structured as a monolith with modular services.
- **Auth**: User identity, JWT issuance, OTP.
- **Catalog**: Products, Categories, Search.
- **Cart & checkout**: Session management, pricing engine.
- **Order Management**: State machine, invoicing.
- **Inventory**: Stock reservations, concurrency handling.
- **Payments**: Gateway abstraction, reconciliation.

## Non-Goals
Explicitly, this backend does **NOT** handle:
- **Frontend Rendering**: It is a headless API.
- **Image Processing**: Handled by CDNs (Uploadcare/AWS S3) or separate microservice.
- **User Analytics**: Offloaded to Posthog/Google Analytics (backend only tracks business events).
