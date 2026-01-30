# CDN Invalidation (CloudFront example)

Use this after CMS/SEO publishes to keep CDN content fresh. Requires AWS CLI configured with permissions for CloudFront.

```bash
# Set your distribution ID
DIST_ID=YOUR_DISTRIBUTION_ID

# Invalidate common paths (adjust as needed)
aws cloudfront create-invalidation \
  --distribution-id "$DIST_ID" \
  --paths "/cms/*" "/seo/*" "/cdn/*"
```

If you use a different CDN, keep a similar invalidation script in CI/CD and trigger it on publish/deploy events.
