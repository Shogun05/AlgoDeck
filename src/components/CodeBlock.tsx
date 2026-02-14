import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import theme from '../theme/theme';
import { SyntaxHighlighter } from './SyntaxHighlighter';

interface CodeBlockProps {
    code: string;
    language?: string;
    timeComplexity?: string;
    spaceComplexity?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, timeComplexity, spaceComplexity }) => {
    if (!code) return null;

    return (
        <View style={styles.wrapper}>
            <View style={styles.container}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                >
                    <ScrollView
                        nestedScrollEnabled
                        showsVerticalScrollIndicator={false}
                        style={styles.codeScroll}
                    >
                        <SyntaxHighlighter code={code} language={language || 'python'} />
                    </ScrollView>

                </ScrollView>
            </View>
            {(language || timeComplexity || spaceComplexity) && (
                <View style={styles.footer}>
                    {language && (
                        <Text style={styles.language}>{language.toUpperCase()}</Text>
                    )}
                    <View style={styles.complexityRow}>
                        {timeComplexity && (
                            <View style={styles.timeBadge}>
                                <Text style={styles.timeText}>{timeComplexity} time</Text>
                            </View>
                        )}
                        {spaceComplexity && (
                            <View style={styles.spaceBadge}>
                                <Text style={styles.spaceText}>{spaceComplexity} space</Text>
                            </View>
                        )}
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        marginVertical: theme.spacing.sm,
    },
    container: {
        backgroundColor: theme.colors.bg.codeBg,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
    },
    codeScroll: {
        padding: theme.spacing.lg,
        maxHeight: 300,
    },
    code: {
        color: '#e0def4',
        fontFamily: theme.typography.families.mono,
        fontSize: theme.typography.sizes.sm,
        lineHeight: 22,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: theme.spacing.sm,
        paddingHorizontal: 4,
    },
    language: {
        color: theme.colors.text.tertiary,
        fontSize: theme.typography.sizes.xxs,
        fontFamily: theme.typography.families.mono,
        letterSpacing: 1,
    },
    complexityRow: {
        flexDirection: 'row',
        gap: 8,
    },
    timeBadge: {
        backgroundColor: 'rgba(63, 185, 80, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    timeText: {
        color: '#3FB950',
        fontSize: theme.typography.sizes.xs,
        fontFamily: theme.typography.families.mono,
    },
    spaceBadge: {
        backgroundColor: 'rgba(88, 166, 255, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    spaceText: {
        color: '#58a6ff',
        fontSize: theme.typography.sizes.xs,
        fontFamily: theme.typography.families.mono,
    },
});
