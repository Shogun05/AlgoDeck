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

    async deleteAll(): Promise<void> {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM revision_logs');
    },
};
