/**
 * Today's Review Calculation
 *
 * Computes which cards are due, new, and completed for the current session.
 * Pipeline: initializeToday → calculateCompletedTodayCounts → addNewCards → addDueCards
 *           → calculateCombinedCounts → limitRemainingPracticeData → calculateTodayStatus
 */
import * as dateUtils from '~/utils/date';
import { Records, RecordUid, Session } from '~/models/session';
import { CompletionStatus, RenderMode, Today, TodayInitial } from '~/models/practice';
import { generateNewSession } from '~/queries/utils';

const fisherYatesShuffle = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const initializeToday = ({ tagsList, cachedData }) => {
  const today: Today = JSON.parse(JSON.stringify(TodayInitial));

  for (const tag of tagsList) {
    const cachedTagData = cachedData?.[tag];

    today.tags[tag] = {
      status: CompletionStatus.Unstarted,
      completed: 0,
      due: 0,
      new: 0,
      newUids: [],
      dueUids: [],
      completedUids: [],
      renderMode: cachedTagData?.renderMode || RenderMode.Normal,
      deckWeight: Number(cachedTagData?.deckWeight) || 0,
    };
  }

  return today;
};

export const calculateTodayStatus = ({ today, tagsList }) => {
  for (const tag of tagsList) {
    const completed = today.tags[tag].completed;
    const remaining = today.tags[tag].new + today.tags[tag].due;

    if (remaining === 0) {
      today.tags[tag].status = CompletionStatus.Finished;
    } else if (completed > 0) {
      today.tags[tag].status = CompletionStatus.Partial;
    } else {
      today.tags[tag].status = CompletionStatus.Unstarted;
    }
  }

  const completed = today.combinedToday.completed;
  const remaining = today.combinedToday.new + today.combinedToday.due;

  if (remaining === 0) {
    today.combinedToday.status = CompletionStatus.Finished;
  } else if (completed > 0) {
    today.combinedToday.status = CompletionStatus.Partial;
  } else {
    today.combinedToday.status = CompletionStatus.Unstarted;
  }
};

export const calculateCompletedTodayCounts = ({ today, tagsList, sessionData }) => {
  for (const tag of tagsList) {
    let count = 0;
    // 循环外创建 Date：避免每次迭代重复创建对象
    const now = new Date();
    const completedUids: RecordUid[] = [];

    const currentTagSessionData = sessionData[tag];
    Object.keys(currentTagSessionData).forEach((cardUid) => {
      const cardData = currentTagSessionData[cardUid];
      if (cardData?.isNew) return;
      const isCompletedToday =
        cardData && dateUtils.isSameDay(cardData.dateCreated, now);

      if (isCompletedToday) {
        if (cardData.interaction === 'LBL') {
          if (cardData.nextDueDate && cardData.nextDueDate <= now) return;
        }

        count++;
        completedUids.push(cardUid);
      }
    });

    today.tags[tag] = {
      ...(today.tags[tag] || {}),
      completed: count,
      completedUids,
    };
  }

  return today;
};

export const calculateCombinedCounts = ({ today, tagsList }) => {
  today.combinedToday = {
    status: CompletionStatus.Unstarted,
    due: 0,
    new: 0,
    dueUids: [],
    newUids: [],
    completed: 0,
    completedUids: [],
  };

  for (const tag of tagsList) {
    today.combinedToday.due += today.tags[tag].due;
    today.combinedToday.new += today.tags[tag].new;
    today.combinedToday.dueUids = today.combinedToday.dueUids.concat(today.tags[tag].dueUids);
    today.combinedToday.newUids = today.combinedToday.newUids.concat(today.tags[tag].newUids);
    today.combinedToday.completed += today.tags[tag].completed;
    today.combinedToday.completedUids = today.combinedToday.completedUids.concat(
      today.tags[tag].completedUids
    );
  }
};

export const addNewCards = ({
  today,
  tagsList,
  cardUids,
  pluginPageData,
  shuffleCards,
}: {
  today: Today;
  tagsList: string[];
  cardUids: Record<string, RecordUid[]>;
  pluginPageData: Records;
  shuffleCards: boolean;
}) => {
  for (const currentTag of tagsList) {
    const allSelectedTagCardsUids = cardUids[currentTag];
    let newCardsUids: RecordUid[] = [];

    allSelectedTagCardsUids.forEach((referenceId) => {
      const latestSession = pluginPageData[referenceId] as Session & { isNew?: boolean };
      if (
        !pluginPageData[referenceId] ||
        (latestSession?.isNew && !latestSession?.nextDueDate)
      ) {
        newCardsUids.push(referenceId);
        if (!pluginPageData[referenceId]) {
          pluginPageData[referenceId] = generateNewSession();
        }
      }
    });

    if (shuffleCards) {
      newCardsUids = fisherYatesShuffle(newCardsUids);
    } else {
      newCardsUids.reverse();
    }

    today.tags[currentTag] = {
      ...today.tags[currentTag],
      newUids: newCardsUids,
      new: newCardsUids.length,
    };
  }
};

export const getDueCardUids = (currentTagSessionData: Records, isCramming, shuffleCards = false) => {
  const results: RecordUid[] = [];
  if (!Object.keys(currentTagSessionData).length) return results;

  const now = new Date();
  Object.keys(currentTagSessionData).forEach((cardUid) => {
    const latestSession = currentTagSessionData[cardUid] as Session & { isNew?: boolean };
    if (!latestSession || latestSession?.isNew) return;

    const nextDueDate = latestSession.nextDueDate;

    if (isCramming || (nextDueDate && nextDueDate <= now)) {
      results.push(cardUid);
    }
  });

  if (shuffleCards) {
    return fisherYatesShuffle(results);
  }

  results.sort((a, b) => {
    const aLatestSession = currentTagSessionData[a] as Session;
    const bLatestSession = currentTagSessionData[b] as Session;

    const aDueDate = aLatestSession?.nextDueDate || new Date(0);
    const bDueDate = bLatestSession?.nextDueDate || new Date(0);
    if (aDueDate.getTime() !== bDueDate.getTime()) {
      return aDueDate.getTime() - bDueDate.getTime();
    }

    const aEfactor = aLatestSession?.sm2_eFactor ?? 2.5;
    const bEfactor = bLatestSession?.sm2_eFactor ?? 2.5;
    if (aEfactor !== bEfactor) {
      return aEfactor - bEfactor;
    }

    const aReps = aLatestSession?.sm2_repetitions ?? 0;
    const bReps = bLatestSession?.sm2_repetitions ?? 0;
    return aReps - bReps;
  });

  return results;
};

export const addDueCards = ({ today, tagsList, sessionData, isCramming, shuffleCards }) => {
  for (const currentTag of tagsList) {
    const currentTagSessionData = sessionData[currentTag];
    const dueCardsUids = getDueCardUids(currentTagSessionData, isCramming, shuffleCards);

    today.tags[currentTag] = {
      ...today.tags[currentTag],
      dueUids: dueCardsUids,
      due: dueCardsUids.length,
    };
  }
};

export const getDefaultWeights = (tagsList: string[]): Record<string, number> => {
  if (!tagsList.length) return {};
  const base = Math.floor(100 / tagsList.length);
  const remainder = 100 - base * tagsList.length;
  const weights: Record<string, number> = {};
  tagsList.forEach((tag, i) => {
    weights[tag] = base + (i < remainder ? 1 : 0);
  });
  return weights;
};

export const distributeWeights = (
  tagsList: string[],
  currentWeights: Record<string, number>,
  changedTag: string,
  newWeight: number
): Record<string, number> => {
  const clampedWeight = Math.min(Math.max(newWeight, 0), 100);
  const otherTags = tagsList.filter((t) => t !== changedTag);
  const remaining = 100 - clampedWeight;

  if (!otherTags.length) {
    return { [changedTag]: 100 };
  }

  const otherCurrentTotal = otherTags.reduce(
    (sum, t) => sum + (currentWeights[t] || 0),
    0
  );

  const result: Record<string, number> = { [changedTag]: clampedWeight };

  if (otherCurrentTotal === 0) {
    const equalShare = Math.floor(remaining / otherTags.length);
    const remainder = remaining - equalShare * otherTags.length;
    otherTags.forEach((tag, i) => {
      result[tag] = equalShare + (i < remainder ? 1 : 0);
    });
  } else {
    let distributed = 0;
    const rawWeights: Record<string, number> = {};

    otherTags.forEach((tag) => {
      const proportion = (currentWeights[tag] || 0) / otherCurrentTotal;
      const raw = remaining * proportion;
      const floored = Math.floor(raw);
      rawWeights[tag] = floored;
      distributed += floored;
    });

    const diff = remaining - distributed;
    const sortedByRemainder = [...otherTags].sort((a, b) => {
      const rA = remaining * ((currentWeights[a] || 0) / otherCurrentTotal) - rawWeights[a];
      const rB = remaining * ((currentWeights[b] || 0) / otherCurrentTotal) - rawWeights[b];
      return rB - rA;
    });

    for (let i = 0; i < diff; i++) {
      rawWeights[sortedByRemainder[i]]++;
    }

    otherTags.forEach((tag) => {
      result[tag] = rawWeights[tag];
    });
  }

  return result;
};
