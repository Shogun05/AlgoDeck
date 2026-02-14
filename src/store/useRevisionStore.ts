import { create } from 'zustand';
import { Question } from '../types';
import { questionService } from '../db/questionService';
import { revisionService } from '../db/revisionService';
import { calculateSM2, RATING_MAP } from '../services/sm2';
import { getNow } from '../utils/helpers';

interface RevisionState {
    dueCards: Question[];
    currentIndex: number;
    dueCount: number;
    streak: number;
    loading: boolean;

    loadDueCards: () => Promise<void>;
    submitRating: (questionId: number, rating: string) => Promise<void>;
    loadStats: () => Promise<void>;
    nextCard: () => void;
    reset: () => void;
}

export const useRevisionStore = create<RevisionState>((set, get) => ({
    dueCards: [],
    currentIndex: 0,
    dueCount: 0,
    streak: 0,
    loading: false,

    loadDueCards: async () => {
        set({ loading: true });
        try {
            const dueCards = await questionService.getDueToday();
            set({ dueCards, dueCount: dueCards.length, currentIndex: 0, loading: false });
        } catch (err) {
            console.error('Failed to load due cards:', err);
            set({ loading: false });
        }
    },

    submitRating: async (questionId: number, rating: string) => {
        const quality = RATING_MAP[rating] ?? 3;
        const question = get().dueCards.find(q => q.id === questionId);
        if (!question) return;

        const result = calculateSM2(
            quality,
            question.repetition,
            question.interval,
            question.ease_factor,
        );

        await questionService.update(questionId, {
            repetition: result.repetition,
            interval: result.interval,
            ease_factor: result.easeFactor,
            next_review_date: result.nextReviewDate,
            last_reviewed: getNow(),
        });

        await revisionService.log(questionId, rating);

        // Reload stats
        const streak = await revisionService.getStreak();
        const dueCount = await questionService.getDueTodayCount();
        set({ streak, dueCount });
    },

    loadStats: async () => {
        try {
            const streak = await revisionService.getStreak();
            const dueCount = await questionService.getDueTodayCount();
            set({ streak, dueCount });
        } catch (err) {
            console.error('Failed to load stats:', err);
        }
    },

    nextCard: () => {
        const { currentIndex, dueCards } = get();
        if (currentIndex < dueCards.length - 1) {
            set({ currentIndex: currentIndex + 1 });
        }
    },

    reset: () => {
        set({ currentIndex: 0 });
    },
}));
