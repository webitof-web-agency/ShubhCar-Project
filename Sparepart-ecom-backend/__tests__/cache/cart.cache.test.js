/**
 * Cart cache must read/write consistently and clear by user/session without leaking.
 */
jest.mock('../setup/env.setup'); // ensure env loaded before redis mock
jest.mock('../../config/redis', () => ({
  redis: {
    store: new Map(),
    get: jest.fn(function (key) {
      return Promise.resolve(this.store.get(key) || null);
    }),
    set: jest.fn(function (key, value) {
      this.store.set(key, value);
      return Promise.resolve('OK');
    }),
    del: jest.fn(function (key) {
      this.store.delete(key);
      return Promise.resolve(1);
    }),
  },
}));

const cartCache = require('../../modules/cart/cart.cache');

describe('Cart cache', () => {
  beforeEach(() => {
    cartCache.clear({ userId: 'u1' });
    cartCache.clear({ sessionId: 's1' });
  });

  it('persists and retrieves cart by user id', async () => {
    await cartCache.set({ userId: 'u1' }, { items: [{ id: 'i1' }] });
    const cached = await cartCache.get({ userId: 'u1' });
    expect(cached).toEqual({ items: [{ id: 'i1' }] });
  });

  it('uses session fallback when no user and clears correctly', async () => {
    await cartCache.set({ sessionId: 's1' }, { items: [{ id: 'i2' }] });
    const cached = await cartCache.get({ sessionId: 's1' });
    expect(cached.items).toHaveLength(1);

    await cartCache.clear({ sessionId: 's1' });
    const empty = await cartCache.get({ sessionId: 's1' });
    expect(empty).toBeNull();
  });

  it('getCart helper returns item map when items array provided', async () => {
    await cartCache.saveCart('u1', null, { items: [{ _id: 'v1', qty: 2 }] });
    const { items } = await cartCache.getCart('u1', null);
    expect(items.v1.qty).toBe(2);
  });
});
