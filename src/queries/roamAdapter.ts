/**
 * Roam alphaAPI → Logseq API Adapter
 *
 * Provides the same interface as window.roamAlphaAPI, implemented via Logseq's
 * plugin API. This allows existing code to continue working with minimal
 * changes — just replace `window.roamAlphaAPI` with `roamAdapter`.
 *
 * Data storage strategy (same as Roam):
 *   Child blocks store field data as `key:: value` strings (not Logseq properties),
 *   so the existing parsing logic (parseFieldValuesFromChildren, etc.) works
 *   unchanged. The adapter translates the raw API operations.
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const getOrdinalSuffix = (day: number): string => {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

/**
 * Convert a JS Date to Roam's page title format: "April 30th, 2026"
 * This matches the format used throughout the existing codebase.
 */
const dateToPageTitle = (jsDateObject: Date): string => {
  const month = MONTH_NAMES[jsDateObject.getMonth()];
  const day = jsDateObject.getDate();
  const year = jsDateObject.getFullYear();
  return `${month} ${day}${getOrdinalSuffix(day)}, ${year}`;
};

/**
 * Parse a Roam date string back to a JS Date.
 * Handles formats like "April 30th, 2026" and "April 30, 2026".
 */
const pageTitleToDate = (roamDateString: string): Date => {
  const cleaned = roamDateString.replace(/(\d+)(st|nd|rd|th)/, '$1');
  return new Date(cleaned);
};

/**
 * Ensure a page exists by looking it up or creating it via a block reference.
 * Returns the page UUID if found/created, null otherwise.
 */
let _creatingPage = false;

const ensureAndGetPageUuid = async (title: string): Promise<string | null> => {
  const page = await logseq.api.get_page(title);
  if (page) return page.uuid;

  if (_creatingPage) return null;
  _creatingPage = true;

  try {
    const block = await logseq.Editor.insertBlock(
      title,
      `[[${title}]]`,
      { sibling: false, before: false }
    );
    if (block) {
      await logseq.Editor.removeBlock(block.uuid);
      const newPage = await logseq.api.get_page(title);
      return newPage?.uuid || null;
    }
  } catch {
    return null;
  } finally {
    _creatingPage = false;
  }
  return null;
};

/**
 * Schema mapping: translate Roam datalog attributes to Logseq equivalents.
 *   :block/uid    ← :block/uuid
 *   :block/string ← :block/content
 *   :block/parents← :block/parent
 *   :node/title   ← :block/name
 */
const roamToLogseqQuery = (query: string): string => {
  return query
    .replace(/:block\/uid\b(?!\()/g, ':block/uuid')
    .replace(/:block\/string\b(?!\()/g, ':block/content')
    .replace(/:block\/parents\b(?!\()/g, ':block/parent')
    .replace(/:node\/title\b(?!\()/g, ':block/name');
};

const roamKeyMapping: Record<string, string> = {
  uuid: 'uid',
  content: 'string',
  'original-name': 'title',
};

const stripNamespace = (key: string): string => {
  if (key.startsWith(':block/')) return key.slice(7);
  if (key.startsWith(':node/')) return key.slice(6);
  return key;
};

const transformResultValue = (value: any): any => {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(transformResultValue);
  if (typeof value === 'object') {
    const transformed: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      const nsStripped = stripNamespace(k);
      const roamKey = roamKeyMapping[nsStripped] || nsStripped;
      transformed[roamKey] = transformResultValue(v);
    }
    return transformed;
  }
  return value;
};

const q = async (query: string, ...params: any[]): Promise<any[]> => {
  const adaptedQuery = roamToLogseqQuery(query);
  try {
    const result = await logseq.api.datascript_query(adaptedQuery, ...params);
    const data = result?.data || [];
    return data.map(transformResultValue);
  } catch (err) {
    console.error('[roamAdapter.q] Query failed:', adaptedQuery, err);
    return [];
  }
};

const pull = async (query: string, id: string): Promise<any> => {
  if (id?.startsWith(':block/uid')) {
    const uuid = id.split(' ')[1]?.replace(/"/g, '');
    const block = await logseq.api.get_block(uuid);
    if (!block) return null;
    return {
      uid: block.uuid,
      string: block.content || '',
      parents: block.parent ? [{ uid: block.parent.uuid }] : [],
    };
  }

  const results = await q(query, id);
  return results[0]?.[0] || null;
};

const createBlock = async (opts: {
  location: { 'parent-uid': string; order: number };
  block: { string: string; uid?: string; open?: boolean };
}): Promise<void> => {
  const parentUuid = opts.location['parent-uid'];
  const content = opts.block.string;
  const properties: Record<string, any> = {};

  if (opts.block.open !== undefined) {
    properties.open = opts.block.open;
  }

  try {
    await logseq.Editor.insertBlock(parentUuid, content, {
      sibling: opts.location.order < 0,
      before: opts.location.order === 0,
      properties: Object.keys(properties).length > 0 ? properties : undefined,
    });
  } catch (err) {
    console.error('[roamAdapter.createBlock] Failed:', opts, err);
  }
};

const updateBlock = async (opts: {
  block: { uid: string; string?: string; open?: boolean };
}): Promise<void> => {
  try {
    if (opts.block.string !== undefined) {
      await logseq.Editor.updateBlock(opts.block.uid, opts.block.string);
    }
  } catch (err) {
    console.error('[roamAdapter.updateBlock] Failed:', opts, err);
  }
};

const deleteBlock = async (opts: {
  block: { uid: string };
}): Promise<void> => {
  try {
    await logseq.Editor.removeBlock(opts.block.uid);
  } catch (err) {
    console.error('[roamAdapter.deleteBlock] Failed:', opts, err);
  }
};

const generateUID = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const pageCreate = async (opts: {
  page: { title: string; uid?: string };
}): Promise<void> => {
  await ensureAndGetPageUuid(opts.page.title);
};

const getPageBlockTree = async (pageTitle: string): Promise<any[]> => {
  const query = `[
    :find (pull ?block [
      :block/uuid :block/content :block/order
      {:block/children ...}
    ])
    :in $ ?title
    :where
    [?page :block/name ?title]
    [?page :block/children ?block]
  ]`;

  try {
    const result = await logseq.api.datascript_query(query, pageTitle);
    return result?.data?.map((r: any) => transformResultValue(r[0])) || [];
  } catch {
    return [];
  }
};

const commandPaletteCommands: Map<string, () => void> = new Map();

const roamAdapter = {
  q,
  pull,
  createBlock,
  updateBlock,
  deleteBlock,
  generateUID,
  data: {
    page: {
      create: pageCreate,
    },
  },
  util: {
    generateUID,
    dateToPageTitle,
    pageTitleToDate,
  },
  ui: {
    commandPalette: {
      addCommand: ({ label, callback }: { label: string; callback: () => void }) => {
        commandPaletteCommands.set(label, callback);
        logseq.App.registerCommand('logseq-memo', {
          key: `logseq-memo-${label}`,
          label,
        }, callback);
      },
      removeCommand: ({ label }: { label: string }) => {
        commandPaletteCommands.delete(label);
      },
    },
    components: {
      unmountNode: async (_opts: { el: HTMLElement }) => {
      },
      renderBlock: async (_opts: { uid: string; el: HTMLElement }) => {
      },
    },
  },
  getPageBlockTree,
};

export default roamAdapter;
