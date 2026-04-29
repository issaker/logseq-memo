import * as React from 'react';
import * as Blueprint from '@blueprintjs/core';
import PracticeOverlay from '~/components/overlay/PracticeOverlay';
import SidePanelWidget from '~/components/SidePanelWidget';
import { PracticeSessionProvider } from '~/contexts/PracticeSessionContext';
import practice from '~/practice';
import usePracticeData from '~/hooks/usePracticeData';
import useTags from '~/hooks/useTags';
import useSettings from '~/hooks/useSettings';
import useCollapseReferenceList from '~/hooks/useCollapseReferenceList';
import useOnBlockInteract from '~/hooks/useOnBlockInteract';
import useCommandPaletteAction from '~/hooks/useCommandPaletteAction';
import useCachedData from '~/hooks/useCachedData';
import useOnVisibilityStateChange from '~/hooks/useOnVisibilityStateChange';
import { Session } from '~/models/session';

export type handlePracticeProps = Session & {
  refUid: string;
};

const App = () => {
  const [showPracticeOverlay, setShowPracticeOverlay] = React.useState(false);
  const [isCramming, setIsCramming] = React.useState(false);
  const [overlayKey, setOverlayKey] = React.useState(0);

  const {
    settings,
    updateSetting,
  } = useSettings();
  const {
    deckConfigs,
    dataPageTitle,
    dailyLimit,
    shuffleCards,
  } = settings;
  const { selectedTag, setSelectedTag, tagsList } = useTags({ deckConfigs });

  const { fetchCacheData, data: cachedData } = useCachedData({ dataPageTitle });

  const { practiceData, today, fetchPracticeData } = usePracticeData({
    tagsList,
    selectedTag,
    dataPageTitle,
    cachedData,
    isCramming,
    dailyLimit,
    shuffleCards,
    deckConfigs,
  });

  const refreshData = React.useCallback(() => {
    fetchCacheData();
    fetchPracticeData();
  }, [fetchCacheData, fetchPracticeData]);

  React.useEffect(() => {
    refreshData();
  }, [deckConfigs, refreshData]);

  const handlePracticeClick = async ({ refUid, ...cardData }: handlePracticeProps) => {
    if (!refUid) {
      console.error('HandlePracticeFn Error: No refUid provided');
      return;
    }

    try {
      await practice({
        ...cardData,
        dataPageTitle,
        dateCreated: new Date(),
        refUid,
        isCramming,
      });
    } catch (error) {
      console.error('Error Saving Practice Data', error);
    }
  };

  useOnVisibilityStateChange(() => {
    if (showPracticeOverlay) return;
    refreshData();
  });

  const onShowPracticeOverlay = () => {
    refreshData();
    setShowPracticeOverlay(true);
    setIsCramming(false);
  };

  const onClosePracticeOverlayCallback = () => {
    setShowPracticeOverlay(false);
    setIsCramming(false);
    refreshData();
  };

  const onRestartPracticeOverlayCallback = () => {
    setOverlayKey((prev) => prev + 1);
    refreshData();
  };

  const handleMemoTagChange = (tag: string) => {
    setSelectedTag(tag);
  };

  useCollapseReferenceList({ dataPageTitle });

  const tagsOnEnterRef = React.useRef<string[]>([]);
  const tagsListRef = React.useRef(tagsList);
  const showPracticeOverlayRef = React.useRef(showPracticeOverlay);
  const fetchPracticeDataRef = React.useRef(fetchPracticeData);

  React.useEffect(() => {
    tagsListRef.current = tagsList;
  }, [tagsList]);

  React.useEffect(() => {
    showPracticeOverlayRef.current = showPracticeOverlay;
  }, [showPracticeOverlay]);

  React.useEffect(() => {
    fetchPracticeDataRef.current = fetchPracticeData;
  }, [fetchPracticeData]);

  const onBlockEnterHandler = (_elm: HTMLElement) => {
  };
  const onBlockLeaveHandler = (_elm: HTMLElement) => {
    if (showPracticeOverlayRef.current) return;
    fetchPracticeDataRef.current();
  };

  useOnBlockInteract({
    onEnterCallback: onBlockEnterHandler,
    onLeaveCallback: onBlockLeaveHandler,
  });

  useCommandPaletteAction({ onShowPracticeOverlay });

  return (
    <Blueprint.HotkeysProvider>
      <>
        <SidePanelWidget onClickCallback={onShowPracticeOverlay} today={today} />
        {showPracticeOverlay && (
          <PracticeSessionProvider
            key={overlayKey}
            settings={settings}
            practiceData={practiceData}
            today={today}
            selectedTag={selectedTag}
            tagsList={tagsList}
            isCramming={isCramming}
            setIsCramming={setIsCramming}
            handlePracticeClick={handlePracticeClick}
            handleMemoTagChange={handleMemoTagChange}
            fetchPracticeData={fetchPracticeData}
            dataPageTitle={dataPageTitle}
            updateSetting={updateSetting}
          >
            <PracticeOverlay
              isOpen={true}
              onCloseCallback={onClosePracticeOverlayCallback}
              onRestartCallback={onRestartPracticeOverlayCallback}
            />
          </PracticeSessionProvider>
        )}
      </>
    </Blueprint.HotkeysProvider>
  );
};

export default App;
