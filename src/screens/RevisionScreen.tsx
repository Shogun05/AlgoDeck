import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Alert,
    Image, Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useRevisionStore } from '../store/useRevisionStore';
import { useQuestionStore } from '../store/useQuestionStore';
import { useNotebookStore } from '../store/useNotebookStore';
import { solutionService } from '../db/solutionService';
import { Solution, SolutionTier } from '../types';
import { CodeBlock } from '../components/CodeBlock';
import { DifficultyBadge } from '../components/TagChip';
import theme from '../theme/theme';
import { useAppTheme, ThemeColors } from '../theme/useAppTheme';
import { hapticService } from '../services/haptics';
import { sm2IntervalService } from '../services/sm2Intervals';
import ReactNativeZoomableView from '@openspacelabs/react-native-zoomable-view/src/ReactNativeZoomableView';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const RevisionScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { dueCards, currentIndex, submitRating, nextCard, loadDueCards, loadStats } = useRevisionStore();
    const { updateQuestion } = useQuestionStore();
    const { activeNotebookId } = useNotebookStore();
    const [showAnswer, setShowAnswer] = useState(false);
    const [isStarred, setIsStarred] = useState(false);
    const [solutions, setSolutions] = useState<Solution[]>([]);
    const [activeTier, setActiveTier] = useState<SolutionTier>('brute');
    const [showImageZoom, setShowImageZoom] = useState(false);
    const [showOcrText, setShowOcrText] = useState(false);
    const { colors, isDarkMode } = useAppTheme();
    const styles = useMemo(() => createStyles(colors, isDarkMode), [isDarkMode]);

    const [ratingLabels, setRatingLabels] = useState([
        { label: 'AGAIN', sublabel: '< 1m', ratingKey: 'again', bg: 'rgba(248,81,73,0.12)', text: '#F85149' },
        { label: 'HARD', sublabel: '2d', ratingKey: 'hard', bg: 'rgba(251,146,60,0.12)', text: '#fb923c' },
        { label: 'GOOD', sublabel: '4d', ratingKey: 'good', bg: 'rgba(169,133,255,0.15)', text: '#a985ff' },
        { label: 'EASY', sublabel: '8d', ratingKey: 'easy', bg: 'rgba(45,212,191,0.12)', text: '#2dd4bf' },
    ]);

    const currentCard = dueCards[currentIndex];
    const totalCards = dueCards.length;

    useEffect(() => {
        sm2IntervalService.init().then(() => {
            const iv = sm2IntervalService.getIntervals();
            setRatingLabels([
                { label: 'AGAIN', sublabel: sm2IntervalService.formatLabel('again'), ratingKey: 'again', bg: 'rgba(248,81,73,0.12)', text: '#F85149' },
                { label: 'HARD', sublabel: sm2IntervalService.formatLabel('hard'), ratingKey: 'hard', bg: 'rgba(251,146,60,0.12)', text: '#fb923c' },
                { label: 'GOOD', sublabel: sm2IntervalService.formatLabel('good'), ratingKey: 'good', bg: 'rgba(169,133,255,0.15)', text: '#a985ff' },
                { label: 'EASY', sublabel: sm2IntervalService.formatLabel('easy'), ratingKey: 'easy', bg: 'rgba(45,212,191,0.12)', text: '#2dd4bf' },
            ]);
        });
    }, []);

    useFocusEffect(
        useCallback(() => {
            const nbId = activeNotebookId === 'starred' ? undefined : (activeNotebookId ?? undefined);
            loadDueCards(nbId);
        }, [activeNotebookId])
    );

    // Load solutions & star state when card changes
    React.useEffect(() => {
        if (currentCard) {
            setIsStarred(currentCard.priority === 1);
            solutionService.getByQuestionId(currentCard.id).then(sols => {
                setSolutions(sols);
                // Default to the first tier that has solutions
                if (sols.length > 0) {
                    const firstTier = sols[0].tier;
                    setActiveTier(firstTier);
                } else {
                    setActiveTier('brute');
                }
            });
        }
        setShowAnswer(false);
        setShowOcrText(false);
    }, [currentIndex, currentCard?.id]);

    const handleToggleStar = async () => {
        if (!currentCard) return;
        hapticService.light();
        const newPriority = isStarred ? 0 : 1;
        setIsStarred(!isStarred);
        await updateQuestion(currentCard.id, { priority: newPriority });
    };

    const handleRating = async (ratingKey: string) => {
        if (!currentCard?.id) return;
        hapticService.medium();
        await submitRating(currentCard.id, ratingKey);
        setShowAnswer(false);
        if (currentIndex >= totalCards - 1) {
            loadStats();
            Alert.alert(
                '🎉 Session Complete!',
                `You reviewed ${totalCards} card${totalCards !== 1 ? 's' : ''}. Great job!`,
                [{ text: 'Done', onPress: () => navigation.goBack() }]
            );
        } else {
            nextCard();
        }
    };

    const tierSolutions = solutions.filter(s => s.tier === activeTier);
    const TIER_LABELS: Record<SolutionTier, string> = {
        brute: 'Brute Force',
        optimized: 'Optimized',
        best: 'Best',
    };

    if (!currentCard) {
        return (
            <View style={styles.screen}>
                <View style={styles.emptyCenter}>
                    <Text style={styles.emptyEmoji}>🎉</Text>
                    <Text style={styles.emptyTitle}>All Caught Up!</Text>
                    <Text style={styles.emptySubtext}>No cards due for review. Come back later.</Text>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Text style={styles.backBtnText}>Back to Dashboard</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.closeBtn}
                >
                    <Ionicons name="close" size={22} color={colors.text.secondary} />
                </TouchableOpacity>
                <Text style={styles.counter}>Card {currentIndex + 1}/{totalCards}</Text>
                <TouchableOpacity style={styles.starBtn} onPress={handleToggleStar}>
                    <Ionicons
                        name={isStarred ? 'star' : 'star-outline'}
                        size={22}
                        color={isStarred ? '#fbbf24' : colors.text.tertiary}
                    />
                </TouchableOpacity>
            </View>

            {/* Title Pill */}
            <View style={styles.titlePill}>
                <View style={[
                    styles.titleDot,
                    {
                        backgroundColor: currentCard.difficulty === 'Easy' ? colors.difficulty.easy
                            : currentCard.difficulty === 'Medium' ? colors.difficulty.medium
                                : colors.difficulty.hard
                    }
                ]} />
                <Text style={styles.titlePillText} numberOfLines={1}>{currentCard.title}</Text>
            </View>

            {/* Card Content */}
            <View style={styles.cardContainer}>
                <View style={styles.card}>
                    {!showAnswer ? (
                        <TouchableOpacity
                            style={styles.cardFront}
                            onPress={() => { hapticService.medium(); setShowAnswer(true); }}
                            activeOpacity={0.9}
                        >
                            {currentCard.screenshot_path ? (
                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    onPress={() => { hapticService.light(); setShowImageZoom(true); }}
                                    style={styles.cardImageWrap}
                                >
                                    <Image
                                        source={{ uri: currentCard.screenshot_path }}
                                        style={styles.cardImage}
                                        resizeMode="contain"
                                    />
                                    <View style={styles.cardImageZoomHint}>
                                        <Ionicons name="expand-outline" size={12} color="#fff" />
                                    </View>
                                </TouchableOpacity>
                            ) : null}
                            {currentCard.ocr_text ? (
                                <View style={styles.ocrSection}>
                                    <TouchableOpacity
                                        style={styles.ocrToggleBtn}
                                        onPress={() => setShowOcrText(!showOcrText)}
                                    >
                                        <Ionicons name="scan-outline" size={14} color={colors.primary} />
                                        <Text style={styles.ocrToggleText}>
                                            {showOcrText ? 'Hide extracted text' : 'View extracted text'}
                                        </Text>
                                        <Ionicons name={showOcrText ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
                                    </TouchableOpacity>
                                    {showOcrText && (
                                        <ScrollView style={styles.ocrScroll} nestedScrollEnabled>
                                            <Text style={styles.ocrText}>{currentCard.ocr_text}</Text>
                                        </ScrollView>
                                    )}
                                </View>
                            ) : null}
                            <Text style={styles.questionTitle}>{currentCard.title}</Text>
                            <DifficultyBadge difficulty={currentCard.difficulty} />
                            <View style={styles.tapHint}>
                                <Ionicons name="eye-outline" size={20} color={colors.text.tertiary} />
                                <Text style={styles.tapHintText}>Tap to reveal solution</Text>
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.cardBack}>
                            {/* Flip back button */}
                            <TouchableOpacity
                                style={styles.flipBackBtn}
                                onPress={() => { hapticService.medium(); setShowAnswer(false); }}
                            >
                                <Ionicons name="arrow-back" size={16} color={colors.primary} />
                                <Text style={styles.flipBackText}>Back to question</Text>
                            </TouchableOpacity>
                            {/* Solution tier tabs */}
                            {solutions.length > 0 ? (
                                <>
                                    <View style={styles.tabBar}>
                                        {(['brute', 'optimized', 'best'] as SolutionTier[]).map(t => {
                                            const count = solutions.filter(s => s.tier === t).length;
                                            return (
                                                <TouchableOpacity
                                                    key={t}
                                                    style={[styles.tabBtn, activeTier === t && styles.tabBtnActive]}
                                                    onPress={() => { hapticService.selection(); setActiveTier(t); }}
                                                >
                                                    <Text style={[styles.tabBtnText, activeTier === t && styles.tabBtnTextActive]}>
                                                        {TIER_LABELS[t]}
                                                    </Text>
                                                    {count > 0 && (
                                                        <View style={[styles.tabBadge, activeTier === t && styles.tabBadgeActive]}>
                                                            <Text style={[styles.tabBadgeText, activeTier === t && styles.tabBadgeTextActive]}>{count}</Text>
                                                        </View>
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                    <ScrollView style={styles.solutionContent} showsVerticalScrollIndicator={false}>
                                        {tierSolutions.length > 0 ? tierSolutions.map((sol, i) => (
                                            <View key={sol.id} style={styles.solutionBlock}>
                                                {tierSolutions.length > 1 && (
                                                    <Text style={styles.solIndex}>Solution {i + 1}</Text>
                                                )}
                                                <CodeBlock
                                                    code={sol.code}
                                                    language={sol.language || 'python'}
                                                    timeComplexity={sol.time_complexity}
                                                    spaceComplexity={sol.space_complexity}
                                                />
                                                {sol.explanation ? (
                                                    <View style={styles.explanationSection}>
                                                        <Text style={styles.explanLabel}>💡 LOGIC BREAKDOWN</Text>
                                                        <Text style={styles.explanText}>{sol.explanation}</Text>
                                                    </View>
                                                ) : null}
                                            </View>
                                        )) : (
                                            <Text style={styles.noSolution}>No {TIER_LABELS[activeTier]} solution added</Text>
                                        )}
                                        {currentCard.notes ? (
                                            <View style={styles.notesSection}>
                                                <Text style={styles.explanLabel}>📝 NOTES</Text>
                                                <Text style={styles.explanText}>{currentCard.notes}</Text>
                                            </View>
                                        ) : null}
                                        {currentCard.ocr_text ? (
                                            <View style={styles.notesSection}>
                                                <TouchableOpacity
                                                    style={styles.ocrToggleBtn}
                                                    onPress={() => setShowOcrText(!showOcrText)}
                                                >
                                                    <Ionicons name="scan-outline" size={14} color={colors.primary} />
                                                    <Text style={styles.ocrToggleText}>
                                                        {showOcrText ? 'Hide OCR Text' : '🔍 View OCR Text'}
                                                    </Text>
                                                    <Ionicons name={showOcrText ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
                                                </TouchableOpacity>
                                                {showOcrText && (
                                                    <Text style={styles.ocrText}>{currentCard.ocr_text}</Text>
                                                )}
                                            </View>
                                        ) : null}
                                    </ScrollView>
                                </>
                            ) : (
                                <ScrollView style={styles.solutionContent}>
                                    {currentCard.notes ? (
                                        <View style={styles.explanationSection}>
                                            <Text style={styles.explanLabel}>📝 NOTES</Text>
                                            <Text style={styles.explanText}>{currentCard.notes}</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.noSolution}>No solutions or notes added yet</Text>
                                    )}
                                </ScrollView>
                            )}
                        </View>
                    )}
                </View>
            </View>

            {/* Rating Buttons */}
            {showAnswer && (
                <View style={styles.ratingFooter}>
                    <View style={styles.ratingRow}>
                        {ratingLabels.map(r => (
                            <TouchableOpacity
                                key={r.ratingKey}
                                style={[styles.ratingBtn, { backgroundColor: r.bg }]}
                                onPress={() => handleRating(r.ratingKey)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.ratingLabel, { color: r.text }]}>{r.label}</Text>
                                <Text style={[styles.ratingSublabel, { color: r.text }]}>{r.sublabel}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {/* Image Zoom Modal */}
            {currentCard.screenshot_path ? (
                <Modal
                    visible={showImageZoom}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowImageZoom(false)}
                >
                    <View style={styles.zoomOverlay}>
                        <TouchableOpacity
                            style={styles.zoomCloseBtn}
                            onPress={() => setShowImageZoom(false)}
                        >
                            <Ionicons name="close" size={28} color="#fff" />
                        </TouchableOpacity>
                        <ReactNativeZoomableView
                            maxZoom={5}
                            minZoom={1}
                            initialZoom={1}
                            bindToBorders
                            style={{ flex: 1, width: '100%' }}
                        >
                            <Image
                                source={{ uri: currentCard.screenshot_path }}
                                style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.5 }}
                                resizeMode="contain"
                            />
                        </ReactNativeZoomableView>
                    </View>
                </Modal>
            ) : null}
        </View>
    );
};

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.bg.primary,
    },
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 8,
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    counter: {
        color: colors.text.secondary,
        fontSize: 14,
        fontWeight: '600',
    },
    starBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Title pill
    titlePill: {
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginVertical: 12,
        gap: 8,
        maxWidth: SCREEN_WIDTH - 80,
    },
    titleDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    titlePillText: {
        color: colors.text.primary,
        fontSize: 14,
        fontWeight: '700',
    },
    // Card
    cardContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    card: {
        flex: 1,
        backgroundColor: colors.bg.card,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.bg.cardBorder,
        overflow: 'hidden',
        ...theme.shadows.lg,
    },
    cardFront: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        gap: 20,
    },
    cardImageWrap: {
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    },
    cardImage: {
        width: '100%',
        height: 160,
        borderRadius: 12,
    },
    cardImageZoomHint: {
        position: 'absolute',
        bottom: 6,
        right: 6,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 6,
        padding: 4,
    },
    questionTitle: {
        color: colors.text.heading,
        fontSize: 24,
        fontWeight: '800',
        textAlign: 'center',
    },
    tapHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 24,
    },
    tapHintText: {
        color: colors.text.tertiary,
        fontSize: 13,
        fontWeight: '500',
    },
    cardBack: {
        flex: 1,
    },
    flipBackBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 4,
    },
    flipBackText: {
        color: colors.primary,
        fontSize: 13,
        fontWeight: '600',
    },
    tabBar: {
        flexDirection: 'row',
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(169,133,255,0.1)',
        gap: 4,
    },
    tabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 4,
    },
    tabBtnActive: {
        backgroundColor: isDark ? 'rgba(169,133,255,0.12)' : 'rgba(169,133,255,0.08)',
    },
    tabBtnText: {
        color: colors.text.tertiary,
        fontSize: 11,
        fontWeight: '600',
    },
    tabBtnTextActive: {
        color: colors.primary,
        fontWeight: '700',
    },
    tabBadge: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        borderRadius: 8,
        paddingHorizontal: 5,
        paddingVertical: 1,
    },
    tabBadgeActive: {
        backgroundColor: 'rgba(169,133,255,0.2)',
    },
    tabBadgeText: {
        color: colors.text.tertiary,
        fontSize: 10,
        fontWeight: '700',
    },
    tabBadgeTextActive: {
        color: colors.primary,
    },
    solutionContent: {
        flex: 1,
        padding: 16,
    },
    solutionBlock: {
        marginBottom: 16,
    },
    solIndex: {
        color: colors.text.secondary,
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 6,
    },
    explanationSection: {
        gap: 8,
        marginTop: 8,
    },
    notesSection: {
        gap: 8,
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    },
    explanLabel: {
        color: colors.text.primary,
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    explanText: {
        color: colors.text.secondary,
        fontSize: 14,
        lineHeight: 22,
    },
    noSolution: {
        color: colors.text.tertiary,
        fontSize: 14,
        textAlign: 'center',
        marginTop: 40,
    },
    // Rating
    ratingFooter: {
        paddingHorizontal: 20,
        paddingBottom: 36,
        paddingTop: 8,
    },
    ratingRow: {
        flexDirection: 'row',
        gap: 10,
    },
    ratingBtn: {
        flex: 1,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    ratingLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    ratingSublabel: {
        fontSize: 10,
        fontWeight: '500',
        opacity: 0.6,
    },
    // Empty
    emptyCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    emptyEmoji: {
        fontSize: 48,
    },
    emptyTitle: {
        color: colors.text.heading,
        fontSize: 22,
        fontWeight: '700',
    },
    emptySubtext: {
        color: colors.text.secondary,
        fontSize: 14,
    },
    backBtn: {
        marginTop: 20,
        backgroundColor: colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 16,
    },
    backBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    // OCR text
    ocrSection: {
        width: '100%',
    },
    ocrToggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    ocrToggleText: {
        color: colors.primary,
        fontSize: 13,
        fontWeight: '600',
    },
    ocrScroll: {
        maxHeight: 150,
        backgroundColor: isDark ? 'rgba(169,133,255,0.05)' : 'rgba(169,133,255,0.04)',
        borderRadius: 12,
        padding: 12,
        marginTop: 4,
    },
    ocrText: {
        color: colors.text.secondary,
        fontSize: 12,
        fontFamily: theme.typography.families.mono,
        lineHeight: 18,
    },
    zoomOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    zoomCloseBtn: {
        position: 'absolute',
        top: 56,
        right: 20,
        zIndex: 10,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
