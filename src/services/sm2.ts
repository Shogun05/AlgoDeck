import { SM2Result } from '../types';

/**
 * SM-2 Spaced Repetition Algorithm
 * 
 * Quality ratings:
 *   0 - Complete blackout (Again)
 *   1 - Incorrect, but remembered upon seeing answer
 *   2 - Incorrect, but answer seemed easy to recall (Hard)
 *   3 - Correct with serious difficulty (Good)
 *   4 - Correct with some hesitation  
 *   5 - Perfect response (Easy)
 */

export const RATING_MAP: Record<string, number> = {
    again: 0,
    hard: 2,
    good: 3,
    easy: 5,
};

export const calculateSM2 = (
    quality: number,
    repetition: number,
    interval: number,
    easeFactor: number,
): SM2Result => {
    let newRepetition: number;
    let newInterval: number;
    let newEaseFactor: number;

    if (quality < 3) {
        // Failed — reset
        newRepetition = 0;
        newInterval = 1;
        newEaseFactor = easeFactor;
    } else {
        // Passed
        newRepetition = repetition + 1;
        if (newRepetition === 1) {
            newInterval = 1;
        } else if (newRepetition === 2) {
            newInterval = 6;
        } else {
            newInterval = Math.round(interval * easeFactor);
        }
        newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    }

    // Ease factor must be at least 1.3
    if (newEaseFactor < 1.3) {
        newEaseFactor = 1.3;
    }

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + newInterval);
    const nextReviewDate = nextDate.toISOString().split('T')[0];

    return {
        repetition: newRepetition,
        interval: newInterval,
        easeFactor: Number(newEaseFactor.toFixed(2)),
        nextReviewDate,
    };
};
