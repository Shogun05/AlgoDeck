import React, { useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Question } from '../types';
import { DifficultyBadge, TagChip } from './TagChip';
import { formatRelativeDate } from '../utils/helpers';
import { useWebImage } from '../hooks/useWebImage';
import theme from '../theme/theme';
import { useAppTheme, ThemeColors } from '../theme/useAppTheme';

interface QuestionCardProps {
    question: Question;
    onPress: () => void;
    onLongPress?: () => void;
    isSelected?: boolean;
    selectionMode?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question, onPress, onLongPress, isSelected, selectionMode }) => {
    const { colors, isDarkMode } = useAppTheme();
    const styles = useMemo(() => createStyles(colors, isDarkMode), [isDarkMode]);

    const displayImageUri = useWebImage(question?.screenshot_path);

    return (
        <TouchableOpacity
            style={[styles.card, isSelected && styles.cardSelected]}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.7}
        >
            {selectionMode && (
                <View style={styles.selectionOverlay}>
                    <Ionicons
                        name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                        size={24}
                        color={isSelected ? colors.primary : colors.text.tertiary}
                    />
                </View>
            )}
            <View style={styles.content}>
                {displayImageUri ? (
                    <Image
                        source={{ uri: displayImageUri }}
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
    cardSelected: {
        borderColor: colors.primary,
        backgroundColor: isDark ? 'rgba(169, 133, 255, 0.08)' : 'rgba(169, 133, 255, 0.04)',
    },
    selectionOverlay: {
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 10,
        backgroundColor: colors.bg.card,
        borderRadius: 12,
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
