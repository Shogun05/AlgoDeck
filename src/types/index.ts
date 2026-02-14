export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type SolutionTier = 'brute' | 'optimized' | 'best';
export type Rating = 'again' | 'hard' | 'good' | 'easy';

export interface Question {
    id: number;
    title: string;
    difficulty: Difficulty;
    tags: string[];
    screenshot_path: string;
    ocr_text: string;
    notes: string;
    priority: number;
    created_at: string;
    last_reviewed: string | null;
    next_review_date: string | null;
    interval: number;
    ease_factor: number;
    repetition: number;
}

export interface QuestionRow {
    id: number;
    title: string;
    difficulty: string;
    tags: string;
    screenshot_path: string;
    ocr_text: string;
    notes: string;
    priority: number;
    created_at: string;
    last_reviewed: string | null;
    next_review_date: string | null;
    interval: number;
    ease_factor: number;
    repetition: number;
}

export interface Solution {
    id: number;
    question_id: number;
    tier: SolutionTier;
    code: string;
    explanation: string;
    time_complexity: string;
    space_complexity: string;
    created_at: string;
}

export interface RevisionLog {
    id: number;
    question_id: number;
    rating: string;
    timestamp: string;
}

export interface SM2Result {
    repetition: number;
    interval: number;
    easeFactor: number;
    nextReviewDate: string;
}

export interface BackupData {
    version: number;
    exported_at: string;
    questions: Question[];
    solutions: Solution[];
    revision_logs: RevisionLog[];
}
