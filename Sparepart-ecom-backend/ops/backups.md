# Backups & DR (guidelines)

## MongoDB
- Snapshot strategy: daily `mongodump` to object storage (S3/GCS), retain 7–30 days.
- Example (from a trusted host/pod) using the active URI for the environment (`$MONGO_REPLICA_URI` in staging/prod, `$MONGO_URI` locally):
  ```bash
  mongodump --uri="${MONGO_REPLICA_URI:-$MONGO_URI}" --archive | gzip > mongo-$(date +%F).gz
  ```
- Restore:

  ```bash
  gunzip -c mongo-2025-01-01.gz | mongorestore --uri="${MONGO_REPLICA_URI:-$MONGO_URI}" --archive
  ```
- Verify: perform periodic test restores into a staging database.

## Redis
- Use `redis-cli save` (RDB) or `bgsave` and ship the `dump.rdb` to object storage; or enable AOF if needed.
- Example:
  ```bash
  redis-cli -u "$REDIS_URL" save
  cp /var/lib/redis/dump.rdb /backups/redis-$(date +%F).rdb
  ```
- Restore: place `dump.rdb` in Redis data dir and restart the server.

## DR notes
- Keep backups in a separate region/bucket with lifecycle policies.
- Document RPO/RTO targets; rehearse restores quarterly.
- Encrypt backups at rest and in transit; restrict access via IAM.
