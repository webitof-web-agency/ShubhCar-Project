const mongoose = require('mongoose');
const env = require('./env');
const logger = require('./logger');

const connectMongo = async () => {
  mongoose.set('strictQuery', true);
  const slowQueryThreshold = Number(env.SLOW_QUERY_THRESHOLD_MS || 500) || 500;

  mongoose.plugin((schema) => {
    const trackedOps = [
      'count',
      'countDocuments',
      'find',
      'findOne',
      'updateOne',
      'updateMany',
      'deleteOne',
      'deleteMany',
    ];

    trackedOps.forEach((op) => {
      schema.pre(op, function trackStart() {
        this._metricsStart = Date.now();
      });
      schema.post(op, function logDuration() {
        const duration = Date.now() - (this._metricsStart || Date.now());
        if (duration >= slowQueryThreshold) {
          logger.warn('Slow MongoDB operation', {
            model: this.model?.modelName,
            op,
            durationMs: duration,
            query: this.getQuery ? this.getQuery() : undefined,
          });
        }
      });
    });

    schema.pre('aggregate', function trackAggregateStart() {
      this._metricsStart = Date.now();
    });
    schema.post('aggregate', function logAggregateDuration() {
      const duration = Date.now() - (this._metricsStart || Date.now());
      if (duration >= slowQueryThreshold) {
        logger.warn('Slow MongoDB aggregation', {
          model: this.model?.modelName,
          durationMs: duration,
          pipeline: this.pipeline?.(),
        });
      }
    });
  });

  const useReplica = env.NODE_ENV !== 'development';
  const mongoUri = useReplica ? env.MONGO_REPLICA_URI : env.MONGO_URI;

  mongoose.connection.on('connected', () => {
    logger.info('dYY› MongoDB connected');
  });

  mongoose.connection.on('error', (err) => logger.error('Mongo error', err));
  mongoose.connection.on('disconnected', () =>
    logger.warn('Mongo disconnected'),
  );

  const connectWithRetry = async (retries = 5) => {
    try {
      logger.info(`Connecting to MongoDB at ${mongoUri.replace(/:([^:@]{1,})@/, ':****@')}`);
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000, // Prevent indefinite hangs
      });
      logger.info('MongoDB connected');
      ensureReplicaIfRequired();
    } catch (err) {
      logger.warn(`Mongo retrying... attempts left: ${retries - 1}`);
      if (retries <= 1) {
        throw new Error('MongoDB connection failed after all retry attempts');
      }
      setTimeout(() => connectWithRetry(retries - 1), 3000);
    }
  };

  const ensureReplicaIfRequired = () => {
    if (!env.MONGO_REQUIRE_REPLICA) return;

    const topology = mongoose.connection.client?.topology;
    const type = topology?.description?.type;

    if (type !== 'ReplicaSetWithPrimary') {
      logger.error('Mongo connected but not replica set');
    }
  };

  await connectWithRetry();
};

const disconnectMongo = async () => {
  await mongoose.connection.close();
};

module.exports = { connectMongo, disconnectMongo };
