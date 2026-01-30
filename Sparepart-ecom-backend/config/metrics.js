const client = require('prom-client');

// Default registry
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// HTTP request duration histogram
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
});

register.registerMetric(httpRequestDuration);

// Cache hit/miss counters
const cacheHitCounter = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total cache hits',
  labelNames: ['cache'],
});
const cacheMissCounter = new client.Counter({
  name: 'cache_misses_total',
  help: 'Total cache misses',
  labelNames: ['cache'],
});
register.registerMetric(cacheHitCounter);
register.registerMetric(cacheMissCounter);

// Redis availability gauge (1 = up, 0 = down)
const redisUpGauge = new client.Gauge({
  name: 'redis_up',
  help: 'Redis availability status',
});
register.registerMetric(redisUpGauge);

module.exports = {
  register,
  httpRequestDuration,
  cacheHitCounter,
  cacheMissCounter,
  redisUpGauge,
};
