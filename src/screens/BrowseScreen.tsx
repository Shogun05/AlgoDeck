import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, ScrollView, StyleSheet, Modal, Animated, Platform, TextInput, PanResponder
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
    const insets = useSafeAreaInsets();
    const { questions, filteredQuestions, searchQuery, setSearchQuery, loadQuestions, allTags, updateQuestion } = useQuestionStore();
    const { notebooks, activeNotebookId, createNotebook } = useNotebookStore();
    const [activeFilter, setActiveFilter] = useState('All');
    const [sortBy, setSortBy] = useState<string>('recent');
    const [showSortModal, setShowSortModal] = useState(false);
    const { colors, isDarkMode } = useAppTheme();
    const styles = useMemo(() => createStyles(colors, isDarkMode, insets), [isDarkMode, insets]);

    // Selection States
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [showNotebookPicker, setShowNotebookPicker] = useState(false);
    const [newNotebookInput, setNewNotebookInput] = useState('');
    const slideAnim = useRef(new Animated.Value(100)).current;

    // Tags Expansion States
    const [isTagsExpanded, setIsTagsExpanded] = useState(false);
    const tagsHeightAnim = useRef(new Animated.Value(45)).current; // Base height for one row

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponderCapture: (_, gestureState) => {
                return Math.abs(gestureState.dy) > 10;
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 30 && !isTagsExpanded) {
                    hapticService.light();
                    setIsTagsExpanded(true);
                    Animated.spring(tagsHeightAnim, {
                        toValue: 140, // Height for 3 rows
                        useNativeDriver: false,
                        friction: 8,
                        tension: 40,
                    }).start();
                } else if (gestureState.dy < -30 && isTagsExpanded) {
                    hapticService.light();
                    setIsTagsExpanded(false);
                    Animated.spring(tagsHeightAnim, {
                        toValue: 45, // Height for 1 row
                        useNativeDriver: false,
                        friction: 8,
                        tension: 40,
                    }).start();
                }
            },
        })
    ).current;

    useEffect(() => {
        const floatingTabBarStyles = {
            position: 'absolute',
            bottom: Platform.OS === 'ios' ? 24 : 16,
            left: 16,
            right: 16,
            height: 64,
            borderRadius: 32,
            backgroundColor: isDarkMode ? 'rgba(21, 15, 35, 0.92)' : 'rgba(255, 255, 255, 0.95)',
            borderTopWidth: 0,
            borderWidth: 1,
            borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            paddingBottom: 0,
            paddingTop: 6,
            elevation: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: isDarkMode ? 0.25 : 0.1,
            shadowRadius: 20,
        } as any;

        if (isSelecting) {
            navigation.setOptions({ tabBarStyle: { ...floatingTabBarStyles, display: 'none' } });
            // Reset and animate the bulk action bar into view
            slideAnim.setValue(100);
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: Platform.OS !== 'web',
                friction: 8,
                tension: 40,
            }).start();
        } else {
            // Immediately restore the tab bar — the bulk action bar is conditionally
            // unmounted so there is no need for a slide-out animation.
            navigation.setOptions({ tabBarStyle: { ...floatingTabBarStyles, display: 'flex' } });
        }
    }, [isSelecting, navigation, isDarkMode, slideAnim]);

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

    // Distribute into 1 line (collapsed) or 3 lines (expanded) preserving left-to-right order
    const filterRows = useMemo(() => {
        if (!isTagsExpanded) return [quickFilters];

        const count = quickFilters.length;
        if (count <= 3) {
            return quickFilters.map(f => [f]); // one per row
        }

        const r1 = Math.ceil(count / 3);
        const r2 = Math.ceil((count - r1) / 2);

        return [
            quickFilters.slice(0, r1),
            quickFilters.slice(r1, r1 + r2),
            quickFilters.slice(r1 + r2)
        ];
    }, [quickFilters, isTagsExpanded]);

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

    // Handlers
    const toggleSelection = (id: number) => {
        hapticService.selection();
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            if (next.size === 0) setIsSelecting(false);
            return next;
        });
    };

    const handleCardPress = (id: number) => {
        if (isSelecting) {
            toggleSelection(id);
        } else {
            hapticService.light();
            navigation.navigate('QuestionDetail', { questionId: id });
        }
    };

    const handleCardLongPress = (id: number) => {
        if (!isSelecting) {
            hapticService.medium();
            setIsSelecting(true);
            setSelectedIds(new Set([id]));
        }
    };

    const assignToNotebook = async (notebookId: number | null) => {
        hapticService.success();
        setShowNotebookPicker(false);
        setIsSelecting(false);
        const idsToUpdate = Array.from(selectedIds);
        setSelectedIds(new Set());
        for (const id of idsToUpdate) {
            await updateQuestion(id, { notebook_id: notebookId });
        }
    };

    const handleCreateNotebook = async () => {
        const name = newNotebookInput.trim();
        if (!name) return;
        hapticService.success();
        const rColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
        const newId = await createNotebook(name, rColor);
        setNewNotebookInput('');
        assignToNotebook(newId);
    };

    return (
        <View style={styles.screen}>
            {/* Header */}
            <View style={styles.header}>
                <View style={[styles.headerTop, isSelecting && styles.headerTopSelecting]}>
                    {isSelecting ? (
                        <>
                            <TouchableOpacity onPress={() => { setIsSelecting(false); setSelectedIds(new Set()); }}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>{selectedIds.size} Selected</Text>
                            <TouchableOpacity onPress={() => {
                                if (selectedIds.size === qs.length) setSelectedIds(new Set());
                                else setSelectedIds(new Set(qs.map(q => q.id)));
                            }}>
                                <Text style={styles.selectAllText}>{selectedIds.size === qs.length ? 'Deselect' : 'All'}</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Text style={styles.title}>Browse Library</Text>
                            <View style={styles.headerTopRight}>
                                {Platform.OS === 'web' && (
                                    <TouchableOpacity style={styles.webSelectBtn} onPress={() => setIsSelecting(true)}>
                                        <Ionicons name="checkmark-circle-outline" size={22} color={colors.primary} />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity style={styles.notifBtn}>
                                    <Ionicons name="notifications-outline" size={22} color={colors.text.secondary} />
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>
                {/* Search */}
                <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
            </View>

            {/* Filter Chips */}
            <Animated.View style={[styles.filterWrap, { height: tagsHeightAnim }]}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterScrollContent}
                >
                    <View style={styles.filterRowsContainer}>
                        {filterRows.map((row, rowIndex) => (
                            <View key={`row-${rowIndex}`} style={styles.filterRow}>
                                {row.map(f => (
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
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </Animated.View>

            {/* Sort / Count / Draggable Zone */}
            <View style={styles.subHeader} {...panResponder.panHandlers}>
                <View style={styles.dragPillWrapper}>
                    <View style={styles.dragPill} />
                </View>
                <View style={styles.subHeaderContent}>
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
            </View>

            {/* List */}
            <FlatList
                data={qs}
                keyExtractor={item => String(item.id)}
                renderItem={({ item }) => (
                    <QuestionCard
                        question={item}
                        isSelected={selectedIds.has(item.id)}
                        selectionMode={isSelecting}
                        onLongPress={() => handleCardLongPress(item.id)}
                        onPress={() => handleCardPress(item.id)}
                    />
                )}
                contentContainerStyle={[styles.listContent, isSelecting && { paddingBottom: 160 }]}
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
                <View style={styles.sortOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        activeOpacity={1}
                        onPress={() => setShowSortModal(false)}
                    />
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
                </View>
            </Modal>

            {/* Notebook Picker Modal */}
            <Modal
                visible={showNotebookPicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowNotebookPicker(false)}
            >
                <View style={styles.sortOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        activeOpacity={1}
                        onPress={() => setShowNotebookPicker(false)}
                    />
                    <View style={styles.sortSheet} onStartShouldSetResponder={() => true}>
                        <Text style={styles.sortSheetTitle}>Add to Notebook</Text>

                        <View style={styles.createNotebookRow}>
                            <TextInput
                                style={styles.createNotebookInput}
                                value={newNotebookInput}
                                onChangeText={setNewNotebookInput}
                                placeholder="Create new notebook..."
                                placeholderTextColor={colors.text.tertiary}
                            />
                            <TouchableOpacity
                                style={[styles.createNotebookBtn, !newNotebookInput.trim() && { opacity: 0.5 }]}
                                onPress={handleCreateNotebook}
                                disabled={!newNotebookInput.trim()}
                            >
                                <Ionicons name="add" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 250 }}>
                            <TouchableOpacity
                                style={styles.notebookOption}
                                onPress={() => assignToNotebook(null)}
                            >
                                <View style={[styles.notebookDot, { backgroundColor: colors.text.tertiary }]} />
                                <Text style={styles.notebookOptionText}>None (Remove from notebook)</Text>
                            </TouchableOpacity>
                            {notebooks.map(nb => (
                                <TouchableOpacity
                                    key={nb.id}
                                    style={styles.notebookOption}
                                    onPress={() => assignToNotebook(nb.id)}
                                >
                                    <View style={[styles.notebookDot, { backgroundColor: nb.color }]} />
                                    <Text style={styles.notebookOptionText}>{nb.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Selection Bottom Bar — conditionally rendered so it is fully
               removed from the DOM when not in selection mode (fixes the
               react-native-web bug where translateY animation leaves the
               bar visible behind the tab bar). */}
            {isSelecting && (
                <Animated.View
                    style={[styles.bulkActionBar, { transform: [{ translateY: slideAnim }] }]}
                >
                    <TouchableOpacity
                        style={styles.bulkActionBtn}
                        onPress={() => { hapticService.medium(); setShowNotebookPicker(true); }}
                    >
                        <Ionicons name="folder-open-outline" size={20} color="#fff" />
                        <Text style={styles.bulkActionText}>Add to Notebook</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}
        </View>
    );
};

const createStyles = (colors: ThemeColors, isDark: boolean, insets: any) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.bg.primary,
        overflow: 'hidden',
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
    headerTopSelecting: {
        paddingTop: 8,
        paddingBottom: 4,
    },
    cancelText: {
        color: colors.primary,
        fontSize: 16,
        fontWeight: '500',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text.heading,
    },
    selectAllText: {
        color: colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text.heading,
        letterSpacing: -0.5,
    },
    headerTopRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    webSelectBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: isDark ? 'rgba(169,133,255,0.1)' : 'rgba(169,133,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
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
    filterScrollContent: {
        paddingRight: 20,
    },
    filterRowsContainer: {
        gap: 8,
    },
    filterRow: {
        flexDirection: 'row',
        gap: 10,
    },
    filterChip: {
        paddingHorizontal: 18,
        height: 38,
        justifyContent: 'center',
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
    // Sub header and Drag Zone
    subHeader: {
        paddingTop: 4,
        paddingBottom: 16,
        paddingHorizontal: 20,
        backgroundColor: colors.bg.primary,
        zIndex: 5,
    },
    dragPillWrapper: {
        alignItems: 'center',
        paddingVertical: 6,
        marginBottom: 6,
    },
    dragPill: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    },
    subHeaderContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    // Bulk Action Bottom Bar
    bulkActionBar: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 24 : 16,
        left: 16,
        right: 16,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        ...theme.shadows.glow,
    },
    bulkActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    bulkActionText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    createNotebookRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    createNotebookInput: {
        flex: 1,
        backgroundColor: colors.bg.input,
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 44,
        color: colors.text.primary,
        fontSize: 14,
        borderWidth: isDark ? 0 : 1,
        borderColor: colors.bg.cardBorder,
    },
    createNotebookBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notebookOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
    },
    notebookDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    notebookOptionText: {
        color: colors.text.primary,
        fontSize: 15,
        fontWeight: '500',
    },
});
