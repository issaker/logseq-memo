import {
  SchedulingAlgorithm,
  InteractionStyle,
  DEFAULT_REVIEW_CONFIG,
  resolveReviewConfig,
} from '~/models/session';

describe('resolveReviewConfig', () => {
  describe('valid algorithm + interaction', () => {
    it('resolves SM2 + NORMAL', () => {
      expect(resolveReviewConfig('SM2', 'NORMAL')).toEqual({
        algorithm: SchedulingAlgorithm.SM2,
        interaction: InteractionStyle.NORMAL,
      });
    });

    it('resolves SM2 + LBL', () => {
      expect(resolveReviewConfig('SM2', 'LBL')).toEqual({
        algorithm: SchedulingAlgorithm.SM2,
        interaction: InteractionStyle.LBL,
      });
    });

    it('resolves PROGRESSIVE + NORMAL', () => {
      expect(resolveReviewConfig('PROGRESSIVE', 'NORMAL')).toEqual({
        algorithm: SchedulingAlgorithm.PROGRESSIVE,
        interaction: InteractionStyle.NORMAL,
      });
    });

    it('resolves FIXED_TIME + NORMAL', () => {
      expect(resolveReviewConfig('FIXED_TIME', 'NORMAL')).toEqual({
        algorithm: SchedulingAlgorithm.FIXED_TIME,
        interaction: InteractionStyle.NORMAL,
      });
    });
  });

  describe('invalid or missing inputs', () => {
    it('defaults algorithm to PROGRESSIVE when algorithm is invalid but interaction is valid', () => {
      const result = resolveReviewConfig('INVALID_ALGO', 'NORMAL');
      expect(result).toEqual({
        algorithm: SchedulingAlgorithm.PROGRESSIVE,
        interaction: InteractionStyle.NORMAL,
      });
    });

    it('defaults interaction to NORMAL when interaction is invalid but algorithm is valid', () => {
      const result = resolveReviewConfig('SM2', 'INVALID');
      expect(result).toEqual({
        algorithm: SchedulingAlgorithm.SM2,
        interaction: InteractionStyle.NORMAL,
      });
    });

    it('defaults both when both are invalid', () => {
      const result = resolveReviewConfig('INVALID', 'INVALID');
      expect(result).toEqual(DEFAULT_REVIEW_CONFIG);
    });

    it('defaults both when both are undefined', () => {
      expect(resolveReviewConfig()).toEqual(DEFAULT_REVIEW_CONFIG);
    });

    it('defaults algorithm to PROGRESSIVE when only interaction is provided and valid', () => {
      expect(resolveReviewConfig(undefined, 'LBL')).toEqual({
        algorithm: SchedulingAlgorithm.PROGRESSIVE,
        interaction: InteractionStyle.LBL,
      });
    });

    it('defaults interaction to NORMAL when only algorithm is provided and valid', () => {
      expect(resolveReviewConfig('PROGRESSIVE', undefined)).toEqual({
        algorithm: SchedulingAlgorithm.PROGRESSIVE,
        interaction: InteractionStyle.NORMAL,
      });
    });

    it('defaults legacy FIXED_DAYS to PROGRESSIVE (no backward compat)', () => {
      expect(resolveReviewConfig('FIXED_DAYS', 'NORMAL')).toEqual(DEFAULT_REVIEW_CONFIG);
    });

    it('defaults legacy FIXED_WEEKS to PROGRESSIVE (no backward compat)', () => {
      expect(resolveReviewConfig('FIXED_WEEKS', 'NORMAL')).toEqual(DEFAULT_REVIEW_CONFIG);
    });
  });
});
