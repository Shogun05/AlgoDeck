import React, { useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Question } from '../types';
import { DifficultyBadge, TagChip } from './TagChip';
import { formatRelativeDate } from '../utils/helpers';
import theme from '../theme/theme';
import { useAppTheme, ThemeColors } from '../theme/useAppTheme';

interface QuestionCardProps {
    question: Question;
    onPress: () => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question, onPress }) => {
    const { colors, isDarkMode } = useAppTheme();
    const styles = useMemo(() => createStyles(colors, isDarkMode), [isDarkMode]);

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.content}>
                {question.screenshot_path ? (
                    <Image
                        source={{ uri: question.screenshot_path }}
                        style={styles.thumbnail}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.thumbnail, styles.placeholderThumb]}>
                        <Text style={styles.placeholderText}>{'</>'}</Text>
                    </View>
                )}
                <View style={styles.info}>
                    <Text style={styles.title} numberOfLines={1}>{question.title}</Text>
                    <View style={styles.tagsRow}>
                        {question.tags.slice(0, 2).map((tag, i) => (
                            <TagChip key={i} label={tag} small />
                        ))}
                    </View>
                </View>
                <View style={styles.badgeWrap}>
                    <DifficultyBadge difficulty={question.difficulty} small />
                </View>
            </View>
        </TouchableOpacity>
    );
};

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    card: {
        backgroundColor: colors.bg.card,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.bg.cardBorder,
        marginBottom: theme.spacing.lg,
        ...(isDark ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 0,
        } : theme.shadows.soft),
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.lg,
        gap: theme.spacing.lg,
    },
    thumbnail: {
        width: 56,
        height: 56,
        borderRadius: theme.borderRadius.md,
    },
    placeholderThumb: {
        backgroundColor: 'rgba(169,133,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderText: {
        color: colors.primary,
        fontSize: theme.typography.sizes.md,
        fontWeight: theme.typography.weights.bold,
        fontFamily: theme.typography.families.mono,
    },
    info: {
        flex: 1,
        justifyContent: 'center',
        gap: 6,
    },
    title: {
        color: colors.text.primary,
        fontSize: theme.typography.sizes.md,
        fontWeight: theme.typography.weights.bold,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    badgeWrap: {
        alignSelf: 'flex-start',
        marginTop: 2,
    },
});
