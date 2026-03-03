import React, { useState, useMemo, useRef } from 'react';
import {
    View, Text, TextInput, ScrollView, TouchableOpacity,
    StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
    Modal, TouchableWithoutFeedback,
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

const PRESET_COMPLEXITIES = [
    'O(1)',
    'O(log n)',
    'O(n)',
    'O(n log n)',
    'O(n²)',
    'O(n³)',
    'O(2ⁿ)',
    'O(n!)'
];

interface TierState {
    language: SolutionLanguage;
    code: string;
    explanation: string;
    timeComplexity: string;
    spaceComplexity: string;
    timeMode: 'dropdown' | 'custom';
    spaceMode: 'dropdown' | 'custom';
    savedCount: number;
}

const emptyTierState = (): TierState => ({
    language: 'python',
    code: '',
    explanation: '',
    timeComplexity: '',
    spaceComplexity: '',
    timeMode: 'dropdown',
    spaceMode: 'dropdown',
    savedCount: 0,
});

/** Convert any indentation to 2-space (for storage in database) */
function compress4to2(code: string): string {
    // Replace each group of 4 spaces with 2 spaces (handles 4-space indentation)
    return code.replace(/^    /gm, '  ');
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
                timeMode: (editSolution.time_complexity && !PRESET_COMPLEXITIES.includes(editSolution.time_complexity)) ? 'custom' : 'dropdown',
                spaceMode: (editSolution.space_complexity && !PRESET_COMPLEXITIES.includes(editSolution.space_complexity)) ? 'custom' : 'dropdown',
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

    const [complexityPicker, setComplexityPicker] = useState<{ visible: boolean; field: 'timeComplexity' | 'spaceComplexity' | null }>({ visible: false, field: null });

    const renderComplexityField = (field: 'timeComplexity' | 'spaceComplexity', label: string, placeholder: string) => {
        const modeField = field === 'timeComplexity' ? 'timeMode' : 'spaceMode';
        const mode = current[modeField];
        const val = current[field];

        if (mode === 'custom') {
            return (
                <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>{label}</Text>
                    <View style={styles.customInputRow}>
                        <TextInput
                            style={[styles.input, styles.customInputBox]}
                            value={val}
                            onChangeText={v => updateField(field, v)}
                            placeholder={placeholder}
                            placeholderTextColor={colors.text.tertiary}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            style={styles.revertBtn}
                            onPress={() => { hapticService.light(); updateField(modeField, 'dropdown'); }}
                        >
                            <Ionicons name="list" size={18} color={colors.text.tertiary} />
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        return (
            <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>{label}</Text>
                <TouchableOpacity
                    style={styles.dropdownTrigger}
                    onPress={() => { hapticService.light(); setComplexityPicker({ visible: true, field }); }}
                    activeOpacity={0.7}
                >
                    <Text style={val ? styles.dropdownValue : styles.dropdownPlaceholder} numberOfLines={1}>
                        {val || placeholder}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={colors.text.tertiary} />
                </TouchableOpacity>
            </View>
        );
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
                                    <SyntaxHighlighter code={compress4to2(current.code)} language={current.language} tabSize={2} />
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
                    {renderComplexityField('timeComplexity', 'Time Complexity', 'O(n)')}
                    {renderComplexityField('spaceComplexity', 'Space Complexity', 'O(1)')}
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
            {/* Complexity Picker Modal */}
            <Modal
                visible={complexityPicker.visible}
                transparent
                animationType="fade"
                onRequestClose={() => setComplexityPicker({ visible: false, field: null })}
            >
                <TouchableOpacity
                    style={styles.modalOverlayCenter}
                    activeOpacity={1}
                    onPress={() => setComplexityPicker({ visible: false, field: null })}
                >
                    <TouchableOpacity activeOpacity={1} onPress={() => { }} style={styles.centerModalContent}>
                        <Text style={styles.centerModalTitle}>
                            Select {complexityPicker.field === 'timeComplexity' ? 'Time' : 'Space'} Complexity
                        </Text>
                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
                            {PRESET_COMPLEXITIES.map(comp => (
                                <TouchableOpacity
                                    key={comp}
                                    style={styles.complexityOptionRow}
                                    onPress={() => {
                                        hapticService.selection();
                                        if (complexityPicker.field) {
                                            updateField(complexityPicker.field, comp);
                                        }
                                        setComplexityPicker({ visible: false, field: null });
                                    }}
                                >
                                    <View style={styles.complexityRadio}>
                                        {complexityPicker.field && current[complexityPicker.field] === comp && (
                                            <View style={styles.complexityRadioInner} />
                                        )}
                                    </View>
                                    <Text style={styles.complexityOptionText}>{comp}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                style={styles.complexityOptionRow}
                                onPress={() => {
                                    hapticService.selection();
                                    if (complexityPicker.field) {
                                        const modeField = complexityPicker.field === 'timeComplexity' ? 'timeMode' : 'spaceMode';
                                        updateField(modeField, 'custom');
                                        updateField(complexityPicker.field, '');
                                    }
                                    setComplexityPicker({ visible: false, field: null });
                                }}
                            >
                                <Ionicons name="create-outline" size={20} color={colors.text.secondary} style={{ marginRight: 8, marginLeft: -2 }} />
                                <Text style={styles.complexityOptionText}>Custom...</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
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
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bg.input,
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 48,
        borderWidth: isDark ? 0 : 1,
        borderColor: colors.bg.cardBorder,
        justifyContent: 'space-between',
    },
    dropdownValue: {
        flex: 1,
        color: colors.text.primary,
        fontSize: 14,
        fontWeight: '500',
    },
    dropdownPlaceholder: {
        flex: 1,
        color: colors.text.tertiary,
        fontSize: 14,
    },
    customInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    customInputBox: {
        flex: 1,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
    },
    revertBtn: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
        height: 48, // approx to match input
        paddingHorizontal: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: isDark ? 0 : 1,
        borderLeftWidth: 0,
        borderColor: colors.bg.cardBorder,
    },
    // Center Modal
    centerModalContent: {
        backgroundColor: colors.bg.card,
        borderRadius: 16,
        marginHorizontal: 30,
        padding: 24,
        width: '85%',
        alignSelf: 'center',
        ...theme.shadows.card,
        maxHeight: '90%',
    },
    modalOverlayCenter: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
    },
    centerModalTitle: {
        color: colors.text.heading,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
        textAlign: 'center',
    },
    complexityOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
    },
    complexityRadio: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: colors.text.tertiary,
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    complexityRadioInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
    },
    complexityOptionText: {
        color: colors.text.primary,
        fontSize: 15,
        fontWeight: '500',
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
