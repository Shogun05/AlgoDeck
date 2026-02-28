import React, { useState, useMemo, useRef } from 'react';
import {
    View, Text, TextInput, ScrollView, TouchableOpacity,
    StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { solutionService } from '../db/solutionService';
import { SolutionTier, SolutionLanguage } from '../types';
import { SyntaxHighlighter } from '../components/SyntaxHighlighter';
import theme from '../theme/theme';
import { useAppTheme, ThemeColors } from '../theme/useAppTheme';
import { hapticService } from '../services/haptics';

const TIERS: { key: SolutionTier; label: string; icon: string }[] = [
    { key: 'brute', label: 'Brute Force', icon: '🐢' },
    { key: 'optimized', label: 'Optimized', icon: '⚡' },
    { key: 'best', label: 'Best', icon: '🚀' },
];

const LANGUAGES: { key: SolutionLanguage; label: string; icon: string }[] = [
    { key: 'python', label: 'Python', icon: '🐍' },
    { key: 'cpp', label: 'C++', icon: '⚙️' },
    { key: 'java', label: 'Java', icon: '☕' },
];

interface TierState {
    language: SolutionLanguage;
    code: string;
    explanation: string;
    timeComplexity: string;
    spaceComplexity: string;
    savedCount: number;
}

const emptyTierState = (): TierState => ({
    language: 'python',
    code: '',
    explanation: '',
    timeComplexity: '',
    spaceComplexity: '',
    savedCount: 0,
});

/** Convert 4-space indentation to 2-space */
function compress4to2(code: string): string {
    return code.replace(/^( +)/gm, (match) => {
        const count4 = Math.floor(match.length / 4);
        const remainder = match.length % 4;
        if (count4 > 0) {
            return '  '.repeat(count4) + ' '.repeat(remainder);
        }
        return match;
    });
}

export const AddSolutionScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { questionId, questionTitle, initialTier, editSolution } = route.params;
    const isEditMode = !!editSolution;
    const { colors, isDarkMode } = useAppTheme();
    const styles = useMemo(() => createStyles(colors, isDarkMode), [isDarkMode]);
    const scrollRef = useRef<ScrollView>(null);

    const [tier, setTier] = useState<SolutionTier>(editSolution?.tier || initialTier || 'brute');
    const [loading, setLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Separate state per tier — pre-fill the editing tier if in edit mode
    const [tierStates, setTierStates] = useState<Record<SolutionTier, TierState>>(() => {
        const base: Record<SolutionTier, TierState> = {
            brute: emptyTierState(),
            optimized: emptyTierState(),
            best: emptyTierState(),
        };
        if (editSolution) {
            base[editSolution.tier as SolutionTier] = {
                language: editSolution.language,
                code: editSolution.code,
                explanation: editSolution.explanation || '',
                timeComplexity: editSolution.time_complexity || '',
                spaceComplexity: editSolution.space_complexity || '',
                savedCount: 0,
            };
        }
        return base;
    });

    // Helper to update current tier's state
    const current = tierStates[tier];
    const updateField = <K extends keyof TierState>(field: K, value: TierState[K]) => {
        setTierStates(prev => ({
            ...prev,
            [tier]: { ...prev[tier], [field]: value },
        }));
    };

    const handleCodeChange = (text: string) => {
        updateField('code', text);
    };

    const handlePaste = async () => {
        hapticService.light();
        try {
            const text = await Clipboard.getStringAsync();
            if (text) {
                const compressed = compress4to2(text);
                updateField('code', current.code + compressed);
            }
        } catch {
            Alert.alert('Error', 'Could not read clipboard');
        }
    };

    const handleSave = async () => {
        if (!current.code.trim()) {
            hapticService.warning();
            Alert.alert('Required', 'Please enter the solution code');
            return;
        }
        setLoading(true);
        try {
            hapticService.success();
            if (isEditMode) {
                await solutionService.update(editSolution.id, {
                    tier,
                    language: current.language,
                    code: compress4to2(current.code.trim()),
                    explanation: current.explanation.trim(),
                    time_complexity: current.timeComplexity.trim(),
                    space_complexity: current.spaceComplexity.trim(),
                });
                Alert.alert('✅ Solution Updated', 'Your solution has been updated.', [
                    { text: 'OK', onPress: () => navigation.goBack() },
                ]);
            } else {
                await solutionService.create({
                    question_id: questionId,
                    tier,
                    language: current.language,
                    code: compress4to2(current.code.trim()),
                    explanation: current.explanation.trim(),
                    time_complexity: current.timeComplexity.trim(),
                    space_complexity: current.spaceComplexity.trim(),
                });
                // Increment saved count for this tier, clear the editor
                setTierStates(prev => ({
                    ...prev,
                    [tier]: {
                        ...emptyTierState(),
                        language: prev[tier].language,
                        savedCount: prev[tier].savedCount + 1,
                    },
                }));
                setShowPreview(false);
                Alert.alert(
                    '✅ Solution Saved',
                    `${TIERS.find(t => t.key === tier)!.label} solution #${current.savedCount + 1} saved.`,
                );
            }
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
        setLoading(false);
    };

    const handleSkip = () => {
        navigation.goBack();
    };

    const totalSaved = tierStates.brute.savedCount + tierStates.optimized.savedCount + tierStates.best.savedCount;

    return (
        <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleSkip}>
                    <Text style={styles.skipText}>
                        {totalSaved > 0 ? 'Done' : 'Skip'}
                    </Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEditMode ? 'Edit Solution' : 'Add Solution'}</Text>
                <View style={{ width: 50 }} />
            </View>

            {/* Question context pill */}
            <View style={styles.contextPill}>
                <Ionicons name="document-text" size={14} color={colors.primary} />
                <Text style={styles.contextText} numberOfLines={1}>{questionTitle}</Text>
            </View>

            <ScrollView
                ref={scrollRef}
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                {/* Tier Selector */}
                <View style={styles.field}>
                    <Text style={styles.label}>Solution Tier</Text>
                    <View style={styles.tierRow}>
                        {TIERS.map(t => (
                            <TouchableOpacity
                                key={t.key}
                                style={[
                                    styles.tierBtn,
                                    tier === t.key && styles.tierBtnActive,
                                ]}
                                onPress={() => { hapticService.selection(); setTier(t.key); setShowPreview(false); }}
                            >
                                <Text style={styles.tierIcon}>{t.icon}</Text>
                                <Text style={[
                                    styles.tierText,
                                    tier === t.key && styles.tierTextActive,
                                ]}>
                                    {t.label}
                                </Text>
                                {tierStates[t.key].savedCount > 0 && (
                                    <View style={styles.tierBadge}>
                                        <Text style={styles.tierBadgeText}>
                                            {tierStates[t.key].savedCount}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Saved count banner for current tier */}
                {current.savedCount > 0 && (
                    <View style={styles.savedBanner}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.difficulty.easy} />
                        <Text style={styles.savedBannerText}>
                            {current.savedCount} {TIERS.find(t => t.key === tier)!.label} solution{current.savedCount > 1 ? 's' : ''} saved
                        </Text>
                        <Text style={styles.savedBannerSub}>Add another below</Text>
                    </View>
                )}

                {/* Language Selector */}
                <View style={styles.field}>
                    <Text style={styles.label}>Language</Text>
                    <View style={styles.langRow}>
                        {LANGUAGES.map(l => (
                            <TouchableOpacity
                                key={l.key}
                                style={[
                                    styles.langBtn,
                                    current.language === l.key && styles.langBtnActive,
                                ]}
                                onPress={() => { hapticService.selection(); updateField('language', l.key); }}
                            >
                                <Text style={styles.langIcon}>{l.icon}</Text>
                                <Text style={[
                                    styles.langText,
                                    current.language === l.key && styles.langTextActive,
                                ]}>
                                    {l.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Code Input */}
                <View style={styles.field}>
                    <View style={styles.labelRow}>
                        <Text style={styles.label}>Code</Text>
                        <View style={styles.codeActions}>
                            <TouchableOpacity onPress={handlePaste} style={styles.actionChip}>
                                <Ionicons name="clipboard-outline" size={14} color={colors.primary} />
                                <Text style={styles.actionChipText}>Paste</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { hapticService.light(); setShowPreview(!showPreview); }} style={styles.actionChip}>
                                <Text style={styles.actionChipText}>
                                    {showPreview ? '✏️ Edit' : '👁 Preview'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    {showPreview && current.code.trim() ? (
                        <View style={styles.previewContainer}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={styles.previewScroll}>
                                    <SyntaxHighlighter code={compress4to2(current.code)} language={current.language} />
                                </ScrollView>
                            </ScrollView>
                        </View>
                    ) : (
                        <TextInput
                            style={[styles.input, styles.codeInput]}
                            value={current.code}
                            onChangeText={handleCodeChange}
                            placeholder={getPlaceholder(current.language)}
                            placeholderTextColor={colors.text.tertiary}
                            multiline
                            textAlignVertical="top"
                            autoCapitalize="none"
                            autoCorrect={false}
                            spellCheck={false}
                        />
                    )}
                </View>

                {/* Explanation */}
                <View style={styles.field}>
                    <Text style={styles.label}>Explanation</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={current.explanation}
                        onChangeText={v => updateField('explanation', v)}
                        placeholder="Explain the approach, key insight, or trick used..."
                        placeholderTextColor={colors.text.tertiary}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>

                {/* Complexity Row */}
                <View style={styles.complexityRow}>
                    <View style={[styles.field, { flex: 1 }]}>
                        <Text style={styles.label}>Time Complexity</Text>
                        <TextInput
                            style={styles.input}
                            value={current.timeComplexity}
                            onChangeText={v => updateField('timeComplexity', v)}
                            placeholder="O(n)"
                            placeholderTextColor={colors.text.tertiary}
                            autoCapitalize="none"
                        />
                    </View>
                    <View style={[styles.field, { flex: 1 }]}>
                        <Text style={styles.label}>Space Complexity</Text>
                        <TextInput
                            style={styles.input}
                            value={current.spaceComplexity}
                            onChangeText={v => updateField('spaceComplexity', v)}
                            placeholder="O(1)"
                            placeholderTextColor={colors.text.tertiary}
                            autoCapitalize="none"
                        />
                    </View>
                </View>
            </ScrollView>

            {/* Save Button */}
            <View style={styles.bottomAction}>
                <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSave}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="code-slash" size={20} color="#fff" />
                            <Text style={styles.saveBtnText}>
                                {isEditMode ? 'Update' : 'Save'} {TIERS.find(t => t.key === tier)!.label} Solution
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

function getPlaceholder(lang: SolutionLanguage): string {
    switch (lang) {
        case 'python':
            return 'def solution(nums):\n  # your code here\n  pass';
        case 'cpp':
            return 'class Solution {\npublic:\n  vector<int> solve(vector<int>& nums) {\n    // your code here\n  }\n};';
        case 'java':
            return 'class Solution {\n  public int[] solve(int[] nums) {\n    // your code here\n  }\n}';
    }
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.bg.primary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 12,
    },
    skipText: {
        color: colors.text.secondary,
        fontSize: 16,
        fontWeight: '500',
    },
    headerTitle: {
        color: colors.text.heading,
        fontSize: 18,
        fontWeight: '700',
    },
    contextPill: {
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? 'rgba(169,133,255,0.1)' : 'rgba(169,133,255,0.08)',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 6,
        gap: 6,
        marginBottom: 8,
        maxWidth: '80%',
    },
    contextText: {
        color: colors.primary,
        fontSize: 13,
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 20,
    },
    field: {
        marginBottom: 20,
    },
    label: {
        color: colors.text.secondary,
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        marginLeft: 4,
        marginRight: 4,
    },
    codeActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: isDark ? 'rgba(169,133,255,0.1)' : 'rgba(169,133,255,0.08)',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    actionChipText: {
        color: colors.primary,
        fontSize: 13,
        fontWeight: '600',
    },
    input: {
        backgroundColor: colors.bg.input,
        borderWidth: isDark ? 0 : 1,
        borderColor: colors.bg.cardBorder,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: colors.text.primary,
        fontSize: 15,
    },
    codeInput: {
        minHeight: 180,
        fontFamily: theme.typography.families.mono,
        fontSize: 13,
        lineHeight: 20,
        paddingTop: 14,
    },
    textArea: {
        minHeight: 100,
        paddingTop: 14,
        lineHeight: 22,
    },
    previewContainer: {
        backgroundColor: colors.bg.codeBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
        overflow: 'hidden',
    },
    previewScroll: {
        padding: 16,
        maxHeight: 250,
    },
    // Tier
    tierRow: {
        flexDirection: 'row',
        gap: 10,
    },
    tierBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: colors.bg.input,
        borderWidth: 1,
        borderColor: colors.bg.cardBorder,
        gap: 4,
    },
    tierBtnActive: {
        backgroundColor: isDark ? 'rgba(169,133,255,0.15)' : 'rgba(169,133,255,0.1)',
        borderColor: colors.primary,
    },
    tierIcon: {
        fontSize: 20,
    },
    tierText: {
        color: colors.text.secondary,
        fontSize: 12,
        fontWeight: '600',
    },
    tierTextActive: {
        color: colors.primary,
        fontWeight: '700',
    },
    tierBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: colors.difficulty.easy,
        borderRadius: 10,
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tierBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '800',
    },
    savedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(63,185,80,0.1)',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 8,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(63,185,80,0.15)',
    },
    savedBannerText: {
        color: colors.difficulty.easy,
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },
    savedBannerSub: {
        color: colors.text.tertiary,
        fontSize: 11,
        fontWeight: '500',
    },
    // Language
    langRow: {
        flexDirection: 'row',
        gap: 10,
    },
    langBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: colors.bg.input,
        borderWidth: 1,
        borderColor: colors.bg.cardBorder,
        gap: 6,
    },
    langBtnActive: {
        backgroundColor: isDark ? 'rgba(169,133,255,0.15)' : 'rgba(169,133,255,0.1)',
        borderColor: colors.primary,
    },
    langIcon: {
        fontSize: 16,
    },
    langText: {
        color: colors.text.secondary,
        fontSize: 14,
        fontWeight: '500',
    },
    langTextActive: {
        color: colors.primary,
        fontWeight: '700',
    },
    // Complexity row
    complexityRow: {
        flexDirection: 'row',
        gap: 12,
    },
    // Bottom
    bottomAction: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingVertical: 20,
        paddingBottom: 36,
    },
    saveBtn: {
        height: 56,
        borderRadius: 20,
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        ...theme.shadows.glow,
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
});
