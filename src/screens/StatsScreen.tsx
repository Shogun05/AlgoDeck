import React, { useCallback, useMemo, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { revisionService } from '../db/revisionService';
import { questionService } from '../db/questionService';
import theme from '../theme/theme';
import { useAppTheme, ThemeColors } from '../theme/useAppTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Stats {
    totalQuestions: number;
    totalReviews: number;
    todayReviews: number;
    streak: number;
    uniqueReviewed: number;
    avgPerDay: number;
    dueToday: number;
    weeklyData: { day: string; count: number }[];
    ratingBreakdown: { rating: string; count: number }[];
}

export const StatsScreen: React.FC = () => {
    const { colors, isDarkMode } = useAppTheme();
    const styles = useMemo(() => createStyles(colors, isDarkMode), [isDarkMode]);
    const [stats, setStats] = useState<Stats>({
        totalQuestions: 0,
        totalReviews: 0,
        todayReviews: 0,
        streak: 0,
        uniqueReviewed: 0,
        avgPerDay: 0,
        dueToday: 0,
        weeklyData: [],
        ratingBreakdown: [],
    });

    useFocusEffect(
        useCallback(() => {
            loadStats();
        }, [])
    );

    const loadStats = async () => {
        const [
            totalQuestions,
            totalReviews,
            todayReviews,
            streak,
            uniqueReviewed,
            avgPerDay,
            dueToday,
            weeklyData,
            ratingBreakdown,
        ] = await Promise.all([
            questionService.getCount(),
            revisionService.getTotalReviews(),
            revisionService.getTodayReviews(),
            revisionService.getStreak(),
            revisionService.getUniqueQuestionsReviewed(),
            revisionService.getAvgReviewsPerDay(),
            questionService.getDueTodayCount(),
            revisionService.getReviewsPerDay(7),
            revisionService.getRatingBreakdown(),
        ]);

        setStats({
            totalQuestions,
            totalReviews,
            todayReviews,
            streak,
            uniqueReviewed,
            avgPerDay,
            dueToday,
            weeklyData,
            ratingBreakdown,
        });
    };

    const masteryPercent = stats.totalQuestions > 0
        ? Math.round((stats.uniqueReviewed / stats.totalQuestions) * 100)
        : 0;

    const maxWeekly = Math.max(...stats.weeklyData.map(d => d.count), 1);

    const ratingColors: Record<string, string> = {
        easy: '#2dd4bf',
        good: '#a985ff',
        hard: '#fb923c',
        again: '#F85149',
    };
    const ratingLabels: Record<string, string> = {
        easy: 'Easy',
        good: 'Good',
        hard: 'Hard',
        again: 'Again',
    };
    const totalRatings = stats.ratingBreakdown.reduce((sum, r) => sum + r.count, 0) || 1;

    return (
        <View style={styles.screen}>
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Statistics</Text>
                    <Text style={styles.subtitle}>Your learning progress</Text>
                </View>

                {/* Top Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { backgroundColor: '#ff9a9e' }]}>
                        <Ionicons name="today" size={20} color="#fff" />
                        <Text style={styles.statNumber}>{stats.todayReviews}</Text>
                        <Text style={styles.statLabel}>TODAY</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#4facfe' }]}>
                        <Ionicons name="flame" size={20} color="#fff" />
                        <Text style={styles.statNumber}>{stats.streak}</Text>
                        <Text style={styles.statLabel}>STREAK</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#84fab0' }]}>
                        <Ionicons name="checkmark-done" size={20} color="#fff" />
                        <Text style={styles.statNumber}>{stats.totalReviews}</Text>
                        <Text style={styles.statLabel}>TOTAL</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#a985ff' }]}>
                        <Ionicons name="notifications" size={20} color="#fff" />
                        <Text style={styles.statNumber}>{stats.dueToday}</Text>
                        <Text style={styles.statLabel}>DUE</Text>
                    </View>
                </View>

                {/* Mastery Card */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>📊 Coverage</Text>
                    <View style={styles.masteryRow}>
                        <View style={styles.masteryInfo}>
                            <Text style={styles.masteryPercent}>{masteryPercent}%</Text>
                            <Text style={styles.masterySubtext}>
                                {stats.uniqueReviewed} of {stats.totalQuestions} questions reviewed
                            </Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${masteryPercent}%` }]} />
                        </View>
                    </View>
                </View>

                {/* Weekly Activity */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>📅 Last 7 Days</Text>
                    <View style={styles.chartContainer}>
                        {stats.weeklyData.length === 0 ? (
                            <Text style={styles.noData}>No reviews in the past week</Text>
                        ) : (
                            <View style={styles.barChart}>
                                {stats.weeklyData.map((d, i) => {
                                    const height = Math.max((d.count / maxWeekly) * 100, 4);
                                    const dayLabel = new Date(d.day).toLocaleDateString('en-US', { weekday: 'short' });
                                    return (
                                        <View key={i} style={styles.barColumn}>
                                            <Text style={styles.barCount}>{d.count}</Text>
                                            <View style={styles.barTrack}>
                                                <View style={[styles.barFill, { height: `${height}%` }]} />
                                            </View>
                                            <Text style={styles.barLabel}>{dayLabel}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                </View>

                {/* Rating Breakdown */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>🎯 Rating Breakdown</Text>
                    {stats.ratingBreakdown.length === 0 ? (
                        <Text style={styles.noData}>No reviews yet</Text>
                    ) : (
                        <View style={styles.ratingList}>
                            {['easy', 'good', 'hard', 'again'].map(rKey => {
                                const entry = stats.ratingBreakdown.find(r => r.rating === rKey);
                                const count = entry?.count || 0;
                                const pct = Math.round((count / totalRatings) * 100);
                                return (
                                    <View key={rKey} style={styles.ratingRow}>
                                        <View style={styles.ratingLabelRow}>
                                            <View style={[styles.ratingDot, { backgroundColor: ratingColors[rKey] }]} />
                                            <Text style={styles.ratingName}>{ratingLabels[rKey]}</Text>
                                            <Text style={styles.ratingCount}>{count}</Text>
                                        </View>
                                        <View style={styles.ratingBarBg}>
                                            <View style={[styles.ratingBarFill, {
                                                width: `${pct}%`,
                                                backgroundColor: ratingColors[rKey],
                                            }]} />
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* Extra metrics */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>📈 Averages</Text>
                    <View style={styles.metricsRow}>
                        <View style={styles.metricItem}>
                            <Text style={styles.metricValue}>{stats.avgPerDay}</Text>
                            <Text style={styles.metricLabel}>Reviews/Day</Text>
                        </View>
                        <View style={styles.metricDivider} />
                        <View style={styles.metricItem}>
                            <Text style={styles.metricValue}>{stats.totalQuestions}</Text>
                            <Text style={styles.metricLabel}>Total Cards</Text>
                        </View>
                        <View style={styles.metricDivider} />
                        <View style={styles.metricItem}>
                            <Text style={styles.metricValue}>{stats.uniqueReviewed}</Text>
                            <Text style={styles.metricLabel}>Unique Seen</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.bg.primary,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 56,
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.text.heading,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 14,
        color: colors.text.secondary,
        marginTop: 4,
    },
    // Stats grid
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
    },
    statCard: {
        width: (SCREEN_WIDTH - 52) / 2,
        borderRadius: 20,
        padding: 18,
        gap: 8,
    },
    statNumber: {
        fontSize: 32,
        fontWeight: '800',
        color: '#fff',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.85)',
        letterSpacing: 1,
    },
    // Section cards
    sectionCard: {
        backgroundColor: colors.bg.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.bg.cardBorder,
        padding: 20,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text.heading,
        marginBottom: 16,
    },
    noData: {
        color: colors.text.tertiary,
        fontSize: 14,
        textAlign: 'center',
        paddingVertical: 20,
    },
    // Mastery
    masteryRow: {
        gap: 12,
    },
    masteryInfo: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
    },
    masteryPercent: {
        fontSize: 36,
        fontWeight: '800',
        color: colors.primary,
    },
    masterySubtext: {
        fontSize: 13,
        color: colors.text.secondary,
    },
    progressBarBg: {
        height: 8,
        borderRadius: 4,
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
        backgroundColor: colors.primary,
    },
    // Bar chart
    chartContainer: {
        minHeight: 140,
    },
    barChart: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 140,
        gap: 6,
    },
    barColumn: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    barCount: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.text.secondary,
    },
    barTrack: {
        width: '100%',
        height: 100,
        borderRadius: 6,
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    barFill: {
        width: '100%',
        borderRadius: 6,
        backgroundColor: colors.primary,
    },
    barLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.text.tertiary,
    },
    // Rating breakdown
    ratingList: {
        gap: 14,
    },
    ratingRow: {
        gap: 6,
    },
    ratingLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    ratingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    ratingName: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: colors.text.primary,
    },
    ratingCount: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text.secondary,
    },
    ratingBarBg: {
        height: 6,
        borderRadius: 3,
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        overflow: 'hidden',
    },
    ratingBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    // Metrics
    metricsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metricItem: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    metricValue: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text.heading,
    },
    metricLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    metricDivider: {
        width: 1,
        height: 40,
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    },
});
