/**
 * AlgoDeck Theme — Matching stitch design references
 * Primary: #a985ff (Soft Periwinkle)
 * Font: Plus Jakarta Sans
 * Style: Glassmorphism, pastel gradients, dark/light mode
 */

const colors = {
    // Core
    primary: '#a985ff',
    primaryDark: '#8a63e5',
    primaryLight: '#c4b5fd',

    // Backgrounds
    bg: {
        light: '#f6f5f8',
        dark: '#150f23',
        card: 'rgba(255, 255, 255, 0.03)',
        cardLight: 'rgba(255, 255, 255, 0.8)',
        elevated: 'rgba(255, 255, 255, 0.05)',
        glass: 'rgba(30, 27, 46, 0.6)',
        glassBorder: 'rgba(255, 255, 255, 0.08)',
        codeBg: '#232136',
    },
    // Text
    text: {
        primary: '#E6EDF3',
        secondary: '#8B949E',
        tertiary: '#6E7681',
        heading: '#FFFFFF',
        dark: '#1e293b',     // For light-mode text
        muted: '#94a3b8',
    },
    // Pastel stat card gradients
    pastel: {
        pinkStart: '#ff9a9e',
        pinkEnd: '#fecfef',
        blueStart: '#4facfe',
        blueEnd: '#00f2fe',
        greenStart: '#84fab0',
        greenEnd: '#8fd3f4',
    },
    // Difficulty
    difficulty: {
        easy: '#3FB950',
        easyBg: 'rgba(63, 185, 80, 0.15)',
        medium: '#D29922',
        mediumBg: 'rgba(210, 153, 34, 0.15)',
        hard: '#F85149',
        hardBg: 'rgba(248, 81, 73, 0.15)',
    },
    // Rating buttons
    rating: {
        againBg: 'rgba(248, 81, 73, 0.15)',
        againText: '#F85149',
        hardBg: 'rgba(251, 146, 60, 0.15)',
        hardText: '#fb923c',
        goodBg: 'rgba(169, 133, 255, 0.2)',
        goodText: '#a985ff',
        easyBg: 'rgba(45, 212, 191, 0.15)',
        easyText: '#2dd4bf',
    },
    // Border
    border: {
        primary: 'rgba(255, 255, 255, 0.08)',
        secondary: 'rgba(255, 255, 255, 0.05)',
        focus: '#a985ff',
    },
    // Misc
    overlay: 'rgba(0, 0, 0, 0.6)',
    transparent: 'transparent',
};

const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    xxxxl: 48,
};

const borderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 9999,
};

const typography = {
    sizes: {
        xxs: 10,
        xs: 11,
        sm: 13,
        md: 15,
        lg: 17,
        xl: 20,
        xxl: 24,
        xxxl: 32,
        hero: 40,
    },
    weights: {
        regular: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
        extrabold: '800' as const,
    },
    families: {
        mono: 'monospace',
    },
};

const shadows = {
    soft: {
        shadowColor: '#a985ff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 4,
    },
    glow: {
        shadowColor: '#a985ff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 8,
    },
    card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 8,
    },
};

export const theme = {
    colors,
    spacing,
    borderRadius,
    typography,
    shadows,
};

export type Theme = typeof theme;
export default theme;
