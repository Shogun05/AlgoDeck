import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, StatusBar, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import theme from '../theme/theme';
import { SyntaxHighlighter } from './SyntaxHighlighter';
import { useAppTheme, ThemeColors } from '../theme/useAppTheme';
import * as Clipboard from 'expo-clipboard';
import { hapticService } from '../services/haptics';

interface CodeBlockProps {
    code: string;
    language?: string;
    timeComplexity?: string;
    spaceComplexity?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, timeComplexity, spaceComplexity }) => {
    const { colors, isDarkMode } = useAppTheme();
    const styles = useMemo(() => createStyles(colors, isDarkMode), [isDarkMode]);
    const [fullscreen, setFullscreen] = useState(false);
    const [copied, setCopied] = useState(false);

    const openFullscreen = useCallback(async () => {
        setFullscreen(true);
        if (Platform.OS !== 'web') {
            try { await ScreenOrientation.unlockAsync(); } catch {}
        }
    }, []);

    const closeFullscreen = useCallback(async () => {
        setFullscreen(false);
        if (Platform.OS !== 'web') {
            try { await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP); } catch {}
        }
    }, []);

    const handleCopy = useCallback(async () => {
        hapticService.light();
        try {
            await Clipboard.setStringAsync(code);
            setCopied(true);
            setTimeout(() => {
                setCopied(false);
            }, 2000);
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }
    }, [code]);

    if (!code) return null;

    return (
        <View style={styles.wrapper}>
            <View style={styles.container}>
                {/* Top action buttons */}
                <View style={styles.actionButtons}>
                    {/* Copy to clipboard button */}
                    <TouchableOpacity style={styles.actionBtn} onPress={handleCopy} activeOpacity={0.7}>
                        <Ionicons 
                            name={copied ? "checkmark-outline" : "copy-outline"} 
                            size={16} 
                            color={copied ? '#3FB950' : (isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)')} 
                        />
                    </TouchableOpacity>
                    {/* Fullscreen button */}
                    <TouchableOpacity style={styles.actionBtn} onPress={openFullscreen} activeOpacity={0.7}>
                        <Ionicons name="expand-outline" size={16} color={isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)'} />
                    </TouchableOpacity>
                </View>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                >
                    <ScrollView
                        nestedScrollEnabled
                        showsVerticalScrollIndicator={false}
                        style={styles.codeScroll}
                    >
                        <SyntaxHighlighter code={code} language={language || 'python'} tabSize={2} />
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

            {/* Fullscreen Code Modal */}
            <Modal
                visible={fullscreen}
                animationType="fade"
                supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
                onRequestClose={closeFullscreen}
            >
                <View style={styles.fsContainer}>
                    <StatusBar hidden={fullscreen} />
                    {/* Top bar */}
                    <View style={styles.fsHeader}>
                        <View style={styles.fsHeaderLeft}>
                            {language && (
                                <Text style={styles.fsLang}>{language.toUpperCase()}</Text>
                            )}
                            <View style={styles.fsComplexityRow}>
                                {timeComplexity && (
                                    <View style={styles.timeBadge}>
                                        <Text style={styles.timeText}>{timeComplexity}</Text>
                                    </View>
                                )}
                                {spaceComplexity && (
                                    <View style={styles.spaceBadge}>
                                        <Text style={styles.spaceText}>{spaceComplexity}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                        <View style={styles.fsHeaderRight}>
                            <TouchableOpacity style={styles.fsCopyBtn} onPress={handleCopy} activeOpacity={0.7}>
                                <Ionicons 
                                    name={copied ? "checkmark-outline" : "copy-outline"} 
                                    size={20} 
                                    color={copied ? '#3FB950' : '#fff'} 
                                />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.fsCloseBtn} onPress={closeFullscreen}>
                                <Ionicons name="close" size={22} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    {/* Code area — vertical scroll wraps horizontal so touch works full-width */}
                    <ScrollView
                        style={styles.fsScrollV}
                        showsVerticalScrollIndicator
                        contentContainerStyle={styles.fsCodeContent}
                    >
                        <ScrollView
                            horizontal
                            nestedScrollEnabled
                            showsHorizontalScrollIndicator
                        >
                            <SyntaxHighlighter code={code} language={language || 'python'} fontSize={15} tabSize={4} />
                        </ScrollView>
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
};

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    wrapper: {
        marginVertical: theme.spacing.sm,
    },
    container: {
        backgroundColor: colors.bg.codeBg,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
        overflow: 'hidden',
        position: 'relative',
    },
    actionButtons: {
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 10,
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    codeScroll: {
        padding: theme.spacing.lg,
        maxHeight: 500,
    },
    code: {
        color: isDark ? '#e0def4' : '#1e293b',
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
        color: colors.text.tertiary,
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
    // Fullscreen modal styles
    fsContainer: {
        flex: 1,
        backgroundColor: '#0d1117',
    },
    fsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#161b22',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    fsHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    fsLang: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 11,
        fontFamily: theme.typography.families.mono,
        letterSpacing: 1,
    },
    fsComplexityRow: {
        flexDirection: 'row',
        gap: 8,
    },
    fsHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    fsCopyBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    fsCloseBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    fsScrollV: {
        flex: 1,
    },
    fsCodeContent: {
        padding: 16,
        paddingBottom: 60,
    },
});
