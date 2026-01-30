const dotenv = require('dotenv');
const Joi = require('joi');

dotenv.config();

const schema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .required(),
  PORT: Joi.number().required(),

  MONGO_URI: Joi.string(),
  MONGO_REPLICA_URI: Joi.string(),
  REDIS_URL: Joi.string().optional(),

  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().required(),

  GOOGLE_CLIENT_ID: Joi.string().optional(),

  STRIPE_SECRET_KEY: Joi.string().required(),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional(),
  RAZORPAY_KEY_ID: Joi.string().required(),
  RAZORPAY_KEY_SECRET: Joi.string().required(),
  RAZORPAY_WEBHOOK_SECRET: Joi.string().optional(),

  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().required(),
  SMTP_USER: Joi.string().required(),
  SMTP_PASS: Joi.string().required(),

  FRONTEND_ORIGIN: Joi.string().uri().default('http://localhost:3000'),
  ADMIN_ORIGIN: Joi.string().uri().default('http://localhost:5173'),

  TAX_RATE: Joi.number().min(0).max(1).default(0),
  GST_DEFAULT_RATE: Joi.number().min(0).max(1).default(0.18),
  GST_ORIGIN_STATE: Joi.string().default('KA'),
  SHIPPING_FLAT_RATE: Joi.number().min(0).default(0),

  METRICS_TOKEN: Joi.string().optional(),

  LOG_LEVEL: Joi.string().default('info'),
}).unknown();

const { value, error } = schema.validate(process.env);

if (error) {
  console.error('❌ ENV validation failed:', error.message);
  process.exit(1);
}

if (!value.MONGO_URI && !value.MONGO_REPLICA_URI) {
  console.error('❌ ENV validation failed: MONGO_URI or MONGO_REPLICA_URI is required');
  process.exit(1);
}

module.exports = value;
