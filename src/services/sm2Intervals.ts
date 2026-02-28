import AsyncStorage from '@react-native-async-storage/async-storage';

const SM2_INTERVALS_KEY = 'algodeck_sm2_intervals';

export interface SM2Intervals {
    again: number;  // minutes
    hard: number;   // minutes
    good: number;   // days (stored as day count)
    easy: number;   // days
}

const DEFAULT_INTERVALS: SM2Intervals = {
    again: 1,    // 1 minute
    hard: 10,    // 10 minutes
    good: 1,     // 1 day
    easy: 4,     // 4 days
};

let currentIntervals: SM2Intervals = { ...DEFAULT_INTERVALS };

export const sm2IntervalService = {
    async init() {
        try {
            const val = await AsyncStorage.getItem(SM2_INTERVALS_KEY);
            if (val) {
                currentIntervals = { ...DEFAULT_INTERVALS, ...JSON.parse(val) };
            }
        } catch { /* use defaults */ }
    },

    async setIntervals(intervals: Partial<SM2Intervals>) {
        currentIntervals = { ...currentIntervals, ...intervals };
        await AsyncStorage.setItem(SM2_INTERVALS_KEY, JSON.stringify(currentIntervals));
    },

    getIntervals(): SM2Intervals {
        return { ...currentIntervals };
    },

    getDefaults(): SM2Intervals {
        return { ...DEFAULT_INTERVALS };
    },

    /** Format interval for display on rating buttons */
    formatLabel(rating: keyof SM2Intervals): string {
        const v = currentIntervals[rating];
        if (rating === 'again' || rating === 'hard') {
            // Minutes
            if (v < 60) return `${v}m`;
            return `${Math.round(v / 60)}h`;
        }
        // Days
        if (v === 1) return '1d';
        return `${v}d`;
    },
};
