import { create } from 'zustand';
import { Question, Difficulty } from '../types';
import { questionService } from '../db/questionService';

interface QuestionState {
    questions: Question[];
    filteredQuestions: Question[];
    recentQuestions: Question[];
    totalCount: number;
    allTags: string[];
    searchQuery: string;
    loading: boolean;

    loadQuestions: () => Promise<void>;
    loadRecent: () => Promise<void>;
    setSearchQuery: (query: string) => void;
    addQuestion: (data: {
        title: string;
        difficulty: Difficulty;
        tags: string[];
        screenshot_path?: string;
        ocr_text?: string;
        notes?: string;
        priority?: number;
    }) => Promise<number>;
    updateQuestion: (id: number, data: Partial<Question>) => Promise<void>;
    deleteQuestion: (id: number) => Promise<void>;
    searchQuestions: (query: string, filters?: { difficulty?: Difficulty; tag?: string }) => Promise<Question[]>;
    refreshCounts: () => Promise<void>;
}

export const useQuestionStore = create<QuestionState>((set, get) => ({
    questions: [],
    filteredQuestions: [],
    recentQuestions: [],
    totalCount: 0,
    allTags: [],
    searchQuery: '',
    loading: false,

    loadQuestions: async () => {
        set({ loading: true });
        try {
            const questions = await questionService.getAll();
            const totalCount = questions.length;
            const allTags = await questionService.getAllTags();
            const searchQuery = get().searchQuery;
            const filteredQuestions = searchQuery
                ? questions.filter(q =>
                    q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    q.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
                )
                : questions;
            set({ questions, filteredQuestions, totalCount, allTags, loading: false });
        } catch (err) {
            console.error('Failed to load questions:', err);
            set({ loading: false });
        }
    },

    loadRecent: async () => {
        try {
            const recentQuestions = await questionService.getRecentlyAdded(5);
            set({ recentQuestions });
        } catch (err) {
            console.error('Failed to load recent questions:', err);
        }
    },

    setSearchQuery: (query: string) => {
        const questions = get().questions;
        const filteredQuestions = query
            ? questions.filter(q =>
                q.title.toLowerCase().includes(query.toLowerCase()) ||
                q.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
            )
            : questions;
        set({ searchQuery: query, filteredQuestions });
    },

    addQuestion: async (data) => {
        const id = await questionService.create(data as any);
        await get().loadQuestions();
        await get().loadRecent();
        return id;
    },

    updateQuestion: async (id, data) => {
        const updateData: any = { ...data };
        if (data.tags) {
            updateData.tags = data.tags;
        }
        await questionService.update(id, updateData);
        await get().loadQuestions();
        await get().loadRecent();
    },

    deleteQuestion: async (id) => {
        await questionService.delete(id);
        await get().loadQuestions();
        await get().loadRecent();
    },

    searchQuestions: async (query, filters) => {
        return questionService.search(query, filters);
    },

    refreshCounts: async () => {
        const totalCount = await questionService.getCount();
        const allTags = await questionService.getAllTags();
        set({ totalCount, allTags });
    },
}));
