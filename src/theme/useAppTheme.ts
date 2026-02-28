import { useMemo } from 'react';
import { useThemeStore } from '../store/useThemeStore';
import theme from './theme';

const darkColors = {
    // Core
    primary: '#a985ff',
    primaryDark: '#8a63e5',
    primaryLight: '#c4b5fd',

    // Backgrounds
    bg: {
        primary: '#150f23',
        card: '#1e1832',
        cardBorder: 'rgba(255, 255, 255, 0.08)',
        elevated: 'rgba(255, 255, 255, 0.05)',
        input: 'rgba(255, 255, 255, 0.04)',
        glass: 'rgba(30, 27, 46, 0.6)',
        glassBorder: 'rgba(255, 255, 255, 0.08)',
        codeBg: '#232136',
        tabBar: 'rgba(21, 15, 35, 0.92)',
        overlay: 'rgba(0, 0, 0, 0.5)',
    },

    // Text
    text: {
        primary: '#E6EDF3',
        secondary: '#8B949E',
        tertiary: '#6E7681',
        heading: '#FFFFFF',
    },

    // Borders
    border: {
        primary: 'rgba(255, 255, 255, 0.08)',
        secondary: 'rgba(255, 255, 255, 0.05)',
        focus: '#a985ff',
    },

    // StatusBar
    statusBar: 'light-content' as 'light-content' | 'dark-content',

    // These stay the same across themes
    difficulty: theme.colors.difficulty,
    rating: theme.colors.rating,
    pastel: theme.colors.pastel,
    overlay: theme.colors.overlay,
    transparent: theme.colors.transparent,
};

const lightColors: typeof darkColors = {
    // Core
    primary: '#a985ff',
    primaryDark: '#7c5cc5',
    primaryLight: '#c4b5fd',

    // Backgrounds
    bg: {
        primary: '#f6f5f8',
        card: '#ffffff',
        cardBorder: 'rgba(0, 0, 0, 0.06)',
        elevated: '#f1f5f9',
        input: '#f1f5f9',
        glass: 'rgba(255, 255, 255, 0.85)',
        glassBorder: 'rgba(0, 0, 0, 0.08)',
        codeBg: '#f5f3ff',
        tabBar: 'rgba(255, 255, 255, 0.95)',
        overlay: 'rgba(0, 0, 0, 0.3)',
    },

    // Text
    text: {
        primary: '#1e293b',
        secondary: '#64748b',
        tertiary: '#94a3b8',
        heading: '#0f172a',
    },

    // Borders
    border: {
        primary: 'rgba(0, 0, 0, 0.08)',
        secondary: 'rgba(0, 0, 0, 0.05)',
        focus: '#a985ff',
    },

    // StatusBar
    statusBar: 'dark-content' as 'light-content' | 'dark-content',

    // Same across themes
    difficulty: theme.colors.difficulty,
    rating: theme.colors.rating,
    pastel: theme.colors.pastel,
    overlay: theme.colors.overlay,
    transparent: theme.colors.transparent,
};

export type ThemeColors = typeof darkColors;

export function useAppTheme() {
    const isDarkMode = useThemeStore((s) => s.isDarkMode);

    const colors = useMemo(
        () => (isDarkMode ? darkColors : lightColors),
        [isDarkMode]
    );

    return {
        isDarkMode,
        colors,
        spacing: theme.spacing,
        borderRadius: theme.borderRadius,
        typography: theme.typography,
        shadows: theme.shadows,
    };
}
