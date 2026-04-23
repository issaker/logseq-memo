import * as React from 'react';
import { DAILYNOTE_DECK_KEY } from '~/constants';
import { DeckConfig } from '~/hooks/useSettings';

const useTags = ({ deckConfigs, dailynoteEnabled }: { deckConfigs: string; dailynoteEnabled: boolean }) => {
  const buildTagsList = React.useCallback((str: string, enabled: boolean) => {
    let parsed: string[];
    try {
      const configs: DeckConfig[] = JSON.parse(str);
      parsed = configs.map((c) => c.name);
    } catch {
      parsed = ['memo'];
    }
    if (enabled) {
      return [...parsed, DAILYNOTE_DECK_KEY];
    }
    return parsed;
  }, []);

  const [tagsList, setTagsList] = React.useState<string[]>(buildTagsList(deckConfigs, dailynoteEnabled));
  const [selectedTag, setSelectedTag] = React.useState<string>(tagsList[0]);

  React.useEffect(() => {
    const newList = buildTagsList(deckConfigs, dailynoteEnabled);
    setTagsList(newList);
    if (!newList.includes(selectedTag)) {
      setSelectedTag(newList[0]);
    }
  }, [deckConfigs, dailynoteEnabled, buildTagsList]);

  return {
    selectedTag,
    setSelectedTag,
    tagsList,
  };
};

export default useTags;
