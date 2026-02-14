import React, { useState } from 'react';
import {
    View, Text, TextInput, ScrollView, TouchableOpacity, Image,
    StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useQuestionStore } from '../store/useQuestionStore';
import { performOCR } from '../services/ocr';
import theme from '../theme/theme';

type Difficulty = 'Easy' | 'Medium' | 'Hard';

export const AddQuestionScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { addQuestion } = useQuestionStore();
    const [title, setTitle] = useState('');
    const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [notes, setNotes] = useState('');
    const [imagePath, setImagePath] = useState<string | null>(null);
    const [ocrText, setOcrText] = useState('');
    const [loading, setLoading] = useState(false);
    const [ocrLoading, setOcrLoading] = useState(false);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

    const addTag = () => {
        const t = tagInput.trim();
        if (t && !tags.includes(t)) {
            setTags(prev => [...prev, t]);
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        setTags(prev => prev.filter(t => t !== tag));
    };

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert('Required', 'Please enter a title');
            return;
        }
        setLoading(true);
        try {
            await addQuestion({
                title: title.trim(),
                difficulty,
                tags,
                notes: notes.trim() || undefined,
                screenshot_path: imagePath || undefined,
                ocr_text: ocrText || undefined,
            });
            navigation.goBack();
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
        setLoading(false);
    };

    const difficultyOptions: { key: Difficulty; color: string; dot: string }[] = [
        { key: 'Easy', color: theme.colors.difficulty.easyBg, dot: theme.colors.difficulty.easy },
        { key: 'Medium', color: theme.colors.difficulty.mediumBg, dot: theme.colors.difficulty.medium },
        { key: 'Hard', color: theme.colors.difficulty.hardBg, dot: theme.colors.difficulty.hard },
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
                                <Ionicons name="camera" size={28} color={theme.colors.primary} />
                            </View>
                            <Text style={styles.uploadText}>Tap to upload screenshot</Text>
                        </View>
                    )}
                    {ocrLoading && (
                        <View style={styles.ocrOverlay}>
                            <ActivityIndicator size="small" color={theme.colors.primary} />
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
                        placeholderTextColor={theme.colors.text.tertiary}
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

                {/* Tags Section */}
                <View style={styles.field}>
                    <Text style={styles.label}>Tags</Text>
                    <View style={styles.tagInputRow}>
                        <Ionicons name="pricetag" size={16} color={theme.colors.text.tertiary} style={{ marginRight: 8 }} />
                        <TextInput
                            style={styles.tagInput}
                            value={tagInput}
                            onChangeText={setTagInput}
                            placeholder="Add a tag..."
                            placeholderTextColor={theme.colors.text.tertiary}
                            onSubmitEditing={addTag}
                            returnKeyType="done"
                        />
                        <TouchableOpacity onPress={addTag} style={styles.addTagBtn}>
                            <Ionicons name="add" size={16} color={theme.colors.text.secondary} />
                        </TouchableOpacity>
                    </View>
                    {tags.length > 0 && (
                        <View style={styles.tagsContainer}>
                            {tags.map(tag => (
                                <View key={tag} style={styles.tagChip}>
                                    <Text style={styles.tagChipText}>{tag}</Text>
                                    <TouchableOpacity onPress={() => removeTag(tag)}>
                                        <Ionicons name="close" size={14} color={theme.colors.primary} />
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
                        placeholderTextColor={theme.colors.text.tertiary}
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
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: theme.colors.bg.dark,
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
        color: theme.colors.primary,
        fontSize: 16,
        fontWeight: '500',
    },
    headerTitle: {
        color: '#fff',
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
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.soft,
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
        color: theme.colors.text.secondary,
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 0,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: '#fff',
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
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        gap: 8,
    },
    difficultyDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    difficultyText: {
        color: theme.colors.text.secondary,
        fontSize: 14,
        fontWeight: '500',
    },
    // Tags
    tagInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 44,
    },
    tagInput: {
        flex: 1,
        color: '#fff',
        fontSize: 14,
    },
    addTagBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
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
        color: theme.colors.primaryLight,
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
        backgroundColor: theme.colors.primary,
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
});
