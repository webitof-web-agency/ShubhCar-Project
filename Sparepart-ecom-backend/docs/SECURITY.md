# Security

## Security Posture (API)

- **Auth model:** JWT in `Authorization: Bearer <token>` header. No cookies/localStorage-bound cookies are used; CORS credentials are disabled.
- **Origins:** Configure allowed frontend/admin origins via `FRONTEND_ORIGIN` and `ADMIN_ORIGIN` env vars.
- **Gateways:** Stripe and Razorpay are the only supported payment gateways; their env keys are required.
- **Headers:** Helmet is enabled with CSP/HSTS (prod), COOP/CORP, referrer policy; CORS is restricted to configured origins and standard headers/methods.
- **Sanitization:** Incoming `body/query/params` are sanitized against NoSQL injection primitives.
- **Rate limiting:** Global/API, admin, vendor, auth, and webhook limits are in place; keep them tuned per deployment.

If you introduce cookies or additional origins, revisit CORS, CSP, and CSRF requirements accordingly.

---

## Security Checklist
- [x] **Helmet Headers**: CSP, HSTS, NoSniff established globally.
- [x] **Rate Limiting**: Applied to all routes, stricter on `/auth/*`.
- [x] **Data Sanitization**: Mongo-sanitize to prevent NoSQL injection.
- [x] **CORS**: Strict whitelist of frontend and admin domains.
- [x] **JWT Security**: Short expiry, signed with strong secrets.
- [x] **Password Hashing**: Argon2 or Bcrypt (Work factor 10+).

## Validations
- **Joi**: Schemas defined for EVERY POST/PUT endpoint. Unknown fields are stripped to prevent mass assignment protection.

## Sensitive Data Handling
- **Passwords**: Never logged, never returned in API response.
- **Tokens**: Refresh tokens stored hashed in DB.
- **Payment Info**: Never touches our server (PCI SAQ-A).

## Known Risks / Improvement Areas
1. **⚠️ DDoS Protection**: Currently relies on basic logical rate limits. Needs Cloudflare/AWS WAF for production.
2. **⚠️ API Key Management**: No rotation mechanism for Vendor API keys yet.
3. **⚠️ File Uploads**: Malware scanning is currently handled by external provider (Uploadcare), not internally.
