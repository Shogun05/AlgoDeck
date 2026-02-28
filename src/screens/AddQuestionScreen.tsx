import React, { useState, useMemo, useCallback } from 'react';
import {
    View, Text, TextInput, ScrollView, TouchableOpacity, Image,
    StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
    Modal, FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useQuestionStore } from '../store/useQuestionStore';
import { useNotebookStore } from '../store/useNotebookStore';
import { performOCR } from '../services/ocr';
import theme from '../theme/theme';
import { useAppTheme, ThemeColors } from '../theme/useAppTheme';
import { hapticService } from '../services/haptics';

type Difficulty = 'Easy' | 'Medium' | 'Hard';

export const AddQuestionScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { addQuestion, allTags } = useQuestionStore();
    const { notebooks, activeNotebookId } = useNotebookStore();
    const { colors, isDarkMode } = useAppTheme();
    const styles = useMemo(() => createStyles(colors, isDarkMode), [isDarkMode]);
    const [title, setTitle] = useState('');
    const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
    const [tags, setTags] = useState<string[]>([]);
    const [notes, setNotes] = useState('');
    const [imagePath, setImagePath] = useState<string | null>(null);
    const [ocrText, setOcrText] = useState('');
    const [loading, setLoading] = useState(false);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [showTagPicker, setShowTagPicker] = useState(false);
    const [newTagInput, setNewTagInput] = useState('');
    const [tagSearch, setTagSearch] = useState('');
    const [localTags, setLocalTags] = useState<string[]>([]);
    const [selectedNotebookId, setSelectedNotebookId] = useState<number | null>(
        typeof activeNotebookId === 'number' ? activeNotebookId : null
    );

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
            const uri = result.assets[0].uri;
            setImagePath(uri);
            // Run OCR
            setOcrLoading(true);
            try {
                const text = await performOCR(uri);
                setOcrText(text);
            } catch {
                setOcrText('');
            }
            setOcrLoading(false);
        }
    };

    const toggleTag = (tag: string) => {
        hapticService.selection();
        setTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const removeTag = (tag: string) => {
        hapticService.light();
        setTags(prev => prev.filter(t => t !== tag));
    };

    const addNewTag = () => {
        const t = newTagInput.trim();
        if (t && !tags.includes(t)) {
            hapticService.light();
            setTags(prev => [...prev, t]);
            // Also add to localTags so it appears in the picker immediately
            if (!allTags.includes(t) && !localTags.includes(t)) {
                setLocalTags(prev => [...prev, t]);
            }
            setNewTagInput('');
        }
    };

    // Combine store tags + locally-created tags
    const combinedTags = useMemo(() => {
        const merged = [...allTags];
        localTags.forEach(t => { if (!merged.includes(t)) merged.push(t); });
        return merged.sort();
    }, [allTags, localTags]);

    // Filter existing tags by search input in the tag picker
    const filteredExistingTags = useMemo(() => {
        if (!tagSearch) return combinedTags;
        return combinedTags.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase()));
    }, [combinedTags, tagSearch]);

    const handleSave = async () => {
        if (!title.trim()) {
            hapticService.warning();
            Alert.alert('Required', 'Please enter a title');
            return;
        }
        setLoading(true);
        try {
            hapticService.success();
            const newId = await addQuestion({
                title: title.trim(),
                difficulty,
                tags,
                notes: notes.trim(),
                screenshot_path: imagePath || '',
                ocr_text: ocrText || '',
                notebook_id: selectedNotebookId,
            });
            // Navigate to AddSolution so user can add code solutions
            navigation.replace('AddSolution', {
                questionId: newId,
                questionTitle: title.trim(),
                initialTier: 'brute',
            });
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
        setLoading(false);
    };

    const difficultyOptions: { key: Difficulty; color: string; dot: string }[] = [
        { key: 'Easy', color: colors.difficulty.easyBg, dot: colors.difficulty.easy },
        { key: 'Medium', color: colors.difficulty.mediumBg, dot: colors.difficulty.medium },
        { key: 'Hard', color: colors.difficulty.hardBg, dot: colors.difficulty.hard },
    ];

    return (
        <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Question</Text>
                <View style={{ width: 50 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                {/* Upload Zone */}
                <TouchableOpacity style={styles.uploadZone} onPress={pickImage} activeOpacity={0.7}>
                    {imagePath ? (
                        <Image source={{ uri: imagePath }} style={styles.uploadedImage} resizeMode="cover" />
                    ) : (
                        <View style={styles.uploadPlaceholder}>
                            <View style={styles.cameraCircle}>
                                <Ionicons name="camera" size={28} color={colors.primary} />
                            </View>
                            <Text style={styles.uploadText}>Tap to upload screenshot</Text>
                        </View>
                    )}
                    {ocrLoading && (
                        <View style={styles.ocrOverlay}>
                            <ActivityIndicator size="small" color={colors.primary} />
                            <Text style={styles.ocrOverlayText}>Running OCR...</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Title Input */}
                <View style={styles.field}>
                    <Text style={styles.label}>Title</Text>
                    <TextInput
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="e.g. Two Sum"
                        placeholderTextColor={colors.text.tertiary}
                    />
                </View>

                {/* Difficulty Selector */}
                <View style={styles.field}>
                    <Text style={styles.label}>Difficulty</Text>
                    <View style={styles.difficultyRow}>
                        {difficultyOptions.map(d => (
                            <TouchableOpacity
                                key={d.key}
                                style={[
                                    styles.difficultyBtn,
                                    difficulty === d.key && { backgroundColor: d.color, borderColor: d.color },
                                ]}
                                onPress={() => setDifficulty(d.key)}
                            >
                                <View style={[styles.difficultyDot, { backgroundColor: d.dot }]} />
                                <Text style={[
                                    styles.difficultyText,
                                    difficulty === d.key && { color: d.dot, fontWeight: '700' },
                                ]}>
                                    {d.key}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Notebook Selector */}
                {notebooks.length > 0 && (
                    <View style={styles.field}>
                        <Text style={styles.label}>Notebook</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                            <TouchableOpacity
                                style={[
                                    styles.notebookBtn,
                                    selectedNotebookId === null && {
                                        backgroundColor: 'rgba(169,133,255,0.15)',
                                        borderColor: colors.primary,
                                    },
                                ]}
                                onPress={() => { hapticService.selection(); setSelectedNotebookId(null); }}
                            >
                                <Text style={[
                                    styles.difficultyText,
                                    selectedNotebookId === null && { color: colors.primary, fontWeight: '700' },
                                ]}>None</Text>
                            </TouchableOpacity>
                            {notebooks.map(nb => (
                                <TouchableOpacity
                                    key={nb.id}
                                    style={[
                                        styles.notebookBtn,
                                        selectedNotebookId === nb.id && {
                                            backgroundColor: nb.color + '22',
                                            borderColor: nb.color,
                                        },
                                    ]}
                                    onPress={() => { hapticService.selection(); setSelectedNotebookId(nb.id); }}
                                >
                                    <View style={[styles.difficultyDot, { backgroundColor: nb.color }]} />
                                    <Text style={[
                                        styles.difficultyText,
                                        selectedNotebookId === nb.id && { color: nb.color, fontWeight: '700' },
                                    ]}>{nb.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Tags Section */}
                <View style={styles.field}>
                    <Text style={styles.label}>Tags</Text>
                    <TouchableOpacity
                        style={styles.tagPickerTrigger}
                        onPress={() => setShowTagPicker(true)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="pricetag" size={16} color={colors.text.tertiary} />
                        <Text style={tags.length > 0 ? styles.tagPickerValue : styles.tagPickerPlaceholder}>
                            {tags.length > 0 ? `${tags.length} tag${tags.length > 1 ? 's' : ''} selected` : 'Select tags...'}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color={colors.text.tertiary} />
                    </TouchableOpacity>
                    {tags.length > 0 && (
                        <View style={styles.tagsContainer}>
                            {tags.map(tag => (
                                <View key={tag} style={styles.tagChip}>
                                    <Text style={styles.tagChipText}>{tag}</Text>
                                    <TouchableOpacity onPress={() => removeTag(tag)}>
                                        <Ionicons name="close" size={14} color={colors.primary} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Notes */}
                <View style={styles.field}>
                    <Text style={styles.label}>Notes</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Jot down your approach, time complexity, or key insights..."
                        placeholderTextColor={colors.text.tertiary}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>
            </ScrollView>

            {/* Save Button — fixed at bottom */}
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
                            <Ionicons name="save" size={20} color="#fff" />
                            <Text style={styles.saveBtnText}>Save Question</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Tag Picker Modal */}
            <Modal
                visible={showTagPicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowTagPicker(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => { setShowTagPicker(false); setTagSearch(''); }}
                >
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Tags</Text>
                            <TouchableOpacity onPress={() => { setShowTagPicker(false); setTagSearch(''); }}>
                                <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
                            </TouchableOpacity>
                        </View>

                        {/* Search existing tags */}
                        <View style={styles.modalSearch}>
                            <Ionicons name="search" size={18} color={colors.text.tertiary} />
                            <TextInput
                                style={styles.modalSearchInput}
                                placeholder="Search tags..."
                                placeholderTextColor={colors.text.tertiary}
                                value={tagSearch}
                                onChangeText={setTagSearch}
                            />
                        </View>

                        {/* Existing tags list */}
                        <FlatList
                            data={filteredExistingTags}
                            keyExtractor={item => item}
                            style={styles.modalList}
                            ListEmptyComponent={
                                <Text style={styles.modalEmptyText}>
                                    {combinedTags.length === 0
                                        ? 'No tags yet — create your first one below!'
                                        : 'No tags match your search'}
                                </Text>
                            }
                            renderItem={({ item }) => {
                                const isSelected = tags.includes(item);
                                return (
                                    <TouchableOpacity
                                        style={[styles.modalTagRow, isSelected && styles.modalTagRowSelected]}
                                        onPress={() => toggleTag(item)}
                                    >
                                        <Ionicons
                                            name={isSelected ? 'checkbox' : 'square-outline'}
                                            size={22}
                                            color={isSelected ? colors.primary : colors.text.tertiary}
                                        />
                                        <Text style={[styles.modalTagText, isSelected && styles.modalTagTextSelected]}>
                                            {item}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            }}
                        />

                        {/* Create new tag */}
                        <View style={styles.createTagSection}>
                            <Text style={styles.createTagLabel}>Create new tag</Text>
                            <View style={styles.createTagRow}>
                                <TextInput
                                    style={styles.createTagInput}
                                    value={newTagInput}
                                    onChangeText={setNewTagInput}
                                    placeholder="e.g. Binary Search"
                                    placeholderTextColor={colors.text.tertiary}
                                    onSubmitEditing={addNewTag}
                                    returnKeyType="done"
                                />
                                <TouchableOpacity
                                    style={[
                                        styles.createTagBtn,
                                        !newTagInput.trim() && styles.createTagBtnDisabled,
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
        </KeyboardAvoidingView>
    );
};

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
    cancelText: {
        color: colors.primary,
        fontSize: 16,
        fontWeight: '500',
    },
    headerTitle: {
        color: colors.text.heading,
        fontSize: 18,
        fontWeight: '700',
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 20,
    },
    // Upload
    uploadZone: {
        width: '100%',
        aspectRatio: 4 / 3,
        borderRadius: 20,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: 'rgba(169,133,255,0.4)',
        backgroundColor: 'rgba(169,133,255,0.05)',
        marginTop: 12,
        marginBottom: 24,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadPlaceholder: {
        alignItems: 'center',
        gap: 12,
    },
    cameraCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        alignItems: 'center',
        justifyContent: 'center',
        ...(isDark ? { elevation: 0 } : theme.shadows.soft),
    },
    uploadText: {
        color: 'rgba(169,133,255,0.7)',
        fontSize: 14,
        fontWeight: '500',
    },
    uploadedImage: {
        width: '100%',
        height: '100%',
    },
    ocrOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    ocrOverlayText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    // Fields
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
    textArea: {
        minHeight: 100,
        paddingTop: 14,
        lineHeight: 22,
    },
    // Difficulty
    difficultyRow: {
        flexDirection: 'row',
        gap: 10,
    },
    difficultyBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: colors.bg.input,
        borderWidth: 1,
        borderColor: colors.bg.cardBorder,
        gap: 8,
    },
    difficultyDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    difficultyText: {
        color: colors.text.secondary,
        fontSize: 14,
        fontWeight: '500',
    },    notebookBtn: {
        minWidth: 100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderRadius: 12,
        backgroundColor: colors.bg.input,
        borderWidth: 1,
        borderColor: colors.bg.cardBorder,
        gap: 8,
    },    // Tags
    tagPickerTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bg.input,
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 48,
        borderWidth: isDark ? 0 : 1,
        borderColor: colors.bg.cardBorder,
        gap: 10,
    },
    tagPickerValue: {
        flex: 1,
        color: colors.text.primary,
        fontSize: 14,
        fontWeight: '500',
    },
    tagPickerPlaceholder: {
        flex: 1,
        color: colors.text.tertiary,
        fontSize: 14,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 10,
    },
    tagChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(169,133,255,0.15)',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(169,133,255,0.1)',
    },
    tagChipText: {
        color: colors.primaryLight,
        fontSize: 12,
        fontWeight: '600',
    },
    // Bottom save
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
    // Tag Picker Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.bg.primary,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '75%',
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text.heading,
    },
    modalSearch: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bg.input,
        borderRadius: 12,
        marginHorizontal: 20,
        marginVertical: 12,
        paddingHorizontal: 14,
        height: 44,
        gap: 10,
    },
    modalSearchInput: {
        flex: 1,
        color: colors.text.primary,
        fontSize: 14,
    },
    modalList: {
        paddingHorizontal: 20,
        maxHeight: 260,
    },
    modalEmptyText: {
        color: colors.text.tertiary,
        fontSize: 14,
        textAlign: 'center',
        paddingVertical: 24,
    },
    modalTagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
    },
    modalTagRowSelected: {
        backgroundColor: isDark ? 'rgba(169,133,255,0.08)' : 'rgba(169,133,255,0.05)',
        borderRadius: 10,
        marginHorizontal: -4,
        paddingHorizontal: 8,
    },
    modalTagText: {
        color: colors.text.primary,
        fontSize: 15,
        fontWeight: '500',
    },
    modalTagTextSelected: {
        color: colors.primary,
        fontWeight: '700',
    },
    createTagSection: {
        paddingHorizontal: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    },
    createTagLabel: {
        color: colors.text.secondary,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    createTagRow: {
        flexDirection: 'row',
        gap: 10,
    },
    createTagInput: {
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
    createTagBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    createTagBtnDisabled: {
        opacity: 0.4,
    },
});
