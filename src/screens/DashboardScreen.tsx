import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    StatusBar, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuestionStore } from '../store/useQuestionStore';
import { useRevisionStore } from '../store/useRevisionStore';
import { QuestionCard } from '../components/QuestionCard';
import { exportJSON, shareFile } from '../services/exportService';
import { importJSON } from '../services/importService';
import theme from '../theme/theme';

export const DashboardScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { totalCount, recentQuestions, loadQuestions, loadRecent } = useQuestionStore();
    const { dueCount, streak, loadStats, loadDueCards } = useRevisionStore();
    const [exporting, setExporting] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadQuestions();
            loadRecent();
            loadStats();
        }, [])
    );

    const handleExport = async () => {
        setExporting(true);
        try {
            const path = await exportJSON();
            await shareFile(path);
        } catch (e: any) {
            Alert.alert('Export Failed', e.message);
        }
        setExporting(false);
    };

    const handleImport = async () => {
        const result = await importJSON();
        if (result.success) {
            Alert.alert('Import Successful', result.message);
            loadQuestions();
            loadRecent();
            loadStats();
        } else {
            Alert.alert('Import', result.message);
        }
    };

    return (
        <View style={styles.screen}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.bg.dark} />
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.logo}>
                            <Ionicons name="layers" size={22} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.appName}>AlgoDeck</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.profileBtn}
                        onPress={() => navigation.navigate('Settings')}
                    >
                        <Ionicons name="person" size={20} color={theme.colors.text.secondary} />
                    </TouchableOpacity>
                </View>

                {/* Stat Cards Carousel */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.statCarousel}
                    style={{ marginBottom: 24 }}
                >
                    {/* Total Qs Card — pink gradient */}
                    <View style={[styles.statCard, styles.statCardPink]}>
                        <View style={styles.statIcon}>
                            <Ionicons name="library" size={16} color="#fff" />
                        </View>
                        <View>
                            <Text style={styles.statNumber}>{totalCount}</Text>
                            <Text style={styles.statLabel}>TOTAL QS</Text>
                        </View>
                    </View>

                    {/* Due Today Card — blue gradient */}
                    <View style={[styles.statCard, styles.statCardBlue]}>
                        <View style={styles.statIcon}>
                            <Ionicons name="notifications" size={16} color="#fff" />
                        </View>
                        <View>
                            <Text style={styles.statNumber}>{dueCount}</Text>
                            <Text style={styles.statLabel}>DUE TODAY</Text>
                        </View>
                    </View>

                    {/* Streak Card — green gradient */}
                    <View style={[styles.statCard, styles.statCardGreen]}>
                        <View style={styles.statIcon}>
                            <Ionicons name="flame" size={16} color="#fff" />
                        </View>
                        <View>
                            <Text style={styles.statNumber}>{streak}</Text>
                            <Text style={styles.statLabel}>DAY STREAK</Text>
                        </View>
                    </View>
                </ScrollView>

                {/* Primary Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.startRevisionBtn}
                        onPress={() => {
                            loadDueCards();
                            navigation.navigate('Revision');
                        }}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="play-circle" size={24} color="#fff" />
                        <Text style={styles.startRevisionText}>Start Revision</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.addQuestionBtn}
                        onPress={() => navigation.navigate('AddQuestion')}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="add" size={20} color={theme.colors.primary} />
                        <Text style={styles.addQuestionText}>Add New Question</Text>
                    </TouchableOpacity>
                </View>

                {/* Quick Actions Row */}
                <View style={styles.quickRow}>
                    <TouchableOpacity style={styles.quickCard} onPress={handleExport} disabled={exporting}>
                        <View style={[styles.quickIcon, { backgroundColor: 'rgba(169,133,255,0.15)' }]}>
                            <Ionicons name="cloud-upload" size={20} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.quickLabel}>{exporting ? 'Exporting...' : 'Export Data'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickCard} onPress={handleImport}>
                        <View style={[styles.quickIcon, { backgroundColor: 'rgba(88,166,255,0.15)' }]}>
                            <Ionicons name="cloud-download" size={20} color="#58a6ff" />
                        </View>
                        <Text style={styles.quickLabel}>Import Backup</Text>
                    </TouchableOpacity>
                </View>

                {/* Recent Activity */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Browse')}>
                        <Text style={styles.seeAll}>View All</Text>
                    </TouchableOpacity>
                </View>

                {recentQuestions.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="albums-outline" size={48} color={theme.colors.text.tertiary} />
                        <Text style={styles.emptyText}>No questions yet</Text>
                        <Text style={styles.emptySubtext}>Tap "Add New Question" to get started</Text>
                    </View>
                ) : (
                    recentQuestions.map(q => (
                        <QuestionCard
                            key={q.id}
                            question={q}
                            onPress={() => navigation.navigate('QuestionDetail', { questionId: q.id })}
                        />
                    ))
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: theme.colors.bg.dark,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 56,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    logo: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: 'rgba(169,133,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    appName: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -0.5,
    },
    profileBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Stat cards
    statCarousel: {
        paddingRight: 20,
        gap: 14,
    },
    statCard: {
        width: 140,
        height: 160,
        borderRadius: 24,
        padding: 18,
        justifyContent: 'space-between',
        overflow: 'hidden',
    },
    statCardPink: {
        backgroundColor: '#ff9a9e',
    },
    statCardBlue: {
        backgroundColor: '#4facfe',
    },
    statCardGreen: {
        backgroundColor: '#84fab0',
    },
    statIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statNumber: {
        fontSize: 36,
        fontWeight: '800',
        color: '#fff',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.85)',
        letterSpacing: 1,
        marginTop: 2,
    },
    // Actions
    actions: {
        gap: 12,
        marginBottom: 20,
    },
    startRevisionBtn: {
        height: 56,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        ...theme.shadows.glow,
        // gradient fallback — solid primary
        backgroundColor: theme.colors.primary,
    },
    startRevisionText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    addQuestionBtn: {
        height: 48,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 2,
        borderColor: 'rgba(169,133,255,0.25)',
    },
    addQuestionText: {
        color: theme.colors.primary,
        fontSize: 15,
        fontWeight: '700',
    },
    // Quick actions
    quickRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 28,
    },
    quickCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        padding: 16,
        alignItems: 'center',
        gap: 10,
    },
    quickIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickLabel: {
        color: theme.colors.text.primary,
        fontSize: 13,
        fontWeight: '600',
    },
    // Section header
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    seeAll: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    // Empty state
    emptyState: {
        alignItems: 'center',
        paddingVertical: 48,
        gap: 8,
    },
    emptyText: {
        color: theme.colors.text.secondary,
        fontSize: 16,
        fontWeight: '600',
    },
    emptySubtext: {
        color: theme.colors.text.tertiary,
        fontSize: 13,
    },
});
