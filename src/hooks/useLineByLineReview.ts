/**
 * LBL review is the secondary queue for a parent card.
 * Child blocks keep independent session data and algorithms; the parent only
 * chooses whether this card is rendered as NORMAL or LBL.
 */
import * as React from 'react';
import {
  SchedulingAlgorithm,
  InteractionStyle,
  Session,
  isGradingAlgorithm,
  getSessionAlgorithm,
  resolveBaseForCalculation,
  deriveParentNextDueDateFromChildSessions,
} from '~/models/session';
import { getLblQueueState } from '~/models/practice';
import { savePracticeData, updateParentNextDueDate } from '~/queries';
import { generatePracticeData } from '~/practice';
import { generateNewSession } from '~/queries/utils';

export const shouldReinsertLblCard = ({
  currentChildIndex,
  totalChildren,
  lblNextReinsertOffset,
}: {
  currentChildIndex: number;
  totalChildren: number;
  lblNextReinsertOffset: number;
}) => lblNextReinsertOffset > 0 && currentChildIndex < totalChildren - 1;

interface UseLineByLineReviewInput {
  currentCardRefUid: string | undefined;
  childUidsList: string[];
  isLBLReviewMode: boolean;
  hasLoadedChildSessionsForCurrentCard: boolean;
  dataPageTitle: string;
  lblNextReinsertOffset: number;
  forgotReinsertOffset: number;
  currentIndex: number;
  currentCardData: any;
  algorithm: SchedulingAlgorithm;
  interaction: InteractionStyle;
  setSessionOverrides: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  setShowAnswers: React.Dispatch<React.SetStateAction<boolean>>;
  setCardQueue: React.Dispatch<React.SetStateAction<string[]>>;
  childSessionData: Record<string, Session>;
  setChildSessionData: React.Dispatch<React.SetStateAction<Record<string, Session>>>;
}

interface UseLineByLineReviewOutput {
  lineByLineRevealedCount: number;
  lineByLineCurrentChildIndex: number;
  lineByLineIsCardComplete: boolean;
  dueChildCount: number;
  onLineByLineGrade: (_grade: number) => void;
  onLineByLineShowAnswer: () => void;
  currentChildAlgorithm: SchedulingAlgorithm;
  currentChildIsLblNext: boolean;
  onLineByLinePrev: () => void;
  onLineByLineNext: () => void;
}

export default function useLineByLineReview({
  currentCardRefUid,
  childUidsList,
  isLBLReviewMode,
  hasLoadedChildSessionsForCurrentCard,
  dataPageTitle,
  lblNextReinsertOffset,
  forgotReinsertOffset,
  currentIndex,
  currentCardData,
  algorithm,
  interaction,
  setSessionOverrides,
  setCurrentIndex,
  setShowAnswers,
  setCardQueue,
  childSessionData,
  setChildSessionData,
}: UseLineByLineReviewInput): UseLineByLineReviewOutput {
  const [lineByLineRevealedCount, setLineByLineRevealedCount] = React.useState(0);
  const [lineByLineCurrentChildIndex, setLineByLineCurrentChildIndex] = React.useState(0);

  const currentChildAlgorithm = React.useMemo(() => {
    if (
      !isLBLReviewMode ||
      !childUidsList.length ||
      lineByLineCurrentChildIndex >= childUidsList.length
    ) {
      return algorithm;
    }
    const childUid = childUidsList[lineByLineCurrentChildIndex];
    const childSession = childSessionData[childUid];
    return getSessionAlgorithm(childSession, algorithm);
  }, [isLBLReviewMode, childUidsList, lineByLineCurrentChildIndex, childSessionData, algorithm]);

  const currentChildIsLblNext = !isGradingAlgorithm(currentChildAlgorithm);

  const lblQueueState = React.useMemo(
    () => getLblQueueState(childUidsList, childSessionData, 0),
    [childUidsList, childSessionData]
  );
  const dueChildCount = lblQueueState.dueChildCount;

  const needsPositioningRef = React.useRef(true);

  React.useEffect(() => {
    if (!isLBLReviewMode || !childUidsList.length) {
      setLineByLineRevealedCount(0);
      setLineByLineCurrentChildIndex(0);
      needsPositioningRef.current = false;
      return;
    }
    needsPositioningRef.current = true;
  }, [isLBLReviewMode, currentCardRefUid, childUidsList, currentIndex]);

  // Reposition only after the secondary queue for the new parent card has loaded.
  React.useEffect(() => {
    if (!isLBLReviewMode || !childUidsList.length) return;
    if (!needsPositioningRef.current) return;
    if (!hasLoadedChildSessionsForCurrentCard) return;

    needsPositioningRef.current = false;

    const firstDueIndex = lblQueueState.nextDueChildIndex;
    setLineByLineCurrentChildIndex(firstDueIndex);
    setLineByLineRevealedCount(firstDueIndex + 1);
  }, [
    isLBLReviewMode,
    childUidsList,
    childSessionData,
    hasLoadedChildSessionsForCurrentCard,
    lblQueueState,
  ]);

  const lineByLineIsCardComplete =
    isLBLReviewMode && lineByLineCurrentChildIndex >= childUidsList.length;

  // Unified grading path for both LBL-Next (Progressive/FixedTime) and SM2 child blocks.
  // The only difference is sm2_grade: undefined for LBL-Next, the actual grade for SM2.
  // resolveBaseForCalculation handles same-day re-scoring rewind uniformly.
  const onLineByLineGrade = React.useCallback(
    async (grade: number) => {
      if (!currentCardRefUid || lineByLineCurrentChildIndex >= childUidsList.length) return;

      try {
        const childUid = childUidsList[lineByLineCurrentChildIndex];
        const existingChildSession =
          childSessionData[childUid] || generateNewSession({ algorithm: currentChildAlgorithm });
        const now = new Date();

        const baseForCalculation = resolveBaseForCalculation(existingChildSession, now);
        const sm2_grade = currentChildIsLblNext ? undefined : grade;
        const childPracticeProps = {
          ...baseForCalculation,
          refUid: childUid,
          dataPageTitle,
          algorithm: currentChildAlgorithm,
          ...(sm2_grade !== undefined && { sm2_grade }),
        };
        const childResult = generatePracticeData({ ...childPracticeProps, dateCreated: now });
        const childNextDueDate = childResult.nextDueDate;

        await savePracticeData({
          refUid: childUid,
          dataPageTitle,
          dateCreated: now,
          ...childResult,
        });

        await updateParentNextDueDate({
          refUid: currentCardRefUid,
          childUids: childUidsList,
          dataPageTitle,
        });

        const updatedChildSession = { ...existingChildSession, ...childResult, dateCreated: now };

        setChildSessionData((prev) => ({
          ...prev,
          [childUid]: updatedChildSession,
        }));

        const updatedChildSessionsForParent = {
          ...childSessionData,
          [childUid]: { ...updatedChildSession, nextDueDate: childNextDueDate },
        };

        setSessionOverrides((prev) => ({
          ...prev,
          [childUid]: updatedChildSession,
          [currentCardRefUid]: {
            ...currentCardData,
            algorithm: currentChildAlgorithm,
            interaction,
            dateCreated: now,
            nextDueDate: deriveParentNextDueDateFromChildSessions(
              childUidsList,
              updatedChildSessionsForParent,
              now
            ),
          },
        }));

        if (grade === 0 && forgotReinsertOffset > 0 && currentCardRefUid) {
          const forgotInsertIndex = currentIndex + 1 + forgotReinsertOffset;
          setCardQueue((prev) => {
            const newQueue = [...prev];
            const targetIndex = Math.min(forgotInsertIndex, newQueue.length);
            newQueue.splice(targetIndex, 0, currentCardRefUid);
            return newQueue;
          });
        }

        if (grade === 0) {
          setCurrentIndex((prev) => prev + 1);
          setShowAnswers(false);
          return;
        }

        const nextDueIndex = getLblQueueState(
          childUidsList,
          updatedChildSessionsForParent,
          lineByLineCurrentChildIndex + 1
        ).nextDueChildIndex;
        const isCardComplete = nextDueIndex >= childUidsList.length;

        if (
          currentChildIsLblNext &&
          shouldReinsertLblCard({
            currentChildIndex: lineByLineCurrentChildIndex,
            totalChildren: childUidsList.length,
            lblNextReinsertOffset,
          }) &&
          currentCardRefUid
        ) {
          const readInsertIndex = currentIndex + 1 + lblNextReinsertOffset;
          setCardQueue((prev) => {
            const newQueue = [...prev];
            const targetIndex = Math.min(readInsertIndex, newQueue.length);
            newQueue.splice(targetIndex, 0, currentCardRefUid);
            return newQueue;
          });
          setCurrentIndex((prev) => prev + 1);
        } else if (isCardComplete) {
          setCurrentIndex((prev) => prev + 1);
        }

        setLineByLineCurrentChildIndex(nextDueIndex);
        setLineByLineRevealedCount(isCardComplete ? nextDueIndex : nextDueIndex + 1);
        setShowAnswers(false);
      } catch (err) {
        console.error('Memo: Failed to grade LBL card', err);
      }
    },
    [
      currentCardRefUid,
      lineByLineCurrentChildIndex,
      childUidsList,
      childSessionData,
      dataPageTitle,
      setCurrentIndex,
      currentChildIsLblNext,
      currentCardData,
      currentChildAlgorithm,
      interaction,
      lblNextReinsertOffset,
      forgotReinsertOffset,
      currentIndex,
      setSessionOverrides,
      setChildSessionData,
      setCardQueue,
      setShowAnswers,
    ]
  );

  const onLineByLineShowAnswer = React.useCallback(() => {
    setLineByLineRevealedCount((prev) => Math.max(prev, lineByLineCurrentChildIndex + 1));
    setShowAnswers(true);
  }, [lineByLineCurrentChildIndex, setShowAnswers]);

  const onLineByLinePrev = React.useCallback(() => {
    if (lineByLineCurrentChildIndex <= 0) return;
    const newIndex = lineByLineCurrentChildIndex - 1;
    setLineByLineCurrentChildIndex(newIndex);
    setLineByLineRevealedCount(newIndex + 1);
  }, [lineByLineCurrentChildIndex]);

  const onLineByLineNext = React.useCallback(() => {
    if (lineByLineCurrentChildIndex >= childUidsList.length - 1) return;
    const newIndex = lineByLineCurrentChildIndex + 1;
    setLineByLineCurrentChildIndex(newIndex);
    setLineByLineRevealedCount((prev) => Math.max(prev, newIndex + 1));
  }, [lineByLineCurrentChildIndex, childUidsList.length]);

  return {
    lineByLineRevealedCount,
    lineByLineCurrentChildIndex,
    lineByLineIsCardComplete,
    dueChildCount,
    onLineByLineGrade,
    onLineByLineShowAnswer,
    currentChildAlgorithm,
    currentChildIsLblNext,
    onLineByLinePrev,
    onLineByLineNext,
  };
}
