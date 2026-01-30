jest.mock('../../modules/notifications/notifications.repo', () => ({
  create: jest.fn(),
  list: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  markRead: jest.fn(),
  markAllRead: jest.fn(),
  countUnread: jest.fn(),
}));

jest.mock('../../cache/notification.cache', () => ({
  key: { user: jest.fn((userId, audience) => `notif:user:${userId}:${audience}`) },
  get: jest.fn(),
  set: jest.fn(),
  clearUser: jest.fn(),
}));

const service = require('../../modules/notifications/notifications.service');
const repo = require('../../modules/notifications/notifications.repo');
const notificationCache = require('../../cache/notification.cache');
const { AppError } = require('../../utils/apiResponse');

describe('NotificationsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses cache for user list and scopes by role', async () => {
    notificationCache.get.mockResolvedValue([{ id: 1 }]);
    const result = await service.list({
      user: { id: 'user1', role: 'user' },
      filter: {},
    });
    expect(notificationCache.key.user).toHaveBeenCalledWith('user1', 'user');
    expect(result).toEqual([{ id: 1 }]);
    expect(repo.list).not.toHaveBeenCalled();
  });

  it('marks all as read for vendor and clears cache', async () => {
    repo.markAllRead.mockResolvedValue({ modifiedCount: 2 });
    const resp = await service.markAllRead(
      { id: 'user1', role: 'vendor' },
      { audience: 'vendor' },
    );
    expect(repo.markAllRead).toHaveBeenCalledWith({
      $or: [
        { audience: 'user', userId: 'user1' },
        { audience: 'vendor', userId: 'user1' },
      ],
      audience: 'vendor',
    });
    expect(notificationCache.clearUser).toHaveBeenCalledWith('user1');
    expect(resp).toEqual({ updated: true });
  });

  it('rejects invalid audience selection for regular users', async () => {
    await expect(
      service.markAllRead({ id: 'user1', role: 'user' }, { audience: 'vendor' }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('marks single notification read and clears cache', async () => {
    repo.findById.mockResolvedValue({
      _id: 'notif1',
      userId: 'user1',
      audience: 'user',
    });
    repo.markRead.mockResolvedValue({ _id: 'notif1', status: 'read' });
    const resp = await service.markRead('notif1', { id: 'user1', role: 'user' });
    expect(repo.markRead).toHaveBeenCalledWith('notif1');
    expect(notificationCache.clearUser).toHaveBeenCalledWith('user1');
    expect(resp.status).toBe('read');
  });

  it('rejects create without userId for non-admin audiences', async () => {
    await expect(
      service.create({
        audience: 'user',
        type: 'inapp',
        title: 't',
        message: 'm',
        metadata: {},
      }),
    ).rejects.toBeInstanceOf(AppError);
  });
});
