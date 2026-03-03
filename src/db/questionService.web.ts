import { Question, Difficulty } from '../types';
import { getNow, getToday } from '../utils/helpers';
import { WEB_KEYS, loadTable, saveTable, nextId, saveWebImage } from './webStorage';

const KEY = WEB_KEYS.questions;

const parseQuestion = (q: any): Question => ({
    ...q,
    tags: Array.isArray(q.tags) ? q.tags : JSON.parse(q.tags || '[]'),
});

export const questionService = {
    async getAll(notebookId?: number | null): Promise<Question[]> {
        const all = loadTable<Question>(KEY).map(parseQuestion);
        const sorted = all.sort((a, b) => b.created_at.localeCompare(a.created_at));
        if (notebookId != null) return sorted.filter(q => q.notebook_id === notebookId);
        return sorted;
    },

    async getById(id: number): Promise<Question | null> {
        return loadTable<Question>(KEY).map(parseQuestion).find(q => q.id === id) ?? null;
    },

    async create(data: {
        title: string;
        difficulty: Difficulty;
        tags: string[];
        screenshot_path: string;
        ocr_text: string;
        notes: string;
        priority: number;
        notebook_id?: number | null;
    }): Promise<number> {
        const all = loadTable<Question>(KEY);
        const id = nextId(all);

        let finalScreenshotPath = data.screenshot_path;
        if (finalScreenshotPath && finalScreenshotPath.startsWith('data:image')) {
            finalScreenshotPath = await saveWebImage(id, finalScreenshotPath);
        }

        const q: Question = {
            id,
            title: data.title,
            difficulty: data.difficulty,
            tags: data.tags,
            screenshot_path: finalScreenshotPath,
            ocr_text: data.ocr_text,
            notes: data.notes,
            priority: data.priority,
            notebook_id: data.notebook_id ?? null,
            created_at: getNow(),
            last_reviewed: null,
            next_review_date: null,
            interval: 0,
            ease_factor: 2.5,
            repetition: 0,
        };
        all.push(q);
        saveTable(KEY, all);
        return id;
    },

    async update(id: number, data: Partial<Question>): Promise<void> {
        const all = loadTable<Question>(KEY);
        const idx = all.findIndex(q => q.id === id);
        if (idx === -1) return;

        let finalScreenshotPath = data.screenshot_path;
        if (finalScreenshotPath && finalScreenshotPath.startsWith('data:image')) {
            finalScreenshotPath = await saveWebImage(id, finalScreenshotPath);
        }

        const updatedData = { ...data };
        if (finalScreenshotPath !== undefined) {
            updatedData.screenshot_path = finalScreenshotPath;
        }

        all[idx] = { ...all[idx], ...updatedData };
        saveTable(KEY, all);
    },

    async delete(id: number): Promise<void> {
        saveTable(KEY, loadTable<Question>(KEY).filter(q => q.id !== id));
    },

    async search(query: string, filters?: { difficulty?: Difficulty; tag?: string }): Promise<Question[]> {
        const all = loadTable<Question>(KEY).map(parseQuestion);
        const q = (query || '').toLowerCase();
        return all.filter(question => {
            const matchQ = !q
                || question.title.toLowerCase().includes(q)
                || (question.ocr_text || '').toLowerCase().includes(q)
                || (question.notes || '').toLowerCase().includes(q)
                || question.tags.some(t => t.toLowerCase().includes(q));
            const matchD = !filters?.difficulty || question.difficulty === filters.difficulty;
            const matchT = !filters?.tag || question.tags.includes(filters.tag);
            return matchQ && matchD && matchT;
        }).sort((a, b) => b.created_at.localeCompare(a.created_at));
    },

    async searchFTS(query: string, filters?: any): Promise<Question[]> {
        return this.search(query, filters);
    },

    async getAllTags(): Promise<string[]> {
        const tagSet = new Set<string>();
        loadTable<Question>(KEY).map(parseQuestion).forEach(q => q.tags.forEach(t => tagSet.add(t)));
        return Array.from(tagSet).sort();
    },

    async getStarred(): Promise<Question[]> {
        const all = loadTable<Question>(KEY).map(parseQuestion);
        return all.filter(q => q.priority === 1).sort((a, b) => b.created_at.localeCompare(a.created_at));
    },

    async getDueToday(notebookId?: number | null): Promise<Question[]> {
        const today = getToday();
        const all = loadTable<Question>(KEY).map(parseQuestion);
        return all.filter(q => {
            const matchNb = notebookId == null || q.notebook_id === notebookId;
            const isDue = !q.next_review_date || q.next_review_date <= today;
            return matchNb && isDue;
        });
    },

    async getRecentlyAdded(limit: number = 5): Promise<Question[]> {
        const all = loadTable<Question>(KEY).map(parseQuestion);
        return all.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
    },

    async getCount(): Promise<number> {
        return loadTable<Question>(KEY).length;
    },

    async getDueTodayCount(): Promise<number> {
        const today = getToday();
        const all = loadTable<Question>(KEY).map(parseQuestion);
        return all.filter(q => !q.next_review_date || q.next_review_date <= today).length;
    },
};
