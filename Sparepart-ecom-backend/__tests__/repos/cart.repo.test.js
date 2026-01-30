/**
 * Cart repo integration tests ensure uniqueness per user/session and item upserts.
 */
const mongoose = require('mongoose');
const cartRepo = require('../../modules/cart/cart.repo');
const Cart = require('../../models/Cart.model');
const CartItem = require('../../models/CartItem.model');
const { connectTestDB, clearDatabase, disconnectTestDB } = require('../helpers/mongo');

describe('CartRepository', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  it('creates or reuses cart for same user or session', async () => {
    const userId = new mongoose.Types.ObjectId();
    const first = await cartRepo.getOrCreateCart({ userId });
    const second = await cartRepo.getOrCreateCart({ userId });
    expect(first._id.toString()).toBe(second._id.toString());

    const sessionCart = await cartRepo.getOrCreateCart({ sessionId: 'sess-1' });
    const sessionCartAgain = await cartRepo.getOrCreateCart({ sessionId: 'sess-1' });
    expect(sessionCart._id.toString()).toBe(sessionCartAgain._id.toString());
  });

  it('upserts cart items and updates quantity', async () => {
    const cart = await Cart.create({ sessionId: 's1' });
    await cartRepo.addItem({
      cartId: cart._id,
      item: {
        productVariantId: new mongoose.Types.ObjectId(),
        sku: 'SKU1',
        quantity: 1,
        priceType: 'retail',
        priceAtTime: 100,
      },
    });

    // upsert same variant should update quantity
    const item = await cartRepo.addItem({
      cartId: cart._id,
      item: {
        productVariantId: new mongoose.Types.ObjectId('64b000000000000000000001'),
        sku: 'SKU1',
        quantity: 2,
        priceType: 'retail',
        priceAtTime: 100,
      },
    });

    await cartRepo.updateQty({ cartId: cart._id, itemId: item._id, quantity: 5 });
    const updated = await CartItem.findById(item._id).lean();
    expect(updated.quantity).toBe(5);
  });

  it('removes items and fetches by id/with items', async () => {
    const cart = await Cart.create({ userId: new mongoose.Types.ObjectId() });
    const item = await CartItem.create({
      cartId: cart._id,
      productVariantId: new mongoose.Types.ObjectId(),
      sku: 'SKU2',
      quantity: 1,
      priceType: 'retail',
      priceAtTime: 50,
    });

    const found = await cartRepo.getItemById({ cartId: cart._id, itemId: item._id });
    expect(found.sku).toBe('SKU2');

    const list = await cartRepo.getCartWithItems(cart._id);
    expect(list).toHaveLength(1);

    await cartRepo.removeItem({ cartId: cart._id, itemId: item._id });
    const empty = await cartRepo.getCartWithItems(cart._id);
    expect(empty).toHaveLength(0);
  });
});
