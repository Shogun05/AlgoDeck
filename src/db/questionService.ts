import { getDatabase } from './database';
import { Question, QuestionRow, Difficulty } from '../types';
import { getNow, getToday } from '../utils/helpers';

const rowToQuestion = (row: QuestionRow): Question => ({
    ...row,
    difficulty: row.difficulty as Difficulty,
    tags: JSON.parse(row.tags || '[]'),
});

export const questionService = {
    async getAll(): Promise<Question[]> {
        const db = await getDatabase();
        const rows = await db.getAllAsync<QuestionRow>('SELECT * FROM questions ORDER BY created_at DESC');
        return rows.map(rowToQuestion);
    },

    async getById(id: number): Promise<Question | null> {
        const db = await getDatabase();
        const row = await db.getFirstAsync<QuestionRow>('SELECT * FROM questions WHERE id = ?', [id]);
        return row ? rowToQuestion(row) : null;
    },

    async create(data: {
        title: string;
        difficulty: Difficulty;
        tags: string[];
        screenshot_path: string;
        ocr_text: string;
        notes: string;
        priority: number;
    }): Promise<number> {
        const db = await getDatabase();
        const now = getNow();
        const result = await db.runAsync(
            `INSERT INTO questions (title, difficulty, tags, screenshot_path, ocr_text, notes, priority, created_at, interval, ease_factor, repetition)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 2.5, 0)`,
            [data.title, data.difficulty, JSON.stringify(data.tags), data.screenshot_path, data.ocr_text, data.notes, data.priority, now]
        );
        return result.lastInsertRowId;
    },

    async update(id: number, data: Partial<{
        title: string;
        difficulty: Difficulty;
        tags: string[];
        screenshot_path: string;
        ocr_text: string;
        notes: string;
        priority: number;
        last_reviewed: string;
        next_review_date: string;
        interval: number;
        ease_factor: number;
        repetition: number;
    }>): Promise<void> {
        const db = await getDatabase();
        const fields: string[] = [];
        const values: any[] = [];

        if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
        if (data.difficulty !== undefined) { fields.push('difficulty = ?'); values.push(data.difficulty); }
        if (data.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(data.tags)); }
        if (data.screenshot_path !== undefined) { fields.push('screenshot_path = ?'); values.push(data.screenshot_path); }
        if (data.ocr_text !== undefined) { fields.push('ocr_text = ?'); values.push(data.ocr_text); }
        if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
        if (data.priority !== undefined) { fields.push('priority = ?'); values.push(data.priority); }
        if (data.last_reviewed !== undefined) { fields.push('last_reviewed = ?'); values.push(data.last_reviewed); }
        if (data.next_review_date !== undefined) { fields.push('next_review_date = ?'); values.push(data.next_review_date); }
        if (data.interval !== undefined) { fields.push('interval = ?'); values.push(data.interval); }
        if (data.ease_factor !== undefined) { fields.push('ease_factor = ?'); values.push(data.ease_factor); }
        if (data.repetition !== undefined) { fields.push('repetition = ?'); values.push(data.repetition); }

        if (fields.length === 0) return;
        values.push(id);
        await db.runAsync(`UPDATE questions SET ${fields.join(', ')} WHERE id = ?`, values);
    },

    async delete(id: number): Promise<void> {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM questions WHERE id = ?', [id]);
    },

    async search(query: string, filters?: { difficulty?: Difficulty; tag?: string }): Promise<Question[]> {
        const db = await getDatabase();
        let sql = 'SELECT * FROM questions WHERE 1=1';
        const params: any[] = [];

        if (query) {
            sql += ' AND (title LIKE ? OR ocr_text LIKE ? OR tags LIKE ?)';
            const q = `%${query}%`;
            params.push(q, q, q);
        }
        if (filters?.difficulty) {
            sql += ' AND difficulty = ?';
            params.push(filters.difficulty);
        }
        if (filters?.tag) {
            sql += ' AND tags LIKE ?';
            params.push(`%"${filters.tag}"%`);
        }

        sql += ' ORDER BY created_at DESC';
        const rows = await db.getAllAsync<QuestionRow>(sql, params);
        return rows.map(rowToQuestion);
    },

    async getDueToday(): Promise<Question[]> {
        const db = await getDatabase();
        const today = getToday();
        const rows = await db.getAllAsync<QuestionRow>(
            'SELECT * FROM questions WHERE next_review_date IS NULL OR next_review_date <= ? ORDER BY next_review_date ASC',
            [today]
        );
        return rows.map(rowToQuestion);
    },

    async getRecentlyAdded(limit: number = 5): Promise<Question[]> {
        const db = await getDatabase();
        const rows = await db.getAllAsync<QuestionRow>(
            'SELECT * FROM questions ORDER BY created_at DESC LIMIT ?',
            [limit]
        );
        return rows.map(rowToQuestion);
    },

    async getCount(): Promise<number> {
        const db = await getDatabase();
        const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM questions');
        return row?.count ?? 0;
    },

    async getDueTodayCount(): Promise<number> {
        const db = await getDatabase();
        const today = getToday();
        const row = await db.getFirstAsync<{ count: number }>(
            'SELECT COUNT(*) as count FROM questions WHERE next_review_date IS NULL OR next_review_date <= ?',
            [today]
        );
        return row?.count ?? 0;
    },

    async getAllTags(): Promise<string[]> {
        const db = await getDatabase();
        const rows = await db.getAllAsync<{ tags: string }>('SELECT DISTINCT tags FROM questions');
        const tagSet = new Set<string>();
        rows.forEach(row => {
            const parsed = JSON.parse(row.tags || '[]');
            parsed.forEach((t: string) => tagSet.add(t));
        });
        return Array.from(tagSet).sort();
    },
};
