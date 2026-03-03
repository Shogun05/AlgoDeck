import { RevisionLog } from '../types';
import { getNow } from '../utils/helpers';
import { WEB_KEYS, loadTable, saveTable, nextId } from './webStorage';

const KEY = WEB_KEYS.revision_logs;

export const revisionService = {
    async log(questionId: number, rating: string): Promise<number> {
        const all = loadTable<RevisionLog>(KEY);
        const id = nextId(all);
        all.push({ id, question_id: questionId, rating, timestamp: getNow() });
        saveTable(KEY, all);
        return id;
    },

    async getByQuestionId(questionId: number): Promise<RevisionLog[]> {
        return loadTable<RevisionLog>(KEY)
            .filter(r => r.question_id === questionId)
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    },

    async getAll(): Promise<RevisionLog[]> {
        return loadTable<RevisionLog>(KEY).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    },

    async getStreak(): Promise<number> {
        const all = loadTable<RevisionLog>(KEY);
        const days = [...new Set(all.map(r => r.timestamp.split('T')[0]))].sort().reverse();
        if (days.length === 0) return 0;

        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < days.length; i++) {
            const rowDate = new Date(days[i]);
            rowDate.setHours(0, 0, 0, 0);
            const expected = new Date(today);
            expected.setDate(expected.getDate() - i);
            expected.setHours(0, 0, 0, 0);
            if (rowDate.getTime() === expected.getTime()) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    },

    async getTotalReviews(): Promise<number> {
        return loadTable<RevisionLog>(KEY).length;
    },

    async getTodayReviews(): Promise<number> {
        const today = new Date().toISOString().split('T')[0];
        return loadTable<RevisionLog>(KEY).filter(r => r.timestamp.startsWith(today)).length;
    },

    async getReviewsPerDay(days: number = 7): Promise<{ day: string; count: number }[]> {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString();
        const all = loadTable<RevisionLog>(KEY).filter(r => r.timestamp >= cutoffStr);
        const map = new Map<string, number>();
        all.forEach(r => {
            const day = r.timestamp.split('T')[0];
            map.set(day, (map.get(day) || 0) + 1);
        });
        return [...map.entries()]
            .map(([day, count]) => ({ day, count }))
            .sort((a, b) => a.day.localeCompare(b.day));
    },

    async getRatingBreakdown(): Promise<{ rating: string; count: number }[]> {
        const map = new Map<string, number>();
        loadTable<RevisionLog>(KEY).forEach(r => map.set(r.rating, (map.get(r.rating) || 0) + 1));
        return [...map.entries()].map(([rating, count]) => ({ rating, count }));
    },

    async getUniqueQuestionsReviewed(): Promise<number> {
        return new Set(loadTable<RevisionLog>(KEY).map(r => r.question_id)).size;
    },

    async getAveragePerDay(): Promise<number> {
        const all = loadTable<RevisionLog>(KEY);
        if (all.length === 0) return 0;
        const days = new Set(all.map(r => r.timestamp.split('T')[0])).size;
        return Math.round((all.length / days) * 10) / 10;
    },
};
