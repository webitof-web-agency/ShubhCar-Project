# Cache Strategy

Production-oriented caching rules for catalog-heavy, price/inventory-sensitive flows.

## Roles
- **CDN (CloudFront/S3):** static/immutable-ish assets only (images, CMS pages, SEO JSON). Never prices/inventory/coupons. TTL 5m–24h; URL-only cache key; invalidate on publish.
- **Redis (correctness + speed):** dynamic product data, pricing, inventory, coupons, wishlists, notifications, carts, aggregates.

## Redis Keys & TTLs
- Product detail: `product:slug:{slug}:role:{retail|wholesale}:lang:{lang}` (10m).
- Product list/PLP: `products:list:cat:{catId}:p:{p}:l:{l}:s:{sort}:c:{cursor}:f:{filtersHash}` (3m).
- Featured list: `products:featured:p:{p}:l:{l}:c:{cursor}` (3m).
- Inventory: `inventory:{variantId}` (30s).
- Category: `categories:*` (roots/children/slug/tree) (45m).
- Coupons: `coupon:{CODE}` (bounded by validity, min 60s, max 10m).
- Wishlist: `wishlist:user:{userId}` (5m).
- Notifications: `notif:user:{userId}` (5m).

Rule: if output changes by any request dimension (role/lang/filters/pagination) → encode it in the key.

## Invalidation Triggers
- Product create/update/delete/restore/approve: clear `product:slug:*` for old/new slugs + `products:list:*` and `products:featured:*`.
- Category create/update/delete: clear `categories:*` and `products:list:*` (category tree changes affect PLPs).
- Inventory reserve/commit/release/admin adjust: clear `inventory:{variantId}`.
- Cart add/update/remove: clears cart cache (existing logic); variant reads go through inventory cache for freshness.
- Coupon create/update/delete: invalidate `coupon:{CODE}`.
- CMS/SEO publish: CDN invalidation (out-of-repo script) + clear relevant Redis keys if feeding any API endpoints.

Pattern deletes use SCAN (non-blocking) via `cache/cacheUtils.deleteByPattern`.

## Safeguards
- Single Redis client (`config/redis.js`) for all caches.
- JSON helpers (`cache/cacheUtils.js`) prevent repeated boilerplate.
- Inventory TTL kept very short to avoid stale stock; every mutation clears the key.
- Pricing applied at read-time per user role to avoid mixing contexts in cache payloads.

## Future hooks
- Emit cache miss/hit metrics for Prometheus. (Added: see metrics `cache_hits_total`, `cache_misses_total`.)
- Add CDN invalidation script for CMS deploys. (Example: `ops/cdn-invalidation.example.md`.)
