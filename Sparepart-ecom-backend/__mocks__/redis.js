const EventEmitter = require('events');

/**
 * Lightweight Redis client mock so tests do not open real sockets.
 * Provides minimal API surface used by config/redis.js.
 */
function createClient() {
  const emitter = new EventEmitter();
  const store = new Map();

  return {
    isOpen: true,
    on: emitter.on.bind(emitter),
    connect: jest.fn().mockResolvedValue(true),
    quit: jest.fn().mockResolvedValue(true),
    ping: jest.fn().mockResolvedValue('PONG'),
    get: jest.fn((key) => Promise.resolve(store.get(key) || null)),
    set: jest.fn((key, value) => {
      store.set(key, typeof value === 'object' ? JSON.stringify(value) : value);
      return Promise.resolve('OK');
    }),
    del: jest.fn((key) => {
      const existed = store.delete(key);
      return Promise.resolve(existed ? 1 : 0);
    }),
  };
}

module.exports = { createClient };
