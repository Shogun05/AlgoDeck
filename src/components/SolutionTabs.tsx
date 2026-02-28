import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Solution, SolutionTier } from '../types';
import { solutionService } from '../db/solutionService';
import { CodeBlock } from './CodeBlock';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import theme from '../theme/theme';
import { useAppTheme, ThemeColors } from '../theme/useAppTheme';
import { hapticService } from '../services/haptics';

interface SolutionTabsProps {
    questionId: number;
    onAddSolution?: (tier: SolutionTier) => void;
    onEditSolution?: (solution: Solution) => void;
}

const TIERS: { key: SolutionTier; label: string }[] = [
    { key: 'brute', label: 'Brute Force' },
    { key: 'optimized', label: 'Optimized' },
    { key: 'best', label: 'Best' },
];

export const SolutionTabs: React.FC<SolutionTabsProps> = ({ questionId, onAddSolution, onEditSolution }) => {
    const [activeTier, setActiveTier] = useState<SolutionTier>('brute');
    const [solutions, setSolutions] = useState<Solution[]>([]);
    const { colors, isDarkMode } = useAppTheme();
    const styles = useMemo(() => createStyles(colors, isDarkMode), [isDarkMode]);

    useEffect(() => {
        loadSolutions();
    }, [questionId]);

    // Also reload when screen comes back into focus (e.g. after editing)
    useFocusEffect(
        useCallback(() => {
            loadSolutions();
        }, [questionId])
    );

    const loadSolutions = async () => {
        const all = await solutionService.getByQuestionId(questionId);
        setSolutions(all);
    };

    const handleDeleteSolution = (sol: Solution) => {
        hapticService.warning();
        Alert.alert('Delete Solution', 'Remove this solution?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await solutionService.delete(sol.id);
                    loadSolutions();
                },
            },
        ]);
    };

    const tierSolutions = solutions.filter(s => s.tier === activeTier);

    return (
        <View style={styles.container}>
            {/* Tab switcher — matches flashcard_study_view stitch */}
            <View style={styles.tabBar}>
                <View style={styles.tabTrack}>
                    {TIERS.map(t => (
                        <TouchableOpacity
                            key={t.key}
                            style={[styles.tab, activeTier === t.key && styles.tabActive]}
                            onPress={() => { hapticService.selection(); setActiveTier(t.key); }}
                        >
                            <Text style={[styles.tabText, activeTier === t.key && styles.tabTextActive]}>
                                {t.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Solutions list */}
            <ScrollView style={styles.content} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {tierSolutions.length === 0 ? (
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>No {activeTier} solutions yet</Text>
                        {onAddSolution && (
                            <TouchableOpacity
                                style={styles.addBtn}
                                onPress={() => { hapticService.light(); onAddSolution(activeTier); }}
                            >
                                <Text style={styles.addBtnText}>+ Add Solution</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    tierSolutions.map((sol, i) => (
                        <View key={sol.id} style={styles.solutionCard}>
                            <View style={styles.solHeader}>
                                {tierSolutions.length > 1 && (
                                    <Text style={styles.solIndex}>Solution {i + 1}</Text>
                                )}
                                <View style={styles.solActions}>
                                    {onEditSolution && (
                                        <TouchableOpacity
                                            style={styles.solActionBtn}
                                            onPress={() => { hapticService.light(); onEditSolution(sol); }}
                                        >
                                            <Ionicons name="pencil" size={14} color={colors.primary} />
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity
                                        style={styles.solActionBtn}
                                        onPress={() => handleDeleteSolution(sol)}
                                    >
                                        <Ionicons name="trash-outline" size={14} color="#F85149" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <CodeBlock
                                code={sol.code}
                                language={sol.language || 'python'}
                                timeComplexity={sol.time_complexity}
                                spaceComplexity={sol.space_complexity}
                            />
                            {sol.explanation ? (
                                <View style={styles.explanation}>
                                    <Text style={styles.explainLabel}>💡 LOGIC BREAKDOWN</Text>
                                    <Text style={styles.explainText}>{sol.explanation}</Text>
                                </View>
                            ) : null}
                        </View>
                    ))
                )}
                {tierSolutions.length > 0 && onAddSolution && (
                    <TouchableOpacity
                        style={styles.addBtnOutline}
                        onPress={() => { hapticService.light(); onAddSolution(activeTier); }}
                    >
                        <Text style={styles.addBtnOutlineText}>+ Add Another Solution</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    );
};

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
    },
    tabBar: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(169,133,255,0.1)',
    },
    tabTrack: {
        flexDirection: 'row',
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        borderRadius: theme.borderRadius.lg,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: theme.borderRadius.md,
    },
    tabActive: {
        backgroundColor: colors.bg.primary,
        ...theme.shadows.card,
    },
    tabText: {
        fontSize: theme.typography.sizes.xs,
        fontWeight: theme.typography.weights.semibold,
        color: colors.text.tertiary,
    },
    tabTextActive: {
        color: colors.primary,
        fontWeight: theme.typography.weights.bold,
    },
    content: {
        flex: 1,
        paddingHorizontal: theme.spacing.xl,
        paddingTop: theme.spacing.lg,
    },
    empty: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xxxxl,
    },
    emptyText: {
        color: colors.text.tertiary,
        fontSize: theme.typography.sizes.md,
        marginBottom: theme.spacing.lg,
    },
    addBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: theme.spacing.xxl,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
    },
    addBtnText: {
        color: '#fff',
        fontWeight: theme.typography.weights.bold,
        fontSize: theme.typography.sizes.sm,
    },
    solutionCard: {
        marginBottom: theme.spacing.xl,
    },
    solHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    solActions: {
        flexDirection: 'row',
        gap: 8,
    },
    solActionBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(169,133,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    solIndex: {
        color: colors.text.secondary,
        fontSize: theme.typography.sizes.xs,
        fontWeight: theme.typography.weights.semibold,
        marginBottom: theme.spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    explanation: {
        marginTop: theme.spacing.lg,
        gap: theme.spacing.sm,
    },
    explainLabel: {
        color: colors.text.primary,
        fontSize: theme.typography.sizes.sm,
        fontWeight: theme.typography.weights.bold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    explainText: {
        color: colors.text.secondary,
        fontSize: theme.typography.sizes.sm,
        lineHeight: 22,
    },
    addBtnOutline: {
        borderWidth: 1,
        borderColor: 'rgba(169,133,255,0.3)',
        borderStyle: 'dashed',
        borderRadius: theme.borderRadius.md,
        paddingVertical: theme.spacing.md,
        alignItems: 'center',
        marginBottom: theme.spacing.xxl,
    },
    addBtnOutlineText: {
        color: colors.primary,
        fontSize: theme.typography.sizes.sm,
        fontWeight: theme.typography.weights.semibold,
    },
});
