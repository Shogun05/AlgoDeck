import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Question } from '../types';
import { questionService } from '../db/questionService';
import { SolutionTabs } from '../components/SolutionTabs';
import { DifficultyBadge, TagChip } from '../components/TagChip';
import { useQuestionStore } from '../store/useQuestionStore';
import theme from '../theme/theme';

export const QuestionDetailScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { questionId } = route.params;
    const { deleteQuestion } = useQuestionStore();
    const [question, setQuestion] = useState<Question | null>(null);

    useEffect(() => {
        load();
    }, [questionId]);

    const load = async () => {
        const q = await questionService.getById(questionId);
        setQuestion(q || null);
    };

    const handleDelete = () => {
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
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                >
                    <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{question.title}</Text>
                <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={20} color={theme.colors.difficulty.hard} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                {/* Screenshot */}
                {question.screenshot_path && (
                    <Image
                        source={{ uri: question.screenshot_path }}
                        style={styles.screenshot}
                        resizeMode="contain"
                    />
                )}

                {/* Info Row */}
                <View style={styles.infoRow}>
                    <DifficultyBadge difficulty={question.difficulty} />
                    <View style={styles.tagsRow}>
                        {question.tags.map((tag, i) => (
                            <TagChip key={i} label={tag} />
                        ))}
                    </View>
                </View>

                {/* Notes */}
                {question.notes ? (
                    <View style={styles.notesCard}>
                        <Text style={styles.notesLabel}>📝 Notes</Text>
                        <Text style={styles.notesText}>{question.notes}</Text>
                    </View>
                ) : null}

                {/* OCR Text */}
                {question.ocr_text ? (
                    <View style={styles.ocrCard}>
                        <Text style={styles.notesLabel}>🔍 OCR Extracted Text</Text>
                        <Text style={styles.ocrText}>{question.ocr_text}</Text>
                    </View>
                ) : null}

                {/* Solutions */}
                <View style={styles.solutionsSection}>
                    <Text style={styles.solutionsTitle}>Solutions</Text>
                    <SolutionTabs questionId={question.id!} />
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: theme.colors.bg.dark,
    },
    loadingText: {
        color: theme.colors.text.secondary,
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
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        color: '#fff',
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
        marginBottom: 16,
        backgroundColor: 'rgba(255,255,255,0.02)',
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
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        padding: 16,
        marginBottom: 16,
        gap: 8,
    },
    notesLabel: {
        color: theme.colors.text.primary,
        fontSize: 14,
        fontWeight: '700',
    },
    notesText: {
        color: theme.colors.text.secondary,
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
        color: theme.colors.text.secondary,
        fontSize: 12,
        fontFamily: theme.typography.families.mono,
        lineHeight: 18,
    },
    solutionsSection: {
        marginTop: 8,
        minHeight: 300,
    },
    solutionsTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
    },
});
