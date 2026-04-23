import { DeckConfig } from '~/hooks/useSettings';

export function validateWeight(value: number): number {
  if (isNaN(value) || typeof value !== 'number') return 0;
  return Math.min(100, Math.max(0, value));
}

export function equalizeWeights(deckCount: number): number[] {
  if (deckCount === 0) return [];
  if (deckCount === 1) return [100];
  const baseWeight = Math.floor(100 / deckCount);
  const weights = new Array(deckCount).fill(baseWeight);
  const remainder = 100 - baseWeight * deckCount;
  for (let i = 0; i < remainder; i++) {
    weights[i] += 1;
  }
  return weights;
}

export function redistributeWeights(
  decks: DeckConfig[],
  changedIndex: number,
  newWeight: number
): DeckConfig[] {
  const validatedWeight = validateWeight(newWeight);
  const result = decks.map((deck) => ({ ...deck }));
  result[changedIndex].weight = validatedWeight;

  const remaining = 100 - validatedWeight;
  if (remaining <= 0) {
    for (let i = 0; i < result.length; i++) {
      if (i !== changedIndex) {
        result[i].weight = 0;
      }
    }
    return result;
  }

  const otherOriginalWeights = decks
    .filter((_, i) => i !== changedIndex)
    .map((d) => d.weight);
  const sumOfOtherWeights = otherOriginalWeights.reduce((a, b) => a + b, 0);

  if (sumOfOtherWeights === 0) {
    const otherCount = result.length - 1;
    const equalWeights = equalizeWeights(otherCount);
    let equalIdx = 0;
    for (let i = 0; i < result.length; i++) {
      if (i !== changedIndex) {
        result[i].weight = equalWeights[equalIdx++];
      }
    }
  } else {
    for (let i = 0; i < result.length; i++) {
      if (i !== changedIndex) {
        const originalWeight = decks[i].weight;
        result[i].weight = Math.ceil(remaining * (originalWeight / sumOfOtherWeights));
      }
    }
  }

  const total = result.reduce((sum, d) => sum + d.weight, 0);

  if (total > 100) {
    const excess = total - 100;
    let targetIndex = -1;
    let highestWeight = -1;
    for (let i = 0; i < result.length; i++) {
      if (i !== changedIndex && result[i].weight > highestWeight) {
        highestWeight = result[i].weight;
        targetIndex = i;
      }
    }
    if (targetIndex !== -1) {
      result[targetIndex].weight -= excess;
    }
  } else if (total < 100) {
    const deficit = 100 - total;
    let targetIndex = -1;
    let highestWeight = -1;
    for (let i = 0; i < result.length; i++) {
      if (i !== changedIndex && result[i].weight > highestWeight) {
        highestWeight = result[i].weight;
        targetIndex = i;
      }
    }
    if (targetIndex !== -1) {
      result[targetIndex].weight += deficit;
    }
  }

  return result;
}
