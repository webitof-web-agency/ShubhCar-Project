# Observability & Ops Overview

- **Metrics**: Prometheus scrape `/metrics` with `x-metrics-token: $METRICS_TOKEN` header. Add Alertmanager rules (see `ops/alerts.yaml`).
- **Health**: `/health` reports Mongo/Redis; use for readiness/liveness probes.
- **Logs**: JSON stdout via Winston (ship to ELK/CloudWatch); error/app file logs also present.
- **Backups/DR**: See `ops/backups.md` for Mongo/Redis snapshot guidance and restore steps.
- **Deploy**: Dockerfile and compose included; for K8s, see `ops/k8s/deployment.yaml` + `ops/k8s/ingress.yaml` placeholders. Terminate TLS at the edge (Ingress/ELB/CDN) and enable HSTS there.
- **Security**: Protect `/metrics` with `METRICS_TOKEN`; keep Stripe/Razorpay keys in secrets; limit ingress to trusted sources where possible.
