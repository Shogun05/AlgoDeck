import { Notebook } from '../types';
import { getNow } from '../utils/helpers';
import { WEB_KEYS, loadTable, saveTable, nextId } from './webStorage';
import { questionService } from './questionService';

const KEY = WEB_KEYS.notebooks;

export const notebookService = {
    async getAll(): Promise<Notebook[]> {
        return loadTable<Notebook>(KEY).sort((a, b) => a.name.localeCompare(b.name));
    },

    async getById(id: number): Promise<Notebook | null> {
        return loadTable<Notebook>(KEY).find(n => n.id === id) ?? null;
    },

    async create(name: string, color: string = '#a985ff'): Promise<number> {
        const all = loadTable<Notebook>(KEY);
        const id = nextId(all);
        all.push({ id, name, color, created_at: getNow() });
        saveTable(KEY, all);
        return id;
    },

    async update(id: number, data: { name?: string; color?: string }): Promise<void> {
        const all = loadTable<Notebook>(KEY);
        const idx = all.findIndex(n => n.id === id);
        if (idx === -1) return;
        all[idx] = { ...all[idx], ...data };
        saveTable(KEY, all);
    },

    async delete(id: number): Promise<void> {
        // Unassign questions from this notebook
        const questions = await questionService.getAll(id);
        for (const q of questions) {
            await questionService.update(q.id, { notebook_id: null });
        }
        saveTable(KEY, loadTable<Notebook>(KEY).filter(n => n.id !== id));
    },

    async getQuestionCount(id: number): Promise<number> {
        return (await questionService.getAll(id)).length;
    },
};
