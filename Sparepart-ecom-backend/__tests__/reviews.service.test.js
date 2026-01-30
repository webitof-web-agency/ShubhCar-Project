const reviewsService = require('../modules/reviews/reviews.service');

jest.mock('../modules/reviews/reviews.repo', () => ({
  findByProduct: jest.fn(),
  findByUserProduct: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  getAggregate: jest.fn(),
}));

const repo = require('../modules/reviews/reviews.repo');

describe('ReviewsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates review when none exists', async () => {
    repo.findByUserProduct.mockResolvedValue(null);
    const created = { _id: '1', productId: 'p1' };
    repo.create.mockResolvedValue(created);

    const res = await reviewsService.create({
      user: { id: 'u1' },
      payload: { productId: 'p1', rating: 5 },
    });

    expect(repo.findByUserProduct).toHaveBeenCalledWith('u1', 'p1');
    expect(res).toEqual(created);
  });

  test('rejects duplicate review by same user', async () => {
    repo.findByUserProduct.mockResolvedValue({ _id: 'existing' });
    await expect(
      reviewsService.create({
        user: { id: 'u1' },
        payload: { productId: 'p1', rating: 4 },
      }),
    ).rejects.toThrow('You have already reviewed this product');
  });

  test('forbids update by non-owner', async () => {
    repo.findById.mockResolvedValue({ _id: 'r1', userId: 'other' });
    await expect(
      reviewsService.update({
        user: { id: 'u1', role: 'customer' },
        reviewId: 'r1',
        payload: { rating: 3 },
      }),
    ).rejects.toThrow('Forbidden');
  });

  test('aggregate ratings returns defaults', async () => {
    repo.getAggregate.mockResolvedValue([]);
    const agg = await reviewsService.getAggregate('p1');
    expect(agg).toEqual({ averageRating: 0, reviewCount: 0 });
  });

  test('aggregate ratings returns computed values', async () => {
    repo.getAggregate.mockResolvedValue([{ avgRating: 4.25, count: 8 }]);
    const agg = await reviewsService.getAggregate('p1');
    expect(agg).toEqual({ averageRating: 4.25, reviewCount: 8 });
  });
});
