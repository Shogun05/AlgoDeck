import { Solution, SolutionTier, SolutionLanguage } from '../types';
import { getNow } from '../utils/helpers';
import { WEB_KEYS, loadTable, saveTable, nextId } from './webStorage';

const KEY = WEB_KEYS.solutions;

const TIER_ORDER: Record<SolutionTier, number> = { brute: 1, optimized: 2, best: 3 };

export const solutionService = {
    async getByQuestionId(questionId: number): Promise<Solution[]> {
        return loadTable<Solution>(KEY)
            .filter(s => s.question_id === questionId)
            .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.created_at.localeCompare(b.created_at));
    },

    async getByTier(questionId: number, tier: SolutionTier): Promise<Solution[]> {
        return loadTable<Solution>(KEY)
            .filter(s => s.question_id === questionId && s.tier === tier)
            .sort((a, b) => a.created_at.localeCompare(b.created_at));
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
        const all = loadTable<Solution>(KEY);
        const id = nextId(all);
        const s: Solution = { id, ...data, created_at: getNow() };
        all.push(s);
        saveTable(KEY, all);
        return id;
    },

    async update(id: number, data: Partial<Solution>): Promise<void> {
        const all = loadTable<Solution>(KEY);
        const idx = all.findIndex(s => s.id === id);
        if (idx === -1) return;
        all[idx] = { ...all[idx], ...data };
        saveTable(KEY, all);
    },

    async delete(id: number): Promise<void> {
        saveTable(KEY, loadTable<Solution>(KEY).filter(s => s.id !== id));
    },

    async getAll(): Promise<Solution[]> {
        return loadTable<Solution>(KEY)
            .sort((a, b) => {
                if (a.question_id !== b.question_id) return a.question_id - b.question_id;
                return TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.created_at.localeCompare(b.created_at);
            });
    },
};
