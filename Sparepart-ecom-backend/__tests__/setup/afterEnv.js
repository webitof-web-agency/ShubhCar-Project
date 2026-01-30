// Global Jest hooks for consistent behavior across suites.
jest.setTimeout(30000);

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});
