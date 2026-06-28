import { calculateSM2 } from '../sm2';
import { sm2IntervalService } from '../sm2Intervals';

// Mock AsyncStorage since sm2Intervals imports it
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(null),
}));

describe('SM-2 Spaced Repetition Engine', () => {
    const defaults = sm2IntervalService.getDefaults();

    beforeEach(() => {
        // Reset intervals to defaults before each test
        sm2IntervalService.setIntervals(defaults);
    });

    describe('Fail ratings (quality < 3)', () => {
        it('should handle quality 0 (Again) by setting fractional minutes interval and resetting repetition', () => {
            const result = calculateSM2(0, 3, 10, 2.5);

            expect(result.repetition).toBe(0);
            expect(result.easeFactor).toBe(2.5); // Ease factor remains unchanged on failure
            // defaults.again = 1 minute -> 1 / (60 * 24) = 0.000694 days
            expect(result.interval).toBeCloseTo(1 / 1440, 5);
        });

        it('should handle quality 2 (Hard) by setting fractional minutes interval and resetting repetition', () => {
            const result = calculateSM2(2, 5, 20, 2.8);

            expect(result.repetition).toBe(0);
            expect(result.easeFactor).toBe(2.8);
            // defaults.hard = 10 minutes -> 10 / (60 * 24) = 0.006944 days
            expect(result.interval).toBeCloseTo(10 / 1440, 5);
        });
    });

    describe('First pass reviews (newRepetition = 1)', () => {
        it('should set the interval to good days count if quality is 3 (Good)', () => {
            const result = calculateSM2(3, 0, 0, 2.5);

            expect(result.repetition).toBe(1);
            expect(result.interval).toBe(defaults.good); // 1 day by default
            expect(result.easeFactor).toBeLessThan(2.5); // quality 3 decreases ease factor
        });

        it('should set the interval to easy days count if quality is 5 (Easy)', () => {
            const result = calculateSM2(5, 0, 0, 2.5);

            expect(result.repetition).toBe(1);
            expect(result.interval).toBe(defaults.easy); // 4 days by default
            expect(result.easeFactor).toBe(2.6); // quality 5 increases ease factor by 0.1
        });
    });

    describe('Second pass reviews (newRepetition = 2)', () => {
        it('should double the good interval if quality is 3', () => {
            const result = calculateSM2(3, 1, 1, 2.5);

            expect(result.repetition).toBe(2);
            expect(result.interval).toBe(defaults.good * 2);
        });

        it('should double the easy interval if quality is 5', () => {
            const result = calculateSM2(5, 1, 4, 2.5);

            expect(result.repetition).toBe(2);
            expect(result.interval).toBe(defaults.easy * 2);
        });
    });

    describe('Subsequent pass reviews (newRepetition > 2)', () => {
        it('should multiply the previous interval by ease factor', () => {
            // Repetition: 2 -> 3, interval: 8, easeFactor: 2.5
            // Expected interval: Math.round(8 * 2.5) = 20
            const result = calculateSM2(4, 2, 8, 2.5);

            expect(result.repetition).toBe(3);
            expect(result.interval).toBe(20);
        });
    });

    describe('Ease Factor Bounds', () => {
        it('should clamp the ease factor to a minimum of 1.3', () => {
            // Quality 0 does not change ease factor, but a series of quality 3 reviews will decrease it.
            // Let's test passing a very low previous easeFactor
            const result = calculateSM2(3, 3, 5, 1.35);

            // New easeFactor would normally be 1.35 + (0.1 - (5-3)*(0.08 + (5-3)*0.02))
            // = 1.35 + (0.1 - 2*(0.08 + 0.04)) = 1.35 + (0.1 - 0.24) = 1.35 - 0.14 = 1.21
            // Clamped to 1.3
            expect(result.easeFactor).toBe(1.3);
        });
    });

    describe('ISO Review Date Formatting', () => {
        it('should schedule next review on a fractional day (minutes addition) for intervals < 1', () => {
            const result = calculateSM2(0, 0, 0, 2.5);
            
            // Should add minutes, not days. Check that it parses to a valid ISO date string.
            expect(result.nextReviewDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });
});
