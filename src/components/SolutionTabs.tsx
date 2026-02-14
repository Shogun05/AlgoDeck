import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Solution, SolutionTier } from '../types';
import { solutionService } from '../db/solutionService';
import { CodeBlock } from './CodeBlock';
import theme from '../theme/theme';

interface SolutionTabsProps {
    questionId: number;
    onAddSolution?: (tier: SolutionTier) => void;
}

const TIERS: { key: SolutionTier; label: string }[] = [
    { key: 'brute', label: 'Brute Force' },
    { key: 'optimized', label: 'Optimized' },
    { key: 'best', label: 'Best' },
];

export const SolutionTabs: React.FC<SolutionTabsProps> = ({ questionId, onAddSolution }) => {
    const [activeTier, setActiveTier] = useState<SolutionTier>('brute');
    const [solutions, setSolutions] = useState<Solution[]>([]);

    useEffect(() => {
        loadSolutions();
    }, [questionId]);

    const loadSolutions = async () => {
        const all = await solutionService.getByQuestionId(questionId);
        setSolutions(all);
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
                            onPress={() => setActiveTier(t.key)}
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
                                onPress={() => onAddSolution(activeTier)}
                            >
                                <Text style={styles.addBtnText}>+ Add Solution</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    tierSolutions.map((sol, i) => (
                        <View key={sol.id} style={styles.solutionCard}>
                            {tierSolutions.length > 1 && (
                                <Text style={styles.solIndex}>Solution {i + 1}</Text>
                            )}
                            <CodeBlock
                                code={sol.code}
                                language={undefined}
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
                        onPress={() => onAddSolution(activeTier)}
                    >
                        <Text style={styles.addBtnOutlineText}>+ Add Another Solution</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
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
        backgroundColor: 'rgba(255,255,255,0.05)',
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
        backgroundColor: theme.colors.bg.dark,
        ...theme.shadows.card,
    },
    tabText: {
        fontSize: theme.typography.sizes.xs,
        fontWeight: theme.typography.weights.semibold,
        color: theme.colors.text.tertiary,
    },
    tabTextActive: {
        color: theme.colors.primary,
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
        color: theme.colors.text.tertiary,
        fontSize: theme.typography.sizes.md,
        marginBottom: theme.spacing.lg,
    },
    addBtn: {
        backgroundColor: theme.colors.primary,
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
    solIndex: {
        color: theme.colors.text.secondary,
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
        color: theme.colors.text.primary,
        fontSize: theme.typography.sizes.sm,
        fontWeight: theme.typography.weights.bold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    explainText: {
        color: theme.colors.text.secondary,
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
        color: theme.colors.primary,
        fontSize: theme.typography.sizes.sm,
        fontWeight: theme.typography.weights.semibold,
    },
});
