import { getDatabase } from './database';
import { Solution, SolutionTier, SolutionLanguage } from '../types';
import { getNow } from '../utils/helpers';

export const solutionService = {
    async getByQuestionId(questionId: number): Promise<Solution[]> {
        const db = await getDatabase();
        return db.getAllAsync<Solution>(
            'SELECT * FROM solutions WHERE question_id = ? ORDER BY CASE tier WHEN "brute" THEN 1 WHEN "optimized" THEN 2 WHEN "best" THEN 3 END, created_at ASC',
            [questionId]
        );
    },

    async getByTier(questionId: number, tier: SolutionTier): Promise<Solution[]> {
        const db = await getDatabase();
        return db.getAllAsync<Solution>(
            'SELECT * FROM solutions WHERE question_id = ? AND tier = ? ORDER BY created_at ASC',
            [questionId, tier]
        );
    },

    async create(data: {
        question_id: number;
        tier: SolutionTier;
        language: SolutionLanguage;
        code: string;
        explanation: string;
        time_complexity: string;
        space_complexity: string;
    }): Promise<number> {
        const db = await getDatabase();
        const result = await db.runAsync(
            `INSERT INTO solutions (question_id, tier, language, code, explanation, time_complexity, space_complexity, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [data.question_id, data.tier, data.language, data.code, data.explanation, data.time_complexity, data.space_complexity, getNow()]
        );
        return result.lastInsertRowId;
    },

    async update(id: number, data: Partial<{
        tier: SolutionTier;
        language: SolutionLanguage;
        code: string;
        explanation: string;
        time_complexity: string;
        space_complexity: string;
    }>): Promise<void> {
        const db = await getDatabase();
        const fields: string[] = [];
        const values: any[] = [];

        if (data.tier !== undefined) { fields.push('tier = ?'); values.push(data.tier); }
        if (data.language !== undefined) { fields.push('language = ?'); values.push(data.language); }
        if (data.code !== undefined) { fields.push('code = ?'); values.push(data.code); }
        if (data.explanation !== undefined) { fields.push('explanation = ?'); values.push(data.explanation); }
        if (data.time_complexity !== undefined) { fields.push('time_complexity = ?'); values.push(data.time_complexity); }
        if (data.space_complexity !== undefined) { fields.push('space_complexity = ?'); values.push(data.space_complexity); }

        if (fields.length === 0) return;
        values.push(id);
        await db.runAsync(`UPDATE solutions SET ${fields.join(', ')} WHERE id = ?`, values);
    },

    async delete(id: number): Promise<void> {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM solutions WHERE id = ?', [id]);
    },

    async getAll(): Promise<Solution[]> {
        const db = await getDatabase();
        return db.getAllAsync<Solution>('SELECT * FROM solutions ORDER BY question_id, tier, created_at ASC');
    },
};
