import React, { useCallback, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuestionStore } from '../store/useQuestionStore';
import { QuestionCard } from '../components/QuestionCard';
import { SearchBar } from '../components/SearchBar';
import theme from '../theme/theme';

const QUICK_FILTERS = ['All', 'Arrays', 'Dynamic Programming', 'Graphs', 'Trees', 'Greedy'];

export const BrowseScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { filteredQuestions, searchQuery, setSearchQuery, loadQuestions } = useQuestionStore();
    const [activeFilter, setActiveFilter] = useState('All');

    useFocusEffect(
        useCallback(() => {
            loadQuestions();
        }, [])
    );

    const getFilteredList = () => {
        if (activeFilter === 'All') return filteredQuestions;
        return filteredQuestions.filter(q =>
            q.tags.some(t => t.toLowerCase().includes(activeFilter.toLowerCase()))
        );
    };

    const qs = getFilteredList();

    return (
        <View style={styles.screen}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Text style={styles.title}>Browse Library</Text>
                    <TouchableOpacity style={styles.notifBtn}>
                        <Ionicons name="notifications-outline" size={22} color={theme.colors.text.secondary} />
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
                    {QUICK_FILTERS.map(f => (
                        <TouchableOpacity
                            key={f}
                            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
                            onPress={() => setActiveFilter(f)}
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
                <TouchableOpacity>
                    <Text style={styles.sortLabel}>Sort by: Recent</Text>
                </TouchableOpacity>
            </View>

            {/* List */}
            <FlatList
                data={qs}
                keyExtractor={item => String(item.id)}
                renderItem={({ item }) => (
                    <QuestionCard
                        question={item}
                        onPress={() => navigation.navigate('QuestionDetail', { questionId: item.id })}
                    />
                )}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="search" size={40} color={theme.colors.text.tertiary} />
                        <Text style={styles.emptyText}>No questions found</Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: theme.colors.bg.dark,
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
        color: '#fff',
        letterSpacing: -0.5,
    },
    notifBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.06)',
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
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    filterChipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
        ...theme.shadows.glow,
    },
    filterText: {
        color: theme.colors.text.secondary,
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
        color: theme.colors.text.tertiary,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
    },
    sortLabel: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: '500',
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
        color: theme.colors.text.tertiary,
        fontSize: 16,
        fontWeight: '500',
    },
});
