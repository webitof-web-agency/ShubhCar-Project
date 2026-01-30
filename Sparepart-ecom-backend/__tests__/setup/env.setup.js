// Ensures config/env validation passes during tests without leaking secrets.
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/test-db';
process.env.MONGO_REPLICA_URI = process.env.MONGO_REPLICA_URI || process.env.MONGO_URI;
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET =
  process.env.STRIPE_WEBHOOK_SECRET || 'whsec_dummy';
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_id';
process.env.RAZORPAY_KEY_SECRET =
  process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret';
process.env.RAZORPAY_WEBHOOK_SECRET =
  process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret';
process.env.FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
process.env.ADMIN_ORIGIN = process.env.ADMIN_ORIGIN || 'http://localhost:5173';
process.env.SHIPPING_FLAT_RATE = process.env.SHIPPING_FLAT_RATE || '0';
process.env.TAX_RATE = process.env.TAX_RATE || '0';
process.env.LOW_STOCK_THRESHOLD = process.env.LOW_STOCK_THRESHOLD || '5';
process.env.STOCK_ALERT_EMAIL = process.env.STOCK_ALERT_EMAIL || 'ops@example.com';
