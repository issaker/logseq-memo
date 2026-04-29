import '@testing-library/jest-dom';

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

(global as any).logseq = {
  api: {
    datascript_query: jest.fn(() => Promise.resolve({ data: [] })),
    get_block: jest.fn(() => Promise.resolve(null)),
    get_page: jest.fn(() => Promise.resolve(null)),
  },
  App: {
    registerUIItem: jest.fn(),
    registerCommand: jest.fn(),
    showMsg: jest.fn(),
  },
  Editor: {
    insertBlock: jest.fn(() => Promise.resolve({ uuid: 'test-block-uuid' })),
    updateBlock: jest.fn(() => Promise.resolve()),
    removeBlock: jest.fn(() => Promise.resolve()),
    getBlock: jest.fn(() => Promise.resolve(null)),
  },
  settings: {},
  updateSettings: jest.fn(),
  ready: jest.fn((fn: () => void) => fn()),
};

beforeAll(() => {
  // Since we don't have control over the version of react installed on roam
  // let's just supress these warnings
  console.error = (...args) => {
    if (/Invalid prop/.test(args.toString())) {
      return;
    }
    originalConsoleError(...args);
  };
  console.warn = (...args) => {
    if (/componentWillUpdate has been renamed/.test(args.toString())) {
      return;
    }
    originalConsoleWarn(...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});
