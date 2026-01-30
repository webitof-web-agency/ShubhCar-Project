const Cart = require('../../models/Cart.model');
const CartItem = require('../../models/CartItem.model');

class CartRepository {
  async getOrCreateCart({ userId, sessionId }) {
    // Fix: Find by userId if available, regardless of sessionId mismatch
    // This solves the issue where finding by {userId, sessionId} fails if the stored sessionId differs
    const query = userId ? { userId } : { sessionId };

    let cart = await Cart.findOne(query).lean();
    if (cart) return cart;

    try {
      cart = await Cart.create({
        userId: userId || undefined,
        sessionId: userId ? undefined : sessionId
      });
    } catch (error) {
      // Handle duplicate key error (race condition)
      if (error.code === 11000) {
        cart = await Cart.findOne(query).lean();
        if (cart) return cart;
      }
      throw error;
    }

    return cart.toObject ? cart.toObject() : cart;
  }

  async addItem({ cartId, item }) {
    const payload = { ...item, cartId };
    return CartItem.findOneAndUpdate(
      { cartId, productId: item.productId },
      payload,
      { upsert: true, new: true },
    ).lean();
  }

  async updateQty({ cartId, itemId, quantity, priceAtTime }) {
    const update = { quantity };
    if (priceAtTime != null) update.priceAtTime = priceAtTime;
    return CartItem.findOneAndUpdate(
      { _id: itemId, cartId },
      update,
      { new: true },
    ).lean();
  }

  async removeItem({ cartId, itemId }) {
    return CartItem.findOneAndDelete({ _id: itemId, cartId });
  }

  async getItemById({ cartId, itemId }) {
    return CartItem.findOne({ _id: itemId, cartId }).lean();
  }

  async getCartWithItems(cartId) {
    const items = await CartItem.find({ cartId }).lean();
    return items;
  }
}

module.exports = new CartRepository();
