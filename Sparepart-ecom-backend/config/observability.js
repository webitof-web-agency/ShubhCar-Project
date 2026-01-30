const Sentry = require('@sentry/node');
const env = require('./env');
const logger = require('./logger');

let sentryEnabled = false;

const initErrorTracking = (app) => {
  if (!env.SENTRY_DSN) return null;

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: Number(env.SENTRY_TRACES_SAMPLE_RATE || 0),
  });

  sentryEnabled = true;

  if (app) {
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
  }

  logger.info('Error tracking enabled');
  return Sentry;
};

const sentryErrorHandler = () => {
  if (!sentryEnabled) {
    return (err, req, res, next) => next(err);
  }
  return Sentry.Handlers.errorHandler();
};

const captureException = (err, context = {}) => {
  if (!sentryEnabled) return;
  Sentry.captureException(err, { extra: context });
};

const isSentryEnabled = () => sentryEnabled;

module.exports = {
  initErrorTracking,
  sentryErrorHandler,
  captureException,
  isSentryEnabled,
};
