const auditService = require('../modules/audit/audit.service');
const logger = require('../config/logger');

jest.mock('../config/logger', () => ({
  info: jest.fn(),
}));

describe('AuditService.log', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('logs structured audit event with defaults', () => {
    const payload = {
      actor: { type: 'user', id: 'u1' },
      action: 'LOGIN',
      target: { type: 'session', id: 's1' },
    };

    auditService.log(payload);

    expect(logger.info).toHaveBeenCalledTimes(1);
    const [message, meta] = logger.info.mock.calls[0];
    expect(message).toBe('AUDIT');
    expect(meta).toMatchObject({
      actor: payload.actor,
      action: payload.action,
      target: payload.target,
      meta: {},
    });
    expect(meta.timestamp).toEqual(expect.any(String));
  });

  test('includes provided meta', () => {
    const payload = {
      actor: { type: 'system' },
      action: 'ORDER_CANCELLED',
      target: { type: 'order', id: 'ord_123' },
      meta: { reason: 'payment_failed' },
    };

    auditService.log(payload);

    const meta = logger.info.mock.calls[0][1];
    expect(meta.meta).toEqual({ reason: 'payment_failed' });
  });
});
