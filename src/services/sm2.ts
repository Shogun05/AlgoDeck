import { SM2Result } from '../types';
import { sm2IntervalService } from './sm2Intervals';

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

    const customIntervals = sm2IntervalService.getIntervals();

    if (quality < 3) {
        // Failed — reset
        newRepetition = 0;
        // Again: use custom interval (in minutes → convert to fractional days for scheduling)
        if (quality === 0) {
            // "Again" — schedule in customIntervals.again minutes
            newInterval = customIntervals.again / (60 * 24); // fraction of a day
        } else {
            // "Hard" (quality 2) — schedule in customIntervals.hard minutes
            newInterval = customIntervals.hard / (60 * 24);
        }
        newEaseFactor = easeFactor;
    } else {
        // Passed
        newRepetition = repetition + 1;
        if (newRepetition === 1) {
            // First successful review: use custom good/easy
            if (quality >= 5) {
                newInterval = customIntervals.easy;
            } else {
                newInterval = customIntervals.good;
            }
        } else if (newRepetition === 2) {
            if (quality >= 5) {
                newInterval = customIntervals.easy * 2;
            } else {
                newInterval = customIntervals.good * 2;
            }
        } else {
            newInterval = Math.round(interval * easeFactor);
        }
        newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    }

    // Ease factor must be at least 1.3
    if (newEaseFactor < 1.3) {
        newEaseFactor = 1.3;
    }

    // For sub-day intervals, add minutes instead of days
    const nextDate = new Date();
    if (newInterval < 1) {
        nextDate.setMinutes(nextDate.getMinutes() + Math.round(newInterval * 24 * 60));
    } else {
        nextDate.setDate(nextDate.getDate() + Math.round(newInterval));
    }
    const nextReviewDate = nextDate.toISOString().split('T')[0];

    return {
        repetition: newRepetition,
        interval: newInterval,
        easeFactor: Number(newEaseFactor.toFixed(2)),
        nextReviewDate,
    };
};
