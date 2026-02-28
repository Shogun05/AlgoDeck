import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
    View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Alert,
    Modal, Dimensions, FlatList, TextInput,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Question, Solution } from '../types';
import { questionService } from '../db/questionService';
import { SolutionTabs } from '../components/SolutionTabs';
import { DifficultyBadge, TagChip } from '../components/TagChip';
import { useQuestionStore } from '../store/useQuestionStore';
import { useNotebookStore } from '../store/useNotebookStore';
import theme from '../theme/theme';
import { useAppTheme, ThemeColors } from '../theme/useAppTheme';
import { hapticService } from '../services/haptics';
import ReactNativeZoomableView from '@openspacelabs/react-native-zoomable-view/src/ReactNativeZoomableView';

export const QuestionDetailScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { questionId } = route.params;
    const { deleteQuestion, updateQuestion, allTags, loadQuestions } = useQuestionStore();
    const { notebooks } = useNotebookStore();
    const [question, setQuestion] = useState<Question | null>(null);
    const [showImageZoom, setShowImageZoom] = useState(false);
    const [showOcrText, setShowOcrText] = useState(false);
    const [showNotebookPicker, setShowNotebookPicker] = useState(false);
    const { colors, isDarkMode } = useAppTheme();
    const styles = useMemo(() => createStyles(colors, isDarkMode), [isDarkMode]);

    // Tag editing state
    const [showTagEditor, setShowTagEditor] = useState(false);
    const [editTags, setEditTags] = useState<string[]>([]);
    const [tagSearch, setTagSearch] = useState('');
    const [newTagInput, setNewTagInput] = useState('');
    const [localTags, setLocalTags] = useState<string[]>([]);

    useEffect(() => {
        load();
    }, [questionId]);

    // Reload question data when screen comes back into focus
    useFocusEffect(
        useCallback(() => {
            load();
        }, [questionId])
    );

    const load = async () => {
        const q = await questionService.getById(questionId);
        setQuestion(q || null);
    };

    // Tag editing helpers
    const combinedTags = useMemo(() => {
        const merged = [...allTags];
        localTags.forEach(t => { if (!merged.includes(t)) merged.push(t); });
        return merged.sort();
    }, [allTags, localTags]);

    const filteredExistingTags = useMemo(() => {
        if (!tagSearch) return combinedTags;
        return combinedTags.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase()));
    }, [combinedTags, tagSearch]);

    const toggleTag = (tag: string) => {
        hapticService.selection();
        setEditTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const addNewTag = () => {
        const t = newTagInput.trim();
        if (t && !editTags.includes(t)) {
            hapticService.light();
            setEditTags(prev => [...prev, t]);
            if (!allTags.includes(t) && !localTags.includes(t)) {
                setLocalTags(prev => [...prev, t]);
            }
            setNewTagInput('');
        }
    };

    const openTagEditor = () => {
        setEditTags(question?.tags || []);
        setShowTagEditor(true);
    };

    const saveTagEdits = async () => {
        if (!question) return;
        hapticService.success();
        await updateQuestion(question.id, { tags: editTags });
        setQuestion(prev => prev ? { ...prev, tags: editTags } : prev);
        setShowTagEditor(false);
        setTagSearch('');
        setNewTagInput('');
        loadQuestions();
    };

    const handleChangeNotebook = async (notebookId: number | null) => {
        if (!question) return;
        hapticService.success();
        await updateQuestion(question.id, { notebook_id: notebookId });
        setQuestion(prev => prev ? { ...prev, notebook_id: notebookId } : prev);
        setShowNotebookPicker(false);
        loadQuestions();
    };

    const currentNotebook = question?.notebook_id
        ? notebooks.find(n => n.id === question.notebook_id)
        : null;

    const handleEditSolution = (sol: Solution) => {
        navigation.navigate('AddSolution', {
            questionId: question!.id,
            questionTitle: question!.title,
            initialTier: sol.tier,
            editSolution: sol,
        });
    };

    const handleDelete = () => {
        hapticService.warning();
        Alert.alert('Delete Question', 'This action cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await deleteQuestion(questionId);
                    navigation.goBack();
                },
            },
        ]);
    };

    if (!question) {
        return (
            <View style={styles.screen}>
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => { hapticService.light(); navigation.goBack(); }}
                    style={styles.backBtn}
                >
                    <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{question.title}</Text>
                <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={20} color={colors.difficulty.hard} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                {/* Screenshot */}
                {question.screenshot_path ? (
                    <View>
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => setShowImageZoom(true)}
                        >
                            <Image
                                source={{ uri: question.screenshot_path }}
                                style={styles.screenshot}
                                resizeMode="contain"
                            />
                            <View style={styles.zoomHint}>
                                <Ionicons name="expand-outline" size={14} color="#fff" />
                                <Text style={styles.zoomHintText}>Tap to zoom</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.ocrToggle}
                            onPress={() => setShowOcrText(!showOcrText)}
                        >
                            <Ionicons name="scan-outline" size={14} color={colors.primary} />
                            <Text style={styles.ocrToggleText}>
                                {showOcrText ? 'Hide OCR Text' : '🔍 View OCR Text'}
                            </Text>
                            <Ionicons name={showOcrText ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
                        </TouchableOpacity>
                        {showOcrText && (
                            <View style={styles.ocrCard}>
                                <Text style={styles.notesLabel}>🔍 OCR Extracted Text</Text>
                                {question.ocr_text ? (
                                    <Text style={styles.ocrText}>{question.ocr_text}</Text>
                                ) : (
                                    <Text style={styles.ocrEmptyText}>
                                        No text extracted. OCR (ML Kit) is not available in Expo Go — use a development build to enable it.
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>
                ) : null}

                {/* Info Row */}
                <View style={styles.infoRow}>
                    <DifficultyBadge difficulty={question.difficulty} />
                    <View style={styles.tagsRow}>
                        {question.tags.map((tag, i) => (
                            <TagChip key={i} label={tag} />
                        ))}
                    </View>
                    <TouchableOpacity onPress={openTagEditor} style={styles.editTagsBtn}>
                        <Ionicons name="pencil" size={14} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Notebook Badge */}
                <TouchableOpacity
                    style={styles.notebookBadge}
                    onPress={() => setShowNotebookPicker(true)}
                    activeOpacity={0.7}
                >
                    {currentNotebook ? (
                        <>
                            <View style={[styles.nbDot, { backgroundColor: currentNotebook.color }]} />
                            <Text style={[styles.nbText, { color: currentNotebook.color }]}>{currentNotebook.name}</Text>
                        </>
                    ) : (
                        <>
                            <Ionicons name="book-outline" size={14} color={colors.text.tertiary} />
                            <Text style={styles.nbTextNone}>No notebook</Text>
                        </>
                    )}
                    <Ionicons name="chevron-down" size={12} color={colors.text.tertiary} />
                </TouchableOpacity>

                {/* Notes */}
                {question.notes ? (
                    <View style={styles.notesCard}>
                        <Text style={styles.notesLabel}>📝 Notes</Text>
                        <Text style={styles.notesText}>{question.notes}</Text>
                    </View>
                ) : null}

                {/* Solutions */}
                <View style={styles.solutionsSection}>
                    <Text style={styles.solutionsTitle}>Solutions</Text>
                    <SolutionTabs
                        questionId={question.id!}
                        onAddSolution={(tier) => {
                            navigation.navigate('AddSolution', {
                                questionId: question.id,
                                questionTitle: question.title,
                                initialTier: tier,
                            });
                        }}
                        onEditSolution={handleEditSolution}
                    />
                </View>
            </ScrollView>

            {/* Tag Editor Modal */}
            <Modal
                visible={showTagEditor}
                transparent
                animationType="slide"
                onRequestClose={() => { setShowTagEditor(false); setTagSearch(''); }}
            >
                <TouchableOpacity
                    style={styles.tagModalOverlay}
                    activeOpacity={1}
                    onPress={() => { setShowTagEditor(false); setTagSearch(''); }}
                >
                    <View style={styles.tagModalContent} onStartShouldSetResponder={() => true}>
                        <View style={styles.tagModalHeader}>
                            <Text style={styles.tagModalTitle}>Edit Tags</Text>
                            <TouchableOpacity onPress={saveTagEdits}>
                                <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.tagModalSearch}>
                            <Ionicons name="search" size={18} color={colors.text.tertiary} />
                            <TextInput
                                style={styles.tagModalSearchInput}
                                placeholder="Search tags..."
                                placeholderTextColor={colors.text.tertiary}
                                value={tagSearch}
                                onChangeText={setTagSearch}
                            />
                        </View>

                        {/* Selected tags preview */}
                        {editTags.length > 0 && (
                            <View style={styles.tagModalSelected}>
                                {editTags.map(tag => (
                                    <View key={tag} style={styles.tagModalChip}>
                                        <Text style={styles.tagModalChipText}>{tag}</Text>
                                        <TouchableOpacity onPress={() => toggleTag(tag)}>
                                            <Ionicons name="close" size={14} color={colors.primary} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}

                        <FlatList
                            data={filteredExistingTags}
                            keyExtractor={item => item}
                            style={styles.tagModalList}
                            ListEmptyComponent={
                                <Text style={styles.tagModalEmptyText}>
                                    {combinedTags.length === 0
                                        ? 'No tags yet — create one below!'
                                        : 'No tags match your search'}
                                </Text>
                            }
                            renderItem={({ item }) => {
                                const isSelected = editTags.includes(item);
                                return (
                                    <TouchableOpacity
                                        style={[styles.tagModalRow, isSelected && styles.tagModalRowSelected]}
                                        onPress={() => toggleTag(item)}
                                    >
                                        <Ionicons
                                            name={isSelected ? 'checkbox' : 'square-outline'}
                                            size={22}
                                            color={isSelected ? colors.primary : colors.text.tertiary}
                                        />
                                        <Text style={[styles.tagModalRowText, isSelected && styles.tagModalRowTextSelected]}>
                                            {item}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            }}
                        />

                        <View style={styles.tagModalCreate}>
                            <Text style={styles.tagModalCreateLabel}>Create new tag</Text>
                            <View style={styles.tagModalCreateRow}>
                                <TextInput
                                    style={styles.tagModalCreateInput}
                                    value={newTagInput}
                                    onChangeText={setNewTagInput}
                                    placeholder="e.g. Binary Search"
                                    placeholderTextColor={colors.text.tertiary}
                                    onSubmitEditing={addNewTag}
                                    returnKeyType="done"
                                />
                                <TouchableOpacity
                                    style={[
                                        styles.tagModalCreateBtn,
                                        !newTagInput.trim() && styles.tagModalCreateBtnDisabled,
                                    ]}
                                    onPress={addNewTag}
                                    disabled={!newTagInput.trim()}
                                >
                                    <Ionicons name="add" size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Notebook Picker Modal */}
            <Modal
                visible={showNotebookPicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowNotebookPicker(false)}
            >
                <TouchableOpacity
                    style={styles.tagModalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowNotebookPicker(false)}
                >
                    <View style={styles.nbSheet} onStartShouldSetResponder={() => true}>
                        <Text style={styles.tagModalTitle}>Move to Notebook</Text>

                        {/* None */}
                        <TouchableOpacity
                            style={[styles.nbRow, question.notebook_id === null && styles.nbRowActive]}
                            onPress={() => handleChangeNotebook(null)}
                        >
                            <Ionicons name="close-circle-outline" size={16} color={colors.text.tertiary} />
                            <Text style={[styles.nbRowText, question.notebook_id === null && styles.nbRowTextActive]}>None</Text>
                            {question.notebook_id === null && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                        </TouchableOpacity>

                        {notebooks.map(nb => (
                            <TouchableOpacity
                                key={nb.id}
                                style={[styles.nbRow, question.notebook_id === nb.id && styles.nbRowActive]}
                                onPress={() => handleChangeNotebook(nb.id)}
                            >
                                <View style={[styles.nbDot, { backgroundColor: nb.color }]} />
                                <Text style={[styles.nbRowText, question.notebook_id === nb.id && styles.nbRowTextActive]}>{nb.name}</Text>
                                {question.notebook_id === nb.id && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Image Zoom Modal */}
            {question.screenshot_path ? (
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
                                source={{ uri: question.screenshot_path }}
                                style={styles.zoomImage}
                                resizeMode="contain"
                            />
                        </ReactNativeZoomableView>
                    </View>
                </Modal>
            ) : null}
        </View>
    );
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.bg.primary,
    },
    loadingText: {
        color: colors.text.secondary,
        fontSize: 16,
        textAlign: 'center',
        marginTop: 100,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 56,
        paddingBottom: 12,
        gap: 10,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        color: colors.text.heading,
        fontSize: 18,
        fontWeight: '700',
    },
    deleteBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(248,81,73,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 20,
    },
    screenshot: {
        width: '100%',
        height: 220,
        borderRadius: 16,
        marginBottom: 4,
        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    },
    zoomHint: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    zoomHintText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
    },
    ocrToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 4,
        marginBottom: 8,
    },
    ocrToggleText: {
        color: colors.primary,
        fontSize: 13,
        fontWeight: '600',
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
    zoomImage: {
        width: SCREEN_W,
        height: SCREEN_H * 0.75,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        flex: 1,
    },
    notesCard: {
        backgroundColor: colors.bg.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.bg.cardBorder,
        padding: 16,
        marginBottom: 16,
        gap: 8,
    },
    notesLabel: {
        color: colors.text.primary,
        fontSize: 14,
        fontWeight: '700',
    },
    notesText: {
        color: colors.text.secondary,
        fontSize: 14,
        lineHeight: 22,
    },
    ocrCard: {
        backgroundColor: 'rgba(169,133,255,0.05)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(169,133,255,0.1)',
        padding: 16,
        marginBottom: 16,
        gap: 8,
    },
    ocrText: {
        color: colors.text.secondary,
        fontSize: 12,
        fontFamily: theme.typography.families.mono,
        lineHeight: 18,
    },
    ocrEmptyText: {
        color: colors.text.tertiary,
        fontSize: 13,
        lineHeight: 20,
        fontStyle: 'italic',
    },
    solutionsSection: {
        marginTop: 8,
        minHeight: 300,
    },
    solutionsTitle: {
        color: colors.text.heading,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
    },
    // Edit tags button
    editTagsBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: isDark ? 'rgba(169,133,255,0.12)' : 'rgba(169,133,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Tag editor modal
    tagModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    tagModalContent: {
        backgroundColor: colors.bg.primary,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '75%',
        paddingBottom: 36,
    },
    tagModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 12,
    },
    tagModalTitle: {
        color: colors.text.heading,
        fontSize: 18,
        fontWeight: '700',
    },
    tagModalSearch: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bg.input,
        borderRadius: 12,
        paddingHorizontal: 14,
        marginHorizontal: 20,
        marginBottom: 8,
        gap: 8,
    },
    tagModalSearchInput: {
        flex: 1,
        paddingVertical: 12,
        color: colors.text.primary,
        fontSize: 15,
    },
    tagModalSelected: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 20,
        gap: 6,
        marginBottom: 8,
    },
    tagModalChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? 'rgba(169,133,255,0.15)' : 'rgba(169,133,255,0.1)',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 5,
        gap: 6,
    },
    tagModalChipText: {
        color: colors.primary,
        fontSize: 13,
        fontWeight: '600',
    },
    tagModalList: {
        maxHeight: 250,
        paddingHorizontal: 20,
    },
    tagModalEmptyText: {
        color: colors.text.tertiary,
        fontSize: 14,
        textAlign: 'center',
        paddingVertical: 20,
    },
    tagModalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
        gap: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.bg.cardBorder,
    },
    tagModalRowSelected: {
        backgroundColor: isDark ? 'rgba(169,133,255,0.06)' : 'rgba(169,133,255,0.04)',
    },
    tagModalRowText: {
        color: colors.text.primary,
        fontSize: 15,
    },
    tagModalRowTextSelected: {
        color: colors.primary,
        fontWeight: '600',
    },
    tagModalCreate: {
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.bg.cardBorder,
    },
    tagModalCreateLabel: {
        color: colors.text.secondary,
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
    },
    tagModalCreateRow: {
        flexDirection: 'row',
        gap: 8,
    },
    tagModalCreateInput: {
        flex: 1,
        backgroundColor: colors.bg.input,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: colors.text.primary,
        fontSize: 15,
    },
    tagModalCreateBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tagModalCreateBtnDisabled: {
        opacity: 0.4,
    },
    // Notebook picker
    notebookBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        marginBottom: 16,
    },
    nbDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    nbText: {
        fontSize: 13,
        fontWeight: '600',
    },
    nbTextNone: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.text.tertiary,
    },
    nbSheet: {
        backgroundColor: colors.bg.primary,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 40,
    },
    nbRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    nbRowActive: {
        backgroundColor: isDark ? 'rgba(169,133,255,0.12)' : 'rgba(169,133,255,0.06)',
    },
    nbRowText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: colors.text.primary,
    },
    nbRowTextActive: {
        fontWeight: '700',
        color: colors.primary,
    },
});
