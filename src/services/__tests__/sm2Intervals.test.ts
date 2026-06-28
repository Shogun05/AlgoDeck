import AsyncStorage from '@react-native-async-storage/async-storage';
import { sm2IntervalService } from '../sm2Intervals';

jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
}));

describe('SM2Intervals Service', () => {
    const defaults = sm2IntervalService.getDefaults();

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset in-memory intervals
        sm2IntervalService.setIntervals(defaults);
    });

    describe('init', () => {
        it('should use default values if AsyncStorage returns null', async () => {
            (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

            await sm2IntervalService.init();

            expect(AsyncStorage.getItem).toHaveBeenCalledWith('algodeck_sm2_intervals');
            expect(sm2IntervalService.getIntervals()).toEqual(defaults);
        });

        it('should merge saved values with default values on success', async () => {
            const savedVals = { again: 3, easy: 10 };
            (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(savedVals));

            await sm2IntervalService.init();

            expect(sm2IntervalService.getIntervals()).toEqual({
                ...defaults,
                again: 3,
                easy: 10,
            });
        });
    });

    describe('setIntervals', () => {
        it('should update in-memory intervals and write them to AsyncStorage', async () => {
            await sm2IntervalService.setIntervals({ good: 5 });

            expect(sm2IntervalService.getIntervals().good).toBe(5);
            expect(AsyncStorage.setItem).toHaveBeenCalledWith(
                'algodeck_sm2_intervals',
                expect.stringContaining('"good":5')
            );
        });
    });

    describe('formatLabel', () => {
        it('should format again/hard ratings as minutes if under 60 minutes', () => {
            // Defaults: again = 1, hard = 10
            expect(sm2IntervalService.formatLabel('again')).toBe('1m');
            expect(sm2IntervalService.formatLabel('hard')).toBe('10m');
        });

        it('should format again/hard ratings as hours if 60 minutes or greater', async () => {
            await sm2IntervalService.setIntervals({ again: 120, hard: 60 });

            expect(sm2IntervalService.formatLabel('again')).toBe('2h');
            expect(sm2IntervalService.formatLabel('hard')).toBe('1h');
        });

        it('should format good/easy ratings as days', async () => {
            await sm2IntervalService.setIntervals({ good: 1, easy: 14 });

            expect(sm2IntervalService.formatLabel('good')).toBe('1d');
            expect(sm2IntervalService.formatLabel('easy')).toBe('14d');
        });
    });
});
