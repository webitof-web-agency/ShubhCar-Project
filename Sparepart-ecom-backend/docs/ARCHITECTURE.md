# Backend Architecture

## Request Lifecycle
1. **Entry**: Request hits `app.js`.
2. **Global Middleware**: Security headers (Helmet), CORS, Compression, Rate Limiting.
3. **API Gateway**: `api/index.js` routes to specific modules.
4. **Module Router**: Validates tokens (Auth Middleware) and schemas (Joi).
5. **Controller**: Parses request, calls Service.
6. **Service**: Contains **ALL** business logic. Interacts with Repositories.
7. **Repository**: Direct database access (Mongoose queries). **No business logic here.**
8. **Response**: JSON payload returned via standard helper `success()`.

## Folder Structure
```
backend/
├── config/         # Environment, DB connection, Logger
├── middlewares/    # Auth, Error, RateLimiters
├── models/         # Mongoose Schemas (Data Layer)
├── modules/        # Feature Modules (Controller-Service-Repo pattern)
│   ├── auth/
│   ├── orders/
│   ├── products/
│   └── ...
├── services/       # Shared/External Services (Email, Stripe, Tax)
├── utils/          # Helpers, Constants
├── jobs/           # Background job definitions
└── workers/        # BullMQ processors
```

## Design Patterns
### Controller-Service-Repository
We strictly follow **CSR**:
- **Controller**: HTTP layer only. Input parsing -> Service call -> Output formatting.
- **Service**: Domain logic. "Calculate tax", "Reserve stock", "Send email".
- **Repository**: Data access. "Find user by ID", "Update stock count".

### Error Handling Strategy
- **Centralized**: All errors bubble up to a global error handler in `app.js`.
- **Operational vs Programmer**: We distinguish between "User not found" (404) and "Undefined property" (500).
- **Async Handling**: All controllers wrapped in `asyncHandler` to catch rejected promises automatically.

### Logging Strategy
- **Library**: Winston.
- **Context**: Every log includes `requestId`, `userId`, `method`, `route`.
- **Levels**: 
  - `error`: System broken, immediate attention.
  - `warn`: Business logic failure (payment failed, stock low).
  - `info`: Key lifecycle events (order placed, user logged in).

### Background Jobs & Queues
Using **BullMQ** on Redis.
- **EmailQueue**: Sends transactional emails asynchronously.
- **OrderCleanupQueue**: Auto-cancels unpaid orders after 1 hour.
- **PaymentRetryQueue**: Retries failed webhook processings.

## Architectural Decisions
1. **Why Monolith?** Rapid development and shared type/logic patterns were prioritized over microservice complexity.
2. **Why Mongoose?** Flexible schema for product attributes (E-AV pattern) which change frequently.
3. **Why Redis?** Critical for high-speed cart operations and distributed locking (preventing overselling).
