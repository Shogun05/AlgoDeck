import { create } from 'zustand';
import { Notebook } from '../types';
import { notebookService } from '../db/notebookService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVE_NOTEBOOK_KEY = 'algodeck_active_notebook';

interface NotebookState {
    notebooks: Notebook[];
    /** null = "All Notebooks", number = specific notebook, 'starred' = starred filter */
    activeNotebookId: number | null | 'starred';
    loading: boolean;

    loadNotebooks: () => Promise<void>;
    setActiveNotebook: (id: number | null | 'starred') => Promise<void>;
    createNotebook: (name: string, color?: string) => Promise<number>;
    updateNotebook: (id: number, data: { name?: string; color?: string }) => Promise<void>;
    deleteNotebook: (id: number) => Promise<void>;
    initActiveNotebook: () => Promise<void>;
}

export const useNotebookStore = create<NotebookState>((set, get) => ({
    notebooks: [],
    activeNotebookId: null,
    loading: false,

    initActiveNotebook: async () => {
        try {
            const val = await AsyncStorage.getItem(ACTIVE_NOTEBOOK_KEY);
            if (val === 'starred') {
                set({ activeNotebookId: 'starred' });
            } else if (val) {
                set({ activeNotebookId: parseInt(val, 10) });
            }
        } catch { /* ignore */ }
    },

    loadNotebooks: async () => {
        set({ loading: true });
        try {
            const notebooks = await notebookService.getAll();
            set({ notebooks, loading: false });
        } catch (err) {
            console.error('Failed to load notebooks:', err);
            set({ loading: false });
        }
    },

    setActiveNotebook: async (id) => {
        set({ activeNotebookId: id });
        try {
            if (id === null) {
                await AsyncStorage.removeItem(ACTIVE_NOTEBOOK_KEY);
            } else {
                await AsyncStorage.setItem(ACTIVE_NOTEBOOK_KEY, String(id));
            }
        } catch { /* ignore */ }
    },

    createNotebook: async (name, color) => {
        const id = await notebookService.create(name, color);
        await get().loadNotebooks();
        return id;
    },

    updateNotebook: async (id, data) => {
        await notebookService.update(id, data);
        await get().loadNotebooks();
    },

    deleteNotebook: async (id) => {
        await notebookService.delete(id);
        const { activeNotebookId } = get();
        if (activeNotebookId === id) {
            await get().setActiveNotebook(null);
        }
        await get().loadNotebooks();
    },
}));
