import React, { useCallback, useState, useMemo } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, ScrollView, StyleSheet, Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuestionStore } from '../store/useQuestionStore';
import { useNotebookStore } from '../store/useNotebookStore';
import { QuestionCard } from '../components/QuestionCard';
import { SearchBar } from '../components/SearchBar';
import theme from '../theme/theme';
import { useAppTheme, ThemeColors } from '../theme/useAppTheme';
import { hapticService } from '../services/haptics';

export const BrowseScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { filteredQuestions, searchQuery, setSearchQuery, loadQuestions, allTags } = useQuestionStore();
    const { activeNotebookId } = useNotebookStore();
    const [activeFilter, setActiveFilter] = useState('All');
    const [sortBy, setSortBy] = useState<string>('recent');
    const [showSortModal, setShowSortModal] = useState(false);
    const { colors, isDarkMode } = useAppTheme();
    const styles = useMemo(() => createStyles(colors, isDarkMode), [isDarkMode]);

    const effectiveNotebookId = activeNotebookId === 'starred' ? undefined : (activeNotebookId ?? undefined);

    const SORT_OPTIONS = [
        { key: 'recent', label: 'Recent First', icon: 'time-outline' as const },
        { key: 'oldest', label: 'Oldest First', icon: 'hourglass-outline' as const },
        { key: 'az', label: 'A → Z', icon: 'text-outline' as const },
        { key: 'za', label: 'Z → A', icon: 'text-outline' as const },
        { key: 'easy-first', label: 'Easy → Hard', icon: 'arrow-up-outline' as const },
        { key: 'hard-first', label: 'Hard → Easy', icon: 'arrow-down-outline' as const },
        { key: 'starred', label: 'Starred First', icon: 'star-outline' as const },
    ];

    // Build dynamic quick-filter chips from user's actual tags
    const quickFilters = useMemo(() => ['All', ...allTags], [allTags]);

    useFocusEffect(
        useCallback(() => {
            if (activeNotebookId === 'starred') {
                loadQuestions();
            } else {
                loadQuestions(effectiveNotebookId ?? null);
            }
        }, [activeNotebookId])
    );

    const getFilteredList = () => {
        let list = activeFilter === 'All'
            ? [...filteredQuestions]
            : filteredQuestions.filter(q =>
                q.tags.some(t => t.toLowerCase().includes(activeFilter.toLowerCase()))
            );

        // If starred notebook is active, only show starred
        if (activeNotebookId === 'starred') {
            list = list.filter(q => q.priority === 1);
        }

        const diffOrder: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2 };

        switch (sortBy) {
            case 'recent':
                list.sort((a, b) => b.created_at.localeCompare(a.created_at));
                break;
            case 'oldest':
                list.sort((a, b) => a.created_at.localeCompare(b.created_at));
                break;
            case 'az':
                list.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'za':
                list.sort((a, b) => b.title.localeCompare(a.title));
                break;
            case 'easy-first':
                list.sort((a, b) => (diffOrder[a.difficulty] ?? 1) - (diffOrder[b.difficulty] ?? 1));
                break;
            case 'hard-first':
                list.sort((a, b) => (diffOrder[b.difficulty] ?? 1) - (diffOrder[a.difficulty] ?? 1));
                break;
            case 'starred':
                list.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
                break;
        }
        return list;
    };

    const qs = getFilteredList();

    return (
        <View style={styles.screen}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Text style={styles.title}>Browse Library</Text>
                    <TouchableOpacity style={styles.notifBtn}>
                        <Ionicons name="notifications-outline" size={22} color={colors.text.secondary} />
                    </TouchableOpacity>
                </View>
                {/* Search */}
                <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
            </View>

            {/* Filter Chips */}
            <View style={styles.filterWrap}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterRow}
                >
                    {quickFilters.map(f => (
                        <TouchableOpacity
                            key={f}
                            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
                            onPress={() => { hapticService.selection(); setActiveFilter(f); }}
                        >
                            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
                                {f}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Sort / Count */}
            <View style={styles.subHeader}>
                <Text style={styles.subHeaderLabel}>
                    {qs.length} QUESTION{qs.length !== 1 ? 'S' : ''}
                </Text>
                <TouchableOpacity onPress={() => { hapticService.light(); setShowSortModal(true); }} style={styles.sortBtn}>
                    <Text style={styles.sortLabel}>
                        Sort: {SORT_OPTIONS.find(o => o.key === sortBy)?.label}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {/* List */}
            <FlatList
                data={qs}
                keyExtractor={item => String(item.id)}
                renderItem={({ item }) => (
                    <QuestionCard
                        question={item}
                        onPress={() => { hapticService.light(); navigation.navigate('QuestionDetail', { questionId: item.id }); }}
                    />
                )}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="search" size={40} color={colors.text.tertiary} />
                        <Text style={styles.emptyText}>No questions found</Text>
                    </View>
                }
            />

            {/* Sort Modal */}
            <Modal
                visible={showSortModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSortModal(false)}
            >
                <TouchableOpacity
                    style={styles.sortOverlay}
                    activeOpacity={1}
                    onPress={() => setShowSortModal(false)}
                >
                    <View style={styles.sortSheet} onStartShouldSetResponder={() => true}>
                        <Text style={styles.sortSheetTitle}>Sort By</Text>
                        {SORT_OPTIONS.map(opt => (
                            <TouchableOpacity
                                key={opt.key}
                                style={[
                                    styles.sortOption,
                                    sortBy === opt.key && styles.sortOptionActive,
                                ]}
                                onPress={() => { hapticService.selection(); setSortBy(opt.key); setShowSortModal(false); }}
                            >
                                <Ionicons
                                    name={opt.icon}
                                    size={18}
                                    color={sortBy === opt.key ? colors.primary : colors.text.secondary}
                                />
                                <Text style={[
                                    styles.sortOptionText,
                                    sortBy === opt.key && styles.sortOptionTextActive,
                                ]}>
                                    {opt.label}
                                </Text>
                                {sortBy === opt.key && (
                                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
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
    header: {
        paddingTop: 56,
        paddingHorizontal: 20,
        paddingBottom: 16,
        gap: 16,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text.heading,
        letterSpacing: -0.5,
    },
    notifBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Filters
    filterWrap: {
        marginBottom: 8,
        paddingLeft: 20,
    },
    filterRow: {
        gap: 10,
        paddingRight: 20,
        paddingBottom: 4,
    },
    filterChip: {
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
        borderWidth: 1,
        borderColor: colors.bg.cardBorder,
    },
    filterChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        ...theme.shadows.glow,
    },
    filterText: {
        color: colors.text.secondary,
        fontSize: 13,
        fontWeight: '600',
    },
    filterTextActive: {
        color: '#fff',
    },
    // Sub header
    subHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: 20,
        marginTop: 12,
        marginBottom: 12,
    },
    subHeaderLabel: {
        color: colors.text.tertiary,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
    },
    sortBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    sortLabel: {
        color: colors.primary,
        fontSize: 12,
        fontWeight: '500',
    },
    sortOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    sortSheet: {
        backgroundColor: colors.bg.primary,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 36,
    },
    sortSheetTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text.heading,
        marginBottom: 16,
    },
    sortOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        gap: 12,
        borderRadius: 12,
    },
    sortOptionActive: {
        backgroundColor: isDark ? 'rgba(169,133,255,0.1)' : 'rgba(169,133,255,0.06)',
    },
    sortOptionText: {
        flex: 1,
        color: colors.text.primary,
        fontSize: 15,
        fontWeight: '500',
    },
    sortOptionTextActive: {
        color: colors.primary,
        fontWeight: '700',
    },
    // List
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    // Empty
    empty: {
        alignItems: 'center',
        paddingTop: 60,
        gap: 12,
    },
    emptyText: {
        color: colors.text.tertiary,
        fontSize: 16,
        fontWeight: '500',
    },
});
