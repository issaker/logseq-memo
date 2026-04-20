import {
  SchedulingAlgorithm,
  FixedTimeUnit,
  InteractionStyle,
  isFixedTimeAlgorithm,
  isGradingAlgorithm,
  isLBLReviewMode,
  getAlgorithmIntent,
  ALGORITHM_META,
  INTERACTION_META,
} from '~/models/session';

describe('mode classification functions', () => {
  it('isFixedTimeAlgorithm returns true only for FIXED_TIME', () => {
    expect(isFixedTimeAlgorithm(SchedulingAlgorithm.PROGRESSIVE)).toBe(false);
    expect(isFixedTimeAlgorithm(SchedulingAlgorithm.FIXED_TIME)).toBe(true);
    expect(isFixedTimeAlgorithm(SchedulingAlgorithm.SM2)).toBe(false);
  });

  it('isGradingAlgorithm returns true only for SM2', () => {
    expect(isGradingAlgorithm(SchedulingAlgorithm.SM2)).toBe(true);
    expect(isGradingAlgorithm(SchedulingAlgorithm.PROGRESSIVE)).toBe(false);
    expect(isGradingAlgorithm(SchedulingAlgorithm.FIXED_TIME)).toBe(false);
  });

  it('isLBLReviewMode returns true only for LBL interaction', () => {
    expect(isLBLReviewMode(InteractionStyle.LBL)).toBe(true);
    expect(isLBLReviewMode(InteractionStyle.NORMAL)).toBe(false);
  });

  it('all classification functions return false for undefined', () => {
    expect(isFixedTimeAlgorithm(undefined)).toBe(false);
    expect(isGradingAlgorithm(undefined)).toBe(false);
    expect(isLBLReviewMode(undefined)).toBe(false);
  });
});

describe('getAlgorithmIntent', () => {
  it('returns correct intent for each algorithm', () => {
    expect(getAlgorithmIntent(SchedulingAlgorithm.SM2)).toBe('success');
    expect(getAlgorithmIntent(SchedulingAlgorithm.PROGRESSIVE)).toBe('warning');
    expect(getAlgorithmIntent(SchedulingAlgorithm.FIXED_TIME)).toBe('primary');
  });

  it('returns none for undefined', () => {
    expect(getAlgorithmIntent(undefined)).toBe('none');
  });
});

describe('ALGORITHM_META', () => {
  it('has an entry for every SchedulingAlgorithm enum value', () => {
    const allAlgorithms = Object.values(SchedulingAlgorithm);
    for (const algo of allAlgorithms) {
      expect(algo in ALGORITHM_META).toBe(true);
    }
  });

  it('every entry has a valid group', () => {
    const validGroups: string[] = ['SM2', 'Progressive', 'FixedTime'];
    const entries = Object.values(ALGORITHM_META);
    for (const entry of entries) {
      expect(validGroups).toContain(entry.group);
    }
  });

  it('every entry has a non-empty label', () => {
    const entries = Object.values(ALGORITHM_META);
    for (const entry of entries) {
      expect(entry.label).toBeTruthy();
      expect(typeof entry.label).toBe('string');
    }
  });
});

describe('INTERACTION_META', () => {
  it('has an entry for every InteractionStyle enum value', () => {
    const allInteractions = Object.values(InteractionStyle);
    for (const inter of allInteractions) {
      expect(inter in INTERACTION_META).toBe(true);
    }
  });

  it('every entry has a non-empty label', () => {
    const entries = Object.values(INTERACTION_META);
    for (const entry of entries) {
      expect(entry.label).toBeTruthy();
      expect(typeof entry.label).toBe('string');
    }
  });
});
