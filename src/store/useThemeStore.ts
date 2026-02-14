import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';

interface ThemeState {
    isDarkMode: boolean;
    toggleTheme: () => void;
    setTheme: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            isDarkMode: true, // Default to dark mode
            toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
            setTheme: (isDark) => set({ isDarkMode: isDark }),
        }),
        {
            name: 'algodeck-theme-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
