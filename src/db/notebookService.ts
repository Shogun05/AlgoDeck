import { getDatabase } from './database';
import { Notebook } from '../types';
import { getNow } from '../utils/helpers';

export const notebookService = {
    async getAll(): Promise<Notebook[]> {
        const db = await getDatabase();
        return db.getAllAsync<Notebook>('SELECT * FROM notebooks ORDER BY name ASC');
    },

    async getById(id: number): Promise<Notebook | null> {
        const db = await getDatabase();
        return db.getFirstAsync<Notebook>('SELECT * FROM notebooks WHERE id = ?', [id]);
    },

    async create(name: string, color: string = '#a985ff'): Promise<number> {
        const db = await getDatabase();
        const result = await db.runAsync(
            'INSERT INTO notebooks (name, color, created_at) VALUES (?, ?, ?)',
            [name, color, getNow()]
        );
        return result.lastInsertRowId;
    },

    async update(id: number, data: { name?: string; color?: string }): Promise<void> {
        const db = await getDatabase();
        const fields: string[] = [];
        const values: any[] = [];
        if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
        if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color); }
        if (fields.length === 0) return;
        values.push(id);
        await db.runAsync(`UPDATE notebooks SET ${fields.join(', ')} WHERE id = ?`, values);
    },

    async delete(id: number): Promise<void> {
        const db = await getDatabase();
        // Unassign questions from this notebook (don't delete them)
        await db.runAsync('UPDATE questions SET notebook_id = NULL WHERE notebook_id = ?', [id]);
        await db.runAsync('DELETE FROM notebooks WHERE id = ?', [id]);
    },

    async getQuestionCount(id: number): Promise<number> {
        const db = await getDatabase();
        const row = await db.getFirstAsync<{ count: number }>(
            'SELECT COUNT(*) as count FROM questions WHERE notebook_id = ?',
            [id]
        );
        return row?.count ?? 0;
    },
};
