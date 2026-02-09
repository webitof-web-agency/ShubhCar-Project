const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const env = require('./config/env');
const { register: metricsRegister } = require('./config/metrics');
const { initErrorTracking } = require('./config/observability');
const requestIdMiddleware = require('./middlewares/requestId.middleware');

/* =====================
   API GATEWAY
===================== */
const apiGateway = require('./api');
const { apiLimiter } = require('./middlewares/rateLimiter.middleware');

const app = express();
initErrorTracking(app);

/* =====================
   GLOBAL MIDDLEWARE
===================== */
app.disable('x-powered-by');
app.use((req, res, next) => {
  if (env.NODE_ENV !== 'production') {
    res.setHeader('X-Debug', 'True');
  }
  next();
});
app.use(requestIdMiddleware);
app.use(compression());
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'base-uri': ["'self'"],
        'frame-ancestors': ["'none'"],
        'connect-src': ["'self'", env.FRONTEND_ORIGIN, env.ADMIN_ORIGIN ,"'http://localhost:3000'"],
        'img-src': ["'self'", 'data:', 'blob:'],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts:
      env.NODE_ENV === 'production'
        ? { maxAge: 15552000, includeSubDomains: true, preload: false }
        : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }),
);
app.use(
  cors({
    origin: [env.FRONTEND_ORIGIN, env.ADMIN_ORIGIN, env.BACKEND_ORIGIN , "http://localhost:3000"],
    credentials: false, // JWT in headers/localStorage; no cookies => no credentialed requests needed
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'X-Request-Id',
    ],
  }),
);
app.set('trust proxy', 1);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const shouldEnableSwagger =
  env.NODE_ENV === 'development' ||
  env.NODE_ENV === 'staging' ||
  (env.NODE_ENV === 'production' &&
    String(env.SWAGGER_ENABLED || '').toLowerCase() === 'true');

if (shouldEnableSwagger) {
  const swaggerUi = require('swagger-ui-express');
  const swaggerSpec = require('./docs/swagger');

  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, { explorer: false }),
  );

  // Machine-readable spec
  app.get('/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}
apiGateway.use(apiLimiter);
/**
 * IMPORTANT:
 * Body parsing is handled INSIDE api-gateway
 * because Stripe needs raw body only for webhook routes
 */

/* =====================
   API ENTRY (SINGLE)
===================== */
app.use('/api', apiGateway);

/* =====================
   HEALTH CHECK (readiness)
===================== */
const { redis, redisEnabled } = require('./config/redis');
const mongoose = require('mongoose');
app.get('/health', async (req, res) => {
  const mongoUp = (await mongoose.connection?.readyState) === 1;
  let redisUp = false;

  if (redisEnabled) {
    try {
      await redis.ping();
      redisUp = true;
    } catch (err) {
      redisUp = false;
    }
  }

  if (mongoUp) {
    if (!redisEnabled) {
      return res.status(200).json({
        status: 'ok',
        mongo: 'up',
        redis: 'disabled',
      });
    }

    if (redisUp) {
      return res.status(200).json({
        status: 'ok',
        mongo: 'up',
        redis: 'up',
      });
    } else {
      // MongoDB up, Redis down = degraded but operational
      return res.status(200).json({
        status: 'degraded',
        mongo: 'up',
        redis: 'down',
        message: 'Redis cache unavailable, some features may be slower',
      });
    }
  } else {
    // MongoDB down = critical failure
    return res.status(503).json({
      status: 'down',
      mongo: 'down',
      redis: redisEnabled ? (redisUp ? 'up' : 'down') : 'disabled',
    });
  }
});


/* =====================
   ROOT STATUS PAGE
===================== */
const { getSystemStatus } = require('./utils/systemStatus');

app.get('/', async (req, res) => {
  const status = await getSystemStatus();

  const generateRow = (key, value) => {
    let statusColor = 'gray';
    let statusText = value.status;

    if (statusText === 'Connected' || statusText === 'Configured') statusColor = '#22c55e'; // Green
    else if (statusText === 'Disabled') statusColor = '#eab308'; // Yellow
    else if (statusText === 'Missing' || statusText === 'Disconnected' || statusText === 'Error') statusColor = '#ef4444'; // Red
    else if (statusText === 'Connecting') statusColor = '#3b82f6'; // Blue

    return `
      <tr style="border-bottom: 1px solid #333;">
        <td style="padding: 12px; font-weight: 500;">${key}</td>
        <td style="padding: 12px; ">
          <span style="
            display: inline-block;
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 0.85rem;
            font-weight: 600;
            background-color: ${statusColor}20;
            color: ${statusColor};
            border: 1px solid ${statusColor}40;
          ">
            ${statusText}
          </span>
        </td>
        <td style="padding: 12px; color: #888; font-size: 0.9rem;">
          ${value.details || '-'}
        </td>
      </tr>
    `;
  };

  const rows = Object.entries(status).map(([k, v]) => generateRow(k, v)).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Backend Status</title>
      <style>
        body {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          background-color: #0f172a;
          color: #f8fafc;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
        }
        .container {
          background-color: #1e293b;
          padding: 2rem;
          border-radius: 1rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 600px;
          border: 1px solid #334155;
        }
        h1 {
          margin-top: 0;
          font-size: 1.5rem;
          color: #f8fafc;
          margin-bottom: 0.5rem;
          text-align: center;
        }
        p.subtitle {
          text-align: center;
          color: #94a3b8;
          margin-bottom: 2rem;
          font-size: 0.9rem;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        th {
          padding: 12px;
          color: #94a3b8;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #334155;
        }
        .footer {
          margin-top: 2rem;
          text-align: center;
          color: #64748b;
          font-size: 0.8rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 Backend Operational</h1>
        <p class="subtitle">Shubh Car Spares API is running successfully.</p>
        
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Status</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div class="footer">
          Env: ${env.NODE_ENV} | Port: ${env.PORT}
        </div>
      </div>
    </body>
    </html>
  `;

  res.send(html);
});

/* =====================
   METRICS (Prometheus)
===================== */
app.get('/metrics', async (req, res) => {
  if (env.METRICS_TOKEN) {
    const token = req.headers['x-metrics-token'];
    if (token !== env.METRICS_TOKEN) {
      return res.status(401).send('Unauthorized');
    }
  }
  res.set('Content-Type', metricsRegister.contentType);
  res.end(await metricsRegister.metrics());
});

module.exports = app;
