import React from 'react';
import { loadSettingsFromPage, saveSettingsToPage } from '~/queries/settings';

export type DeckConfig = { name: string; swapQA: boolean; weight: number };

export type Settings = {
  deckConfigs: string;
  dataPageTitle: string;
  dailyLimit: number;
  historyCleanupKeepCount: number;
  rtlEnabled: boolean;
  shuffleCards: boolean;
  forgotReinsertOffset: number;
  lblNextReinsertOffset: number;
  showBreadcrumbs: boolean;
  showModeBorders: boolean;
  dailynoteEnabled: boolean;
  autoCollapseBlocks: boolean;
};

export const defaultSettings: Settings = {
  deckConfigs:
    '[{"name":"memo","swapQA":false,"weight":50},{"name":"DailyNote","swapQA":false,"weight":50}]',
  dataPageTitle: 'logseq-memo/data',
  dailyLimit: 0,
  historyCleanupKeepCount: 3,
  rtlEnabled: false,
  shuffleCards: false,
  forgotReinsertOffset: 3,
  lblNextReinsertOffset: 0,
  showBreadcrumbs: false,
  showModeBorders: true,
  dailynoteEnabled: true,
  autoCollapseBlocks: true,
};

const SETTING_TYPES = {
  deckConfigs: 'string',
  dailyLimit: 'number',
  historyCleanupKeepCount: 'number',
  rtlEnabled: 'boolean',
  shuffleCards: 'boolean',
  forgotReinsertOffset: 'number',
  lblNextReinsertOffset: 'number',
  showBreadcrumbs: 'boolean',
  showModeBorders: 'boolean',
  dailynoteEnabled: 'boolean',
  autoCollapseBlocks: 'boolean',
} as const;

const SETTING_KEYS = Object.keys(defaultSettings) as (keyof Settings)[];

const coerceSettingValue = (key: string, value: any): any => {
  const type = SETTING_TYPES[key];
  if (type === 'number') return Number(value);
  if (type === 'boolean') return value === true || value === 'true';
  return value;
};

const coerceAllSettings = (allSettings: Record<string, any>): Record<string, any> => {
  return Object.keys(allSettings).reduce((acc, key) => {
    acc[key] = coerceSettingValue(key, allSettings[key]);
    return acc;
  }, {});
};

const readSettingsFromLogseq = (): Partial<Settings> => {
  const result: Partial<Settings> = {};
  for (const key of SETTING_KEYS) {
    const val = logseq.settings[key];
    if (val !== undefined) {
      result[key] = coerceSettingValue(key, val);
    }
  }
  return result;
};

const writeSettingToLogseq = (key: string, value: any) => {
  logseq.updateSettings({ [key]: value });
};

const PAGE_SYNC_DEBOUNCE_MS = 5000;

const useSettings = () => {
  const [settings, setSettings] = React.useState(() => ({
    ...defaultSettings,
    ...readSettingsFromLogseq(),
  }));
  const pageSyncTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const pendingPageSyncRef = React.useRef<Settings | null>(null);
  const hasInitializedRef = React.useRef(false);

  const syncPageToLogseq = React.useCallback(async (dataPageTitle: string) => {
    const pageSettings = await loadSettingsFromPage(dataPageTitle);
    if (!pageSettings) return false;

    for (const [key, value] of Object.entries(pageSettings)) {
      writeSettingToLogseq(key, value);
    }
    return true;
  }, []);

  const ensureAllDefaults = React.useCallback(() => {
    let needsUpdate = false;
    for (const key of SETTING_KEYS) {
      if (logseq.settings[key] === undefined) {
        writeSettingToLogseq(key, defaultSettings[key]);
        needsUpdate = true;
      }
    }
    return needsUpdate;
  }, []);

  const syncSettingsFromLogseq = React.useCallback(() => {
    ensureAllDefaults();
    const logseqSettings = readSettingsFromLogseq();
    const allSettings = coerceAllSettings(logseqSettings);
    setSettings((currentSettings) => ({ ...currentSettings, ...allSettings }));
  }, [setSettings, ensureAllDefaults]);

  React.useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const initialize = async () => {
      try {
        const hasExistingSettings = SETTING_KEYS.some((key) => logseq.settings[key] !== undefined);

        if (!hasExistingSettings) {
          const loaded = await syncPageToLogseq(defaultSettings.dataPageTitle);
          if (!loaded) {
            ensureAllDefaults();
          }
        } else {
          ensureAllDefaults();
        }

        syncSettingsFromLogseq();
      } catch (err) {
        console.error('Memo: Failed to initialize settings', err);
      }
    };

    initialize();
  }, [syncSettingsFromLogseq, syncPageToLogseq, ensureAllDefaults]);

  const flushPageSync = React.useCallback(async (settingsToSave: Settings) => {
    try {
      await saveSettingsToPage(settingsToSave.dataPageTitle, settingsToSave);
    } catch (err) {
      console.error('Memo: Failed to sync settings to page', err);
    }
  }, []);

  const schedulePageSync = React.useCallback(
    (newSettings: Settings) => {
      pendingPageSyncRef.current = newSettings;

      if (pageSyncTimerRef.current) {
        clearTimeout(pageSyncTimerRef.current);
      }

      pageSyncTimerRef.current = setTimeout(() => {
        if (pendingPageSyncRef.current) {
          flushPageSync(pendingPageSyncRef.current);
          pendingPageSyncRef.current = null;
        }
      }, PAGE_SYNC_DEBOUNCE_MS);
    },
    [flushPageSync]
  );

  React.useEffect(() => {
    return () => {
      if (pageSyncTimerRef.current) {
        clearTimeout(pageSyncTimerRef.current);
        if (pendingPageSyncRef.current) {
          flushPageSync(pendingPageSyncRef.current);
          pendingPageSyncRef.current = null;
        }
      }
    };
  }, [flushPageSync]);

  const updateSetting = React.useCallback(
    (key: keyof Settings, value: any) => {
      writeSettingToLogseq(key, value);

      setSettings((currentSettings) => {
        const newSettings = { ...currentSettings, [key]: coerceSettingValue(key, value) };
        schedulePageSync(newSettings);
        return newSettings;
      });
    },
    [schedulePageSync]
  );

  return { settings, updateSetting };
};

export default useSettings;
