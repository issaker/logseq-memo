import {
  getPluginPageBlockDataQuery,
  getPluginPageData,
} from '~/queries/data';
import roamAdapter from '~/queries/roamAdapter';

describe('adapter smoke test', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('adapter q returns transformed data', async () => {
    (logseq.api.datascript_query as jest.Mock).mockResolvedValueOnce({
      data: [[{ uid: 'data-block', string: 'data', order: 0, children: [{ uid: 'card-1', string: '((card-1))', children: [] }] }]]
    });

    const result = await roamAdapter.q('[:find (pull ?x [:block/uid :block/string]) :where [?x :block/uid "test"]]');
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('adapter strips namespace and maps keys to Roam format', async () => {
    (logseq.api.datascript_query as jest.Mock).mockResolvedValueOnce({
      data: [[{ ':block/uuid': 'abc', ':block/content': 'hello' }]]
    });

    const result = await roamAdapter.q('[:find ?uid ?s :where [?b :block/uid ?uid]]');
    expect(result[0][0].uid).toBe('abc');
    expect(result[0][0].string).toBe('hello');
  });
});

describe('getPluginPageData', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockQueryResultWithChildren = (children: any[]) => {
    (logseq.api.datascript_query as jest.Mock).mockResolvedValueOnce({
      data: [[{ uid: 'data-block', string: 'data', order: 0, children }]]
    });
  };

  it('reads all fields from the latest session block', async () => {
    mockQueryResultWithChildren([
      {
        uid: 'card-1-block',
        string: '((card-1))',
        order: 0,
        children: [
          {
            uid: 'session-1',
            string: '[[April 14th, 2026]] 🟢',
            order: 0,
            children: [
              { uid: 'f1', string: 'algorithm:: SM2', order: 0 },
              { uid: 'f2', string: 'interaction:: NORMAL', order: 1 },
              { uid: 'f3', string: 'nextDueDate:: [[April 20th, 2026]]', order: 2 },
            ],
          },
        ],
      },
    ]);

    const result = await getPluginPageData({
      dataPageTitle: 'logseq-memo/data',
      limitToLatest: true,
    });

    expect(result['card-1']).toMatchObject({
      algorithm: 'SM2',
      interaction: 'NORMAL',
    });
  });

  it('reads algorithm and interaction from latest session block', async () => {
    mockQueryResultWithChildren([
      {
        uid: 'card-spaced-block',
        string: '((card-spaced))',
        order: 0,
        children: [
          {
            uid: 'session-1',
            string: '[[April 14th, 2026]] 🟢',
            order: 0,
            children: [
              { uid: 'f1', string: 'algorithm:: SM2', order: 0 },
              { uid: 'f2', string: 'interaction:: NORMAL', order: 1 },
              { uid: 'f3', string: 'sm2_repetitions:: 3', order: 2 },
              { uid: 'f4', string: 'sm2_interval:: 12', order: 3 },
              { uid: 'f5', string: 'sm2_eFactor:: 2.4', order: 4 },
              { uid: 'f6', string: 'nextDueDate:: [[April 20th, 2026]]', order: 5 },
            ],
          },
        ],
      },
    ]);

    const result = await getPluginPageData({
      dataPageTitle: 'logseq-memo/data',
      limitToLatest: true,
    });

    expect(result['card-spaced']).toMatchObject({
      algorithm: 'SM2',
      interaction: 'NORMAL',
      sm2_repetitions: 3,
      sm2_interval: 12,
      sm2_eFactor: 2.4,
    });
  });

  it('reads only the latest session block fields without merging from older sessions', async () => {
    mockQueryResultWithChildren([
      {
        uid: 'card-switching-block',
        string: '((card-switching))',
        order: 0,
        children: [
          {
            uid: 'session-old',
            string: '[[April 12th, 2026]] 🟢',
            order: 1,
            children: [
              { uid: 'f1', string: 'algorithm:: SM2', order: 0 },
              { uid: 'f2', string: 'interaction:: NORMAL', order: 1 },
              { uid: 'f3', string: 'sm2_repetitions:: 3', order: 2 },
              { uid: 'f4', string: 'sm2_interval:: 12', order: 3 },
              { uid: 'f5', string: 'sm2_eFactor:: 2.4', order: 4 },
            ],
          },
          {
            uid: 'session-new',
            string: '[[April 14th, 2026]] 🟢',
            order: 0,
            children: [
              { uid: 'f6', string: 'algorithm:: PROGRESSIVE', order: 0 },
              { uid: 'f7', string: 'interaction:: NORMAL', order: 1 },
              { uid: 'f8', string: 'progressive_repetitions:: 1', order: 2 },
              { uid: 'f9', string: 'progressive_interval:: 6', order: 3 },
              { uid: 'f10', string: 'nextDueDate:: [[April 20th, 2026]]', order: 4 },
            ],
          },
        ],
      },
    ]);

    const result = await getPluginPageData({
      dataPageTitle: 'logseq-memo/data',
      limitToLatest: true,
    });

    expect(result['card-switching']).toMatchObject({
      algorithm: 'PROGRESSIVE',
      interaction: 'NORMAL',
      progressive_repetitions: 1,
      progressive_interval: 6,
    });
  });

  it('merges sparse historical sessions into complete snapshots for migration reads', async () => {
    mockQueryResultWithChildren([
      {
        uid: 'card-switching-block',
        string: '((card-switching))',
        order: 0,
        children: [
          {
            uid: 'session-1',
            string: '[[April 12th, 2026]] 🔴',
            order: 2,
            children: [
              { uid: 'f1', string: 'algorithm:: SM2', order: 0 },
              { uid: 'f2', string: 'interaction:: NORMAL', order: 1 },
              { uid: 'f3', string: 'sm2_repetitions:: 3', order: 2 },
              { uid: 'f4', string: 'sm2_interval:: 12', order: 3 },
              { uid: 'f5', string: 'sm2_eFactor:: 2.4', order: 4 },
              { uid: 'f6', string: 'sm2_grade:: 4', order: 5 },
            ],
          },
          {
            uid: 'session-2',
            string: '[[April 13th, 2026]] 🔴',
            order: 1,
            children: [
              { uid: 'f7', string: 'algorithm:: FIXED_TIME', order: 0 },
              { uid: 'f8', string: 'interaction:: LBL', order: 1 },
              { uid: 'f9', string: 'fixed_multiplier:: 5', order: 2 },
              { uid: 'f10', string: 'fixed_unit:: weeks', order: 3 },
            ],
          },
          {
            uid: 'session-3',
            string: '[[April 14th, 2026]] 🟢',
            order: 0,
            children: [
              { uid: 'f11', string: 'algorithm:: PROGRESSIVE', order: 0 },
              { uid: 'f12', string: 'progressive_repetitions:: 1', order: 1 },
              { uid: 'f13', string: 'progressive_interval:: 6', order: 2 },
              { uid: 'f14', string: 'nextDueDate:: [[April 20th, 2026]]', order: 3 },
            ],
          },
        ],
      },
    ]);

    const result = await getPluginPageData({
      dataPageTitle: 'logseq-memo/data',
      limitToLatest: false,
    });

    expect(result['card-switching'][2]).toMatchObject({
      algorithm: 'PROGRESSIVE',
      interaction: 'LBL',
      progressive_repetitions: 1,
      progressive_interval: 6,
      sm2_repetitions: 3,
      sm2_interval: 12,
      sm2_eFactor: 2.4,
      sm2_grade: 4,
      fixed_multiplier: 5,
      fixed_unit: 'weeks',
    });
  });

  it('defaults algorithm to PROGRESSIVE and interaction to NORMAL when session block has none', async () => {
    mockQueryResultWithChildren([
      {
        uid: 'card-fixed-block',
        string: '((card-fixed))',
        order: 0,
        children: [
          {
            uid: 'session-1',
            string: '[[April 14th, 2026]] 🟢',
            order: 0,
            children: [
              { uid: 'f1', string: 'nextDueDate:: [[April 20th, 2026]]', order: 0 },
            ],
          },
        ],
      },
    ]);

    const result = await getPluginPageData({
      dataPageTitle: 'logseq-memo/data',
      limitToLatest: true,
    });

    expect(result['card-fixed']).toMatchObject({
      dateCreated: new Date('2026-04-14T00:00:00.000Z'),
      nextDueDate: new Date('2026-04-20T00:00:00.000Z'),
      algorithm: 'PROGRESSIVE',
      interaction: 'NORMAL',
    });
  });
});
