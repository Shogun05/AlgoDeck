import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    StatusBar, Alert, Modal, TextInput, FlatList,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuestionStore } from '../store/useQuestionStore';
import { useRevisionStore } from '../store/useRevisionStore';
import { useNotebookStore } from '../store/useNotebookStore';
import { QuestionCard } from '../components/QuestionCard';
import { exportZip, shareFile } from '../services/exportService';
import { importBackup } from '../services/importService';
import { hapticService } from '../services/haptics';
import theme from '../theme/theme';
import { useAppTheme, ThemeColors } from '../theme/useAppTheme';

const NOTEBOOK_COLORS = ['#a985ff', '#f472b6', '#fb923c', '#3FB950', '#58a6ff', '#fbbf24', '#2dd4bf', '#F85149'];

export const DashboardScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { totalCount, recentQuestions, loadQuestions, loadRecent } = useQuestionStore();
    const { dueCount, streak, loadStats, loadDueCards } = useRevisionStore();
    const { notebooks, activeNotebookId, loadNotebooks, setActiveNotebook, createNotebook, deleteNotebook } = useNotebookStore();
    const [exporting, setExporting] = useState(false);
    const [showNotebookModal, setShowNotebookModal] = useState(false);
    const [newNotebookName, setNewNotebookName] = useState('');
    const [newNotebookColor, setNewNotebookColor] = useState('#a985ff');
    const { colors, isDarkMode } = useAppTheme();
    const styles = useMemo(() => createStyles(colors, isDarkMode), [isDarkMode]);

    const effectiveNotebookId = activeNotebookId === 'starred' ? undefined : (activeNotebookId ?? undefined);

    useFocusEffect(
        useCallback(() => {
            loadNotebooks();
            if (activeNotebookId === 'starred') {
                loadQuestions(); // load all, then filter in display
            } else {
                loadQuestions(effectiveNotebookId ?? null);
            }
            loadRecent();
            loadStats();
        }, [activeNotebookId])
    );

    const activeNotebookName = useMemo(() => {
        if (activeNotebookId === null) return 'All Notebooks';
        if (activeNotebookId === 'starred') return 'Starred';
        const nb = notebooks.find(n => n.id === activeNotebookId);
        return nb?.name ?? 'All Notebooks';
    }, [activeNotebookId, notebooks]);

    const handleExport = async () => {
        hapticService.medium();
        setExporting(true);
        try {
            const path = await exportZip();
            hapticService.success();
            await shareFile(path);
        } catch (e: any) {
            hapticService.error();
            Alert.alert('Export Failed', e.message);
        }
        setExporting(false);
    };

    const handleImport = async () => {
        hapticService.medium();
        const result = await importBackup();
        if (result.success) {
            Alert.alert('Import Successful', result.message);
            loadQuestions(effectiveNotebookId ?? null);
            loadRecent();
            loadStats();
        } else {
            Alert.alert('Import', result.message);
        }
    };

    const handleCreateNotebook = async () => {
        const name = newNotebookName.trim();
        if (!name) return;
        hapticService.success();
        await createNotebook(name, newNotebookColor);
        setNewNotebookName('');
        setNewNotebookColor('#a985ff');
    };

    const handleDeleteNotebook = (id: number, name: string) => {
        hapticService.warning();
        Alert.alert('Delete Notebook', `Delete "${name}"? Questions will be unassigned, not deleted.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteNotebook(id) },
        ]);
    };

    const handleSelectNotebook = async (id: number | null | 'starred') => {
        hapticService.selection();
        await setActiveNotebook(id);
        setShowNotebookModal(false);
        if (id === 'starred') {
            loadQuestions();
        } else {
            loadQuestions(id);
        }
        loadStats();
    };

    // For starred view, filter questions client-side
    const displayedRecent = activeNotebookId === 'starred'
        ? recentQuestions.filter(q => q.priority === 1)
        : recentQuestions;

    return (
        <View style={styles.screen}>
            <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg.primary} />
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.logo}>
                            <Ionicons name="layers" size={22} color={colors.primary} />
                        </View>
                        <Text style={styles.appName}>AlgoDeck</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.profileBtn}
                        onPress={() => { hapticService.light(); navigation.navigate('Settings'); }}
                    >
                        <Ionicons name="person" size={20} color={colors.text.secondary} />
                    </TouchableOpacity>
                </View>

                {/* Notebook Switcher */}
                <TouchableOpacity
                    style={styles.notebookSwitcher}
                    onPress={() => { hapticService.light(); setShowNotebookModal(true); }}
                    activeOpacity={0.7}
                >
                    <Ionicons name="book-outline" size={16} color={colors.primary} />
                    <Text style={styles.notebookSwitcherText}>{activeNotebookName}</Text>
                    <Ionicons name="chevron-down" size={16} color={colors.primary} />
                </TouchableOpacity>

                {/* Stat Cards Carousel */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.statCarousel}
                    style={{ marginBottom: 24 }}
                >
                    {/* Total Qs Card — clickable */}
                    <TouchableOpacity
                        style={[styles.statCard, styles.statCardPink]}
                        activeOpacity={0.8}
                        onPress={() => {
                            hapticService.medium();
                            navigation.navigate('Browse');
                        }}
                    >
                        <View style={styles.statIcon}>
                            <Ionicons name="library" size={16} color="#fff" />
                        </View>
                        <View>
                            <Text style={styles.statNumber}>{totalCount}</Text>
                            <Text style={styles.statLabel}>TOTAL QS</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Due Today Card — clickable, navigates to Revision */}
                    <TouchableOpacity
                        style={[styles.statCard, styles.statCardBlue]}
                        activeOpacity={0.8}
                        onPress={() => {
                            hapticService.medium();
                            const nbId = activeNotebookId === 'starred' ? undefined : (activeNotebookId ?? undefined);
                            loadDueCards(nbId);
                            navigation.navigate('Revision');
                        }}
                    >
                        <View style={styles.statIcon}>
                            <Ionicons name="notifications" size={16} color="#fff" />
                        </View>
                        <View>
                            <Text style={styles.statNumber}>{dueCount}</Text>
                            <Text style={styles.statLabel}>DUE TODAY</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Streak Card */}
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
                            hapticService.medium();
                            const nbId = activeNotebookId === 'starred' ? undefined : (activeNotebookId ?? undefined);
                            loadDueCards(nbId);
                            navigation.navigate('Revision');
                        }}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="play-circle" size={24} color="#fff" />
                        <Text style={styles.startRevisionText}>Start Revision</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.addQuestionBtn}
                        onPress={() => { hapticService.light(); navigation.navigate('AddQuestion'); }}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="add" size={20} color={colors.primary} />
                        <Text style={styles.addQuestionText}>Add New Question</Text>
                    </TouchableOpacity>
                </View>

                {/* Quick Actions Row */}
                <View style={styles.quickRow}>
                    <TouchableOpacity style={styles.quickCard} onPress={handleExport} disabled={exporting}>
                        <View style={[styles.quickIcon, { backgroundColor: 'rgba(169,133,255,0.15)' }]}>
                            <Ionicons name="cloud-upload" size={20} color={colors.primary} />
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
                    <TouchableOpacity onPress={() => { hapticService.light(); navigation.navigate('Browse'); }}>
                        <Text style={styles.seeAll}>View All</Text>
                    </TouchableOpacity>
                </View>

                {displayedRecent.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="albums-outline" size={48} color={colors.text.tertiary} />
                        <Text style={styles.emptyText}>No questions yet</Text>
                        <Text style={styles.emptySubtext}>Tap "Add New Question" to get started</Text>
                    </View>
                ) : (
                    displayedRecent.map(q => (
                        <QuestionCard
                            key={q.id}
                            question={q}
                            onPress={() => navigation.navigate('QuestionDetail', { questionId: q.id })}
                        />
                    ))
                )}
            </ScrollView>

            {/* Notebook Picker Modal */}
            <Modal
                visible={showNotebookModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowNotebookModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowNotebookModal(false)}
                >
                    <View style={styles.notebookSheet} onStartShouldSetResponder={() => true}>
                        <Text style={styles.notebookSheetTitle}>Notebooks</Text>

                        {/* All Notebooks */}
                        <TouchableOpacity
                            style={[styles.notebookRow, activeNotebookId === null && styles.notebookRowActive]}
                            onPress={() => handleSelectNotebook(null)}
                        >
                            <View style={[styles.notebookDot, { backgroundColor: colors.primary }]} />
                            <Text style={[styles.notebookRowText, activeNotebookId === null && styles.notebookRowTextActive]}>All Notebooks</Text>
                            {activeNotebookId === null && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                        </TouchableOpacity>

                        {/* Starred */}
                        <TouchableOpacity
                            style={[styles.notebookRow, activeNotebookId === 'starred' && styles.notebookRowActive]}
                            onPress={() => handleSelectNotebook('starred')}
                        >
                            <Ionicons name="star" size={14} color="#fbbf24" />
                            <Text style={[styles.notebookRowText, activeNotebookId === 'starred' && styles.notebookRowTextActive]}>Starred</Text>
                            {activeNotebookId === 'starred' && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                        </TouchableOpacity>

                        <View style={styles.notebookSeparator} />

                        {/* Notebook List */}
                        {notebooks.map(nb => (
                            <TouchableOpacity
                                key={nb.id}
                                style={[styles.notebookRow, activeNotebookId === nb.id && styles.notebookRowActive]}
                                onPress={() => handleSelectNotebook(nb.id)}
                                onLongPress={() => handleDeleteNotebook(nb.id, nb.name)}
                            >
                                <View style={[styles.notebookDot, { backgroundColor: nb.color }]} />
                                <Text style={[styles.notebookRowText, activeNotebookId === nb.id && styles.notebookRowTextActive]}>{nb.name}</Text>
                                {activeNotebookId === nb.id && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                            </TouchableOpacity>
                        ))}

                        <View style={styles.notebookSeparator} />

                        {/* Create New */}
                        <Text style={styles.notebookCreateLabel}>CREATE NEW</Text>
                        <View style={styles.notebookCreateRow}>
                            <TextInput
                                style={styles.notebookInput}
                                placeholder="Notebook name"
                                placeholderTextColor={colors.text.tertiary}
                                value={newNotebookName}
                                onChangeText={setNewNotebookName}
                            />
                            <TouchableOpacity
                                style={[styles.notebookCreateBtn, !newNotebookName.trim() && { opacity: 0.4 }]}
                                onPress={handleCreateNotebook}
                                disabled={!newNotebookName.trim()}
                            >
                                <Ionicons name="add" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        {/* Color picker */}
                        <View style={styles.colorRow}>
                            {NOTEBOOK_COLORS.map(c => (
                                <TouchableOpacity
                                    key={c}
                                    style={[styles.colorDot, { backgroundColor: c }, newNotebookColor === c && styles.colorDotActive]}
                                    onPress={() => { hapticService.selection(); setNewNotebookColor(c); }}
                                />
                            ))}
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
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
        color: colors.text.heading,
        letterSpacing: -0.5,
    },
    profileBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
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
        backgroundColor: colors.primary,
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
        color: colors.primary,
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
        backgroundColor: colors.bg.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.bg.cardBorder,
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
        color: colors.text.primary,
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
        color: colors.text.heading,
    },
    seeAll: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
    },
    // Empty state
    emptyState: {
        alignItems: 'center',
        paddingVertical: 48,
        gap: 8,
    },
    emptyText: {
        color: colors.text.secondary,
        fontSize: 16,
        fontWeight: '600',
    },
    emptySubtext: {
        color: colors.text.tertiary,
        fontSize: 13,
    },
    // Notebook switcher
    notebookSwitcher: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: isDark ? 'rgba(169,133,255,0.12)' : 'rgba(169,133,255,0.08)',
        marginBottom: 18,
    },
    notebookSwitcherText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
    },
    // Notebook modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
    },
    notebookSheet: {
        backgroundColor: colors.bg.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 40,
        maxHeight: '75%',
    },
    notebookSheetTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text.heading,
        marginBottom: 16,
    },
    notebookRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    notebookRowActive: {
        backgroundColor: isDark ? 'rgba(169,133,255,0.12)' : 'rgba(169,133,255,0.08)',
    },
    notebookDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    notebookRowText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: colors.text.primary,
    },
    notebookRowTextActive: {
        fontWeight: '700',
        color: colors.primary,
    },
    notebookSeparator: {
        height: 1,
        backgroundColor: colors.bg.cardBorder,
        marginVertical: 10,
    },
    notebookCreateLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.text.tertiary,
        letterSpacing: 1,
        marginBottom: 8,
    },
    notebookCreateRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
    },
    notebookInput: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        paddingHorizontal: 14,
        color: colors.text.primary,
        fontSize: 14,
    },
    notebookCreateBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    colorRow: {
        flexDirection: 'row',
        gap: 10,
        flexWrap: 'wrap',
    },
    colorDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    colorDotActive: {
        borderWidth: 3,
        borderColor: '#fff',
    },
});
