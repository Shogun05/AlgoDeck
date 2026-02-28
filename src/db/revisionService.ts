import { getDatabase } from './database';
import { RevisionLog } from '../types';
import { getNow } from '../utils/helpers';

export const revisionService = {
    async log(questionId: number, rating: string): Promise<number> {
        const db = await getDatabase();
        const result = await db.runAsync(
            'INSERT INTO revision_logs (question_id, rating, timestamp) VALUES (?, ?, ?)',
            [questionId, rating, getNow()]
        );
        return result.lastInsertRowId;
    },

    async getByQuestionId(questionId: number): Promise<RevisionLog[]> {
        const db = await getDatabase();
        return db.getAllAsync<RevisionLog>(
            'SELECT * FROM revision_logs WHERE question_id = ? ORDER BY timestamp DESC',
            [questionId]
        );
    },

    async getAll(): Promise<RevisionLog[]> {
        const db = await getDatabase();
        return db.getAllAsync<RevisionLog>('SELECT * FROM revision_logs ORDER BY timestamp DESC');
    },

    async getStreak(): Promise<number> {
        const db = await getDatabase();
        const rows = await db.getAllAsync<{ day: string }>(
            'SELECT DISTINCT DATE(timestamp) as day FROM revision_logs ORDER BY day DESC'
        );

        if (rows.length === 0) return 0;

        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < rows.length; i++) {
            const rowDate = new Date(rows[i].day);
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

    /** Total number of reviews ever */
    async getTotalReviews(): Promise<number> {
        const db = await getDatabase();
        const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM revision_logs');
        return row?.count ?? 0;
    },

    /** Number of reviews today */
    async getTodayReviews(): Promise<number> {
        const db = await getDatabase();
        const row = await db.getFirstAsync<{ count: number }>(
            "SELECT COUNT(*) as count FROM revision_logs WHERE DATE(timestamp) = DATE('now')"
        );
        return row?.count ?? 0;
    },

    /** Reviews per day for the last N days */
    async getReviewsPerDay(days: number = 7): Promise<{ day: string; count: number }[]> {
        const db = await getDatabase();
        return db.getAllAsync<{ day: string; count: number }>(
            `SELECT DATE(timestamp) as day, COUNT(*) as count FROM revision_logs
             WHERE timestamp >= datetime('now', '-${days} days')
             GROUP BY day ORDER BY day ASC`
        );
    },

    /** Count per rating (again/hard/good/easy) */
    async getRatingBreakdown(): Promise<{ rating: string; count: number }[]> {
        const db = await getDatabase();
        return db.getAllAsync<{ rating: string; count: number }>(
            'SELECT rating, COUNT(*) as count FROM revision_logs GROUP BY rating'
        );
    },

    /** Unique questions reviewed */
    async getUniqueQuestionsReviewed(): Promise<number> {
        const db = await getDatabase();
        const row = await db.getFirstAsync<{ count: number }>(
            'SELECT COUNT(DISTINCT question_id) as count FROM revision_logs'
        );
        return row?.count ?? 0;
    },

    /** Average reviews per day (days that had at least one review) */
    async getAvgReviewsPerDay(): Promise<number> {
        const db = await getDatabase();
        const row = await db.getFirstAsync<{ avg: number }>(
            `SELECT AVG(cnt) as avg FROM (
                SELECT COUNT(*) as cnt FROM revision_logs GROUP BY DATE(timestamp)
            )`
        );
        return Math.round((row?.avg ?? 0) * 10) / 10;
    },

    async deleteAll(): Promise<void> {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM revision_logs');
    },
};
