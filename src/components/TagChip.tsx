import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import theme from '../theme/theme';

interface TagChipProps {
    label: string;
    color?: string;
    small?: boolean;
}

export const TagChip: React.FC<TagChipProps> = ({ label, color, small }) => {
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
    const getStyles = () => {
        switch (difficulty) {
            case 'Easy':
                return { bg: theme.colors.difficulty.easyBg, text: theme.colors.difficulty.easy };
            case 'Medium':
                return { bg: theme.colors.difficulty.mediumBg, text: theme.colors.difficulty.medium };
            case 'Hard':
                return { bg: theme.colors.difficulty.hardBg, text: theme.colors.difficulty.hard };
            default:
                return { bg: 'rgba(139,148,158,0.15)', text: theme.colors.text.secondary };
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

const styles = StyleSheet.create({
    chip: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginRight: 6,
        marginBottom: 4,
        backgroundColor: 'rgba(139,148,158,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(139,148,158,0.15)',
    },
    chipSmall: {
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    label: {
        color: theme.colors.text.secondary,
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
