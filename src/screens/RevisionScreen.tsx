import React, { useState, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useRevisionStore } from '../store/useRevisionStore';
import { CodeBlock } from '../components/CodeBlock';
import { DifficultyBadge } from '../components/TagChip';
import theme from '../theme/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const RATINGS = [
    { label: 'AGAIN', sublabel: '< 1m', ratingKey: 'again', bg: 'rgba(248,81,73,0.12)', text: '#F85149' },
    { label: 'HARD', sublabel: '2d', ratingKey: 'hard', bg: 'rgba(251,146,60,0.12)', text: '#fb923c' },
    { label: 'GOOD', sublabel: '4d', ratingKey: 'good', bg: 'rgba(169,133,255,0.15)', text: '#a985ff' },
    { label: 'EASY', sublabel: '8d', ratingKey: 'easy', bg: 'rgba(45,212,191,0.12)', text: '#2dd4bf' },
];

export const RevisionScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { dueCards, currentIndex, submitRating, nextCard, loadDueCards, loadStats } = useRevisionStore();
    const [showAnswer, setShowAnswer] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadDueCards();
        }, [])
    );

    const currentCard = dueCards[currentIndex];
    const totalCards = dueCards.length;

    const handleRating = async (ratingKey: string) => {
        if (!currentCard?.id) return;
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
                    <Ionicons name="close" size={22} color={theme.colors.text.secondary} />
                </TouchableOpacity>
                <Text style={styles.counter}>Card {currentIndex + 1}/{totalCards}</Text>
                <TouchableOpacity style={styles.starBtn}>
                    <Ionicons name="star" size={22} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Title Pill */}
            <View style={styles.titlePill}>
                <View style={[
                    styles.titleDot,
                    {
                        backgroundColor: currentCard.difficulty === 'Easy' ? theme.colors.difficulty.easy
                            : currentCard.difficulty === 'Medium' ? theme.colors.difficulty.medium
                                : theme.colors.difficulty.hard
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
                            onPress={() => setShowAnswer(true)}
                            activeOpacity={0.9}
                        >
                            <Text style={styles.questionTitle}>{currentCard.title}</Text>
                            <DifficultyBadge difficulty={currentCard.difficulty} />
                            <View style={styles.tapHint}>
                                <Ionicons name="eye-outline" size={20} color={theme.colors.text.tertiary} />
                                <Text style={styles.tapHintText}>Tap to reveal solution</Text>
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.cardBack}>
                            <View style={styles.tabPlaceholder}>
                                <Text style={styles.tabActiveLabel}>Solution</Text>
                            </View>
                            <View style={styles.solutionContent}>
                                {currentCard.notes ? (
                                    <View style={styles.explanationSection}>
                                        <Text style={styles.explanLabel}>💡 LOGIC BREAKDOWN</Text>
                                        <Text style={styles.explanText}>{currentCard.notes}</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.noSolution}>No notes available for this card</Text>
                                )}
                            </View>
                        </View>
                    )}
                </View>
            </View>

            {/* Rating Buttons */}
            {showAnswer && (
                <View style={styles.ratingFooter}>
                    <View style={styles.ratingRow}>
                        {RATINGS.map(r => (
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
        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: theme.colors.bg.dark,
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
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    counter: {
        color: theme.colors.text.secondary,
        fontSize: 14,
        fontWeight: '600',
    },
    starBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Title pill
    titlePill: {
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
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
        color: theme.colors.text.primary,
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
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
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
    questionTitle: {
        color: '#fff',
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
        color: theme.colors.text.tertiary,
        fontSize: 13,
        fontWeight: '500',
    },
    cardBack: {
        flex: 1,
    },
    tabPlaceholder: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(169,133,255,0.1)',
        alignItems: 'center',
    },
    tabActiveLabel: {
        color: theme.colors.primary,
        fontSize: 13,
        fontWeight: '700',
    },
    solutionContent: {
        flex: 1,
        padding: 20,
    },
    explanationSection: {
        gap: 10,
    },
    explanLabel: {
        color: theme.colors.text.primary,
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    explanText: {
        color: theme.colors.text.secondary,
        fontSize: 14,
        lineHeight: 22,
    },
    noSolution: {
        color: theme.colors.text.tertiary,
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
        color: '#fff',
        fontSize: 22,
        fontWeight: '700',
    },
    emptySubtext: {
        color: theme.colors.text.secondary,
        fontSize: 14,
    },
    backBtn: {
        marginTop: 20,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 16,
    },
    backBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});
