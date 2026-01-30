const wishlistService = require('../modules/wishlist/wishlist.service');

jest.mock('../modules/wishlist/wishlist.repo', () => ({
  findByUser: jest.fn(),
  findOne: jest.fn(),
  add: jest.fn(),
  remove: jest.fn(),
}));

const repo = require('../modules/wishlist/wishlist.repo');

describe('WishlistService', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns existing item on add', async () => {
    const existing = { _id: '1', productId: 'p1' };
    repo.findOne.mockResolvedValue(existing);

    const res = await wishlistService.add('u1', 'p1');
    expect(repo.findOne).toHaveBeenCalledWith('u1', 'p1');
    expect(res).toEqual(existing);
    expect(repo.add).not.toHaveBeenCalled();
  });

  test('adds new wishlist item', async () => {
    repo.findOne.mockResolvedValue(null);
    const created = { _id: '2', productId: 'p2' };
    repo.add.mockResolvedValue(created);

    const res = await wishlistService.add('u1', 'p2');
    expect(repo.add).toHaveBeenCalledWith('u1', 'p2');
    expect(res).toEqual(created);
  });

  test('remove throws when not found', async () => {
    repo.remove.mockResolvedValue(null);
    await expect(wishlistService.remove('u1', 'p1')).rejects.toThrow(
      'Wishlist item not found',
    );
  });
});
