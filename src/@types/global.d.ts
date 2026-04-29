interface LogseqSettings {
  [key: string]: any;
}

interface LogseqBlock {
  uuid: string;
  format?: string;
  content?: string;
  properties?: Record<string, any>;
  page?: { uuid: string; name?: string };
  parent?: { uuid: string };
  children?: LogseqBlock[];
  left?: LogseqBlock;
  right?: LogseqBlock;
}

interface LogseqPage {
  uuid: string;
  name?: string;
  'original-name'?: string;
}

interface LogseqAPI {
  get_block: (uuid: string) => Promise<LogseqBlock | null>;
  get_page: (pageName: string) => Promise<LogseqPage | null>;
  update_block: (uuid: string, content: string, properties?: Record<string, any>) => Promise<void>;
  insert_block: (
    parentUuid: string,
    content: string,
    options?: { sibling?: boolean; before?: boolean; properties?: Record<string, any> }
  ) => Promise<LogseqBlock>;
  datascript_query: (query: string, ...params: any[]) => Promise<{ data: any[] }>;
  delete_block: (uuid: string) => Promise<void>;
  get_current_page: () => Promise<LogseqPage | null>;
  get_block_property: (uuid: string, key: string) => Promise<any>;
  set_block_property: (uuid: string, key: string, value: any) => Promise<void>;
  remove_block_property: (uuid: string, key: string) => Promise<void>;
}

interface LogseqApp {
  registerUIItem: (
    type: string,
    options: { key: string; title: string; icon: string; template: string }
  ) => void;
  registerCommand: (key: string, options: { key: string; label: string; desc?: string }, callback: () => void) => void;
  registerBlockCommand: (key: string, options: { key: string; label: string; desc?: string }, callback: () => void) => void;
  showMsg: (msg: string, type?: string) => void;
}

interface LogseqEditor {
  getBlock: (uuid: string) => Promise<LogseqBlock | null>;
  insertBlock: (
    parentUuid: string,
    content: string,
    options?: { sibling?: boolean; before?: boolean; properties?: Record<string, any> }
  ) => Promise<LogseqBlock>;
  updateBlock: (uuid: string, content: string, properties?: Record<string, any>) => Promise<void>;
  removeBlock: (uuid: string) => Promise<void>;
  getEditingBlockContent: () => Promise<string>;
  restoreEditingBlockContent: (content: string) => Promise<void>;
}

interface LogseqPlugin {
  ready: (fn: () => void) => void;
  App: LogseqApp;
  Editor: LogseqEditor;
  api: LogseqAPI;
  settings: Record<string, any>;
  updateSettings: (partial: Record<string, any>) => void;
  useSettingsSchema: (schema: any[]) => void;
}

declare const logseq: LogseqPlugin;

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
