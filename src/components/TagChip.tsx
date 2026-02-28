import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import theme from '../theme/theme';
import { useAppTheme, ThemeColors } from '../theme/useAppTheme';

interface TagChipProps {
    label: string;
    color?: string;
    small?: boolean;
}

export const TagChip: React.FC<TagChipProps> = ({ label, color, small }) => {
    const { colors, isDarkMode } = useAppTheme();
    const styles = useMemo(() => createStyles(colors, isDarkMode), [isDarkMode]);

    return (
        <View style={[
            styles.chip,
            small && styles.chipSmall,
        ]}>
            <Text style={[styles.label, small && styles.labelSmall]}>
                {label}
            </Text>
        </View>
    );
};

interface DifficultyBadgeProps {
    difficulty: string;
    small?: boolean;
}

export const DifficultyBadge: React.FC<DifficultyBadgeProps> = ({ difficulty, small }) => {
    const { colors, isDarkMode } = useAppTheme();
    const styles = useMemo(() => createStyles(colors, isDarkMode), [isDarkMode]);

    const getStyles = () => {
        switch (difficulty) {
            case 'Easy':
                return { bg: colors.difficulty.easyBg, text: colors.difficulty.easy };
            case 'Medium':
                return { bg: colors.difficulty.mediumBg, text: colors.difficulty.medium };
            case 'Hard':
                return { bg: colors.difficulty.hardBg, text: colors.difficulty.hard };
            default:
                return { bg: 'rgba(139,148,158,0.15)', text: colors.text.secondary };
        }
    };
    const s = getStyles();
    return (
        <View style={[styles.diffBadge, { backgroundColor: s.bg }, small && styles.chipSmall]}>
            <Text style={[styles.diffText, { color: s.text }, small && styles.labelSmall]}>
                {difficulty}
            </Text>
        </View>
    );
};

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    chip: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginRight: 6,
        marginBottom: 4,
        backgroundColor: isDark ? 'rgba(139,148,158,0.12)' : 'rgba(139,148,158,0.08)',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(139,148,158,0.15)' : 'rgba(139,148,158,0.12)',
    },
    chipSmall: {
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    label: {
        color: colors.text.secondary,
        fontSize: theme.typography.sizes.xxs,
        fontWeight: theme.typography.weights.medium,
    },
    labelSmall: {
        fontSize: 9,
    },
    diffBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.full,
    },
    diffText: {
        fontSize: theme.typography.sizes.xxs,
        fontWeight: theme.typography.weights.bold,
    },
});
