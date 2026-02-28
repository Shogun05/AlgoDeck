import React, { useMemo, useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Alert, Linking,
    Modal, Platform, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { exportZip, shareFile } from '../services/exportService';
import { importBackup } from '../services/importService';
import { notificationService } from '../services/notificationService';
import { hapticService } from '../services/haptics';
import { sm2IntervalService, SM2Intervals } from '../services/sm2Intervals';
import { useNotebookStore } from '../store/useNotebookStore';
import theme from '../theme/theme';
import { useAppTheme, ThemeColors } from '../theme/useAppTheme';

import { useThemeStore } from '../store/useThemeStore';

export const SettingsScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { isDarkMode, toggleTheme } = useThemeStore();
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors, isDarkMode), [isDarkMode]);
    const [haptics, setHaptics] = React.useState(true);
    const [reminderEnabled, setReminderEnabled] = useState(false);
    const [reminderHour, setReminderHour] = useState(9);
    const [reminderMinute, setReminderMinute] = useState(0);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [sm2, setSm2] = useState<SM2Intervals>(sm2IntervalService.getDefaults());
    const { notebooks } = useNotebookStore();
    const [showExportNotebookPicker, setShowExportNotebookPicker] = useState(false);

    // Load settings on mount
    useEffect(() => {
        (async () => {
            await hapticService.init();
            setHaptics(hapticService.isEnabled());
            const enabled = await notificationService.isReminderEnabled();
            const { hour, minute } = await notificationService.getReminderTime();
            setReminderEnabled(enabled);
            setReminderHour(hour);
            setReminderMinute(minute);
            await sm2IntervalService.init();
            setSm2(sm2IntervalService.getIntervals());
        })();
    }, []);

    const handleToggleHaptics = async (value: boolean) => {
        setHaptics(value);
        await hapticService.setEnabled(value);
        if (value) hapticService.light();
    };

    const handleToggleReminder = async (value: boolean) => {
        hapticService.light();
        if (value) {
            try {
                await notificationService.scheduleDailyReminder(reminderHour, reminderMinute);
                setReminderEnabled(true);
            } catch {
                Alert.alert('Permission Needed', 'Please allow notifications to use reminders.');
            }
        } else {
            await notificationService.cancelReminder();
            setReminderEnabled(false);
        }
    };

    const handleSetTime = async (hour: number, minute: number) => {
        hapticService.medium();
        setReminderHour(hour);
        setReminderMinute(minute);
        setShowTimePicker(false);
        if (reminderEnabled) {
            await notificationService.scheduleDailyReminder(hour, minute);
        }
    };

    const formatTime = (h: number, m: number) => {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
    };

    const handleExport = async () => {
        hapticService.medium();
        try {
            const path = await exportZip();
            hapticService.success();
            await shareFile(path);
        } catch (e: any) {
            hapticService.error();
            Alert.alert('Export Failed', e.message);
        }
    };

    const handleImport = async () => {
        hapticService.medium();
        const result = await importBackup();
        if (result.success) hapticService.success();
        else hapticService.warning();
        Alert.alert(result.success ? 'Success' : 'Import', result.message);
    };

    const handleResetProgress = () => {
        hapticService.warning();
        Alert.alert(
            'Reset Progress',
            'This will clear all learning progress (spacing data). Questions will remain. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: () => { } },
            ]
        );
    };

    const updateSM2 = async (key: keyof SM2Intervals, value: string) => {
        const n = parseFloat(value);
        if (isNaN(n) || n < 0) return;
        const updated = { ...sm2, [key]: n };
        setSm2(updated);
        await sm2IntervalService.setIntervals(updated);
    };

    const handleExportNotebook = async (notebookId: number) => {
        hapticService.medium();
        setShowExportNotebookPicker(false);
        try {
            const path = await exportZip(notebookId);
            hapticService.success();
            await shareFile(path);
        } catch (e: any) {
            hapticService.error();
            Alert.alert('Export Failed', e.message);
        }
    };

    return (
        <View style={styles.screen}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => { hapticService.light(); navigation.goBack(); }}
                    style={styles.backBtn}
                >
                    <Ionicons name="chevron-back" size={26} color={colors.text.secondary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarCircle}>
                        <Ionicons name="person" size={28} color={colors.primary} />
                        <View style={styles.onlineDot} />
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>User</Text>
                        <View style={styles.syncRow}>
                            <Ionicons name="cloud-done" size={12} color={colors.primary} />
                            <Text style={styles.syncText}>Local storage</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.editBtn}>
                        <Ionicons name="pencil" size={18} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* App Preferences */}
                <Text style={styles.sectionLabel}>APP PREFERENCES</Text>
                <View style={styles.settingsCard}>
                    {/* Dark Mode */}
                    <View style={styles.settingRow}>
                        <View style={styles.settingLeft}>
                            <View style={[styles.settingIcon, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
                                <Ionicons name="moon" size={18} color="#818cf8" />
                            </View>
                            <Text style={styles.settingLabel}>Dark Mode</Text>
                        </View>
                        <Switch
                            value={isDarkMode}
                            onValueChange={(v) => { hapticService.medium(); toggleTheme(); }}
                            trackColor={{ false: '#374151', true: colors.primary }}
                            thumbColor="#fff"
                        />
                    </View>
                    <View style={styles.separator} />
                    {/* Haptics */}
                    <View style={styles.settingRow}>
                        <View style={styles.settingLeft}>
                            <View style={[styles.settingIcon, { backgroundColor: 'rgba(244,114,182,0.15)' }]}>
                                <Ionicons name="phone-portrait" size={18} color="#f472b6" />
                            </View>
                            <Text style={styles.settingLabel}>Haptics</Text>
                        </View>
                        <Switch
                            value={haptics}
                            onValueChange={handleToggleHaptics}
                            trackColor={{ false: '#374151', true: colors.primary }}
                            thumbColor="#fff"
                        />
                    </View>
                    <View style={styles.separator} />
                    {/* Daily Reminder */}
                    <View style={styles.settingRow}>
                        <View style={styles.settingLeft}>
                            <View style={[styles.settingIcon, { backgroundColor: 'rgba(251,146,60,0.15)' }]}>
                                <Ionicons name="notifications" size={18} color="#fb923c" />
                            </View>
                            <View>
                                <Text style={styles.settingLabel}>Daily Reminder</Text>
                                <Text style={styles.settingSublabel}>
                                    {reminderEnabled ? formatTime(reminderHour, reminderMinute) : 'Off'}
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={reminderEnabled}
                            onValueChange={handleToggleReminder}
                            trackColor={{ false: '#374151', true: colors.primary }}
                            thumbColor="#fff"
                        />
                    </View>
                    {reminderEnabled && (
                        <>
                            <View style={styles.separator} />
                            <TouchableOpacity
                                style={styles.settingRow}
                                onPress={() => { hapticService.light(); setShowTimePicker(true); }}
                            >
                                <View style={styles.settingLeft}>
                                    <View style={[styles.settingIcon, { backgroundColor: 'rgba(169,133,255,0.15)' }]}>
                                        <Ionicons name="time-outline" size={18} color={colors.primary} />
                                    </View>
                                    <Text style={styles.settingLabel}>Reminder Time</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Text style={styles.settingSublabel}>{formatTime(reminderHour, reminderMinute)}</Text>
                                    <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
                                </View>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {/* Spaced Repetition Intervals */}
                <Text style={styles.sectionLabel}>SPACED REPETITION</Text>
                <View style={styles.settingsCard}>
                    {/* Again */}
                    <View style={styles.settingRow}>
                        <View style={styles.settingLeft}>
                            <View style={[styles.settingIcon, { backgroundColor: 'rgba(248,81,73,0.12)' }]}>
                                <Ionicons name="close-circle" size={18} color="#F85149" />
                            </View>
                            <View>
                                <Text style={styles.settingLabel}>Again</Text>
                                <Text style={styles.settingSublabel}>Minutes before re-show</Text>
                            </View>
                        </View>
                        <View style={styles.intervalInput}>
                            <TextInput
                                style={styles.intervalTextInput}
                                value={String(sm2.again)}
                                onChangeText={v => updateSM2('again', v)}
                                keyboardType="numeric"
                                selectTextOnFocus
                            />
                            <Text style={styles.intervalUnit}>min</Text>
                        </View>
                    </View>
                    <View style={styles.separator} />
                    {/* Hard */}
                    <View style={styles.settingRow}>
                        <View style={styles.settingLeft}>
                            <View style={[styles.settingIcon, { backgroundColor: 'rgba(251,146,60,0.12)' }]}>
                                <Ionicons name="alert-circle" size={18} color="#fb923c" />
                            </View>
                            <View>
                                <Text style={styles.settingLabel}>Hard</Text>
                                <Text style={styles.settingSublabel}>Minutes before re-show</Text>
                            </View>
                        </View>
                        <View style={styles.intervalInput}>
                            <TextInput
                                style={styles.intervalTextInput}
                                value={String(sm2.hard)}
                                onChangeText={v => updateSM2('hard', v)}
                                keyboardType="numeric"
                                selectTextOnFocus
                            />
                            <Text style={styles.intervalUnit}>min</Text>
                        </View>
                    </View>
                    <View style={styles.separator} />
                    {/* Good */}
                    <View style={styles.settingRow}>
                        <View style={styles.settingLeft}>
                            <View style={[styles.settingIcon, { backgroundColor: 'rgba(169,133,255,0.15)' }]}>
                                <Ionicons name="checkmark-circle" size={18} color="#a985ff" />
                            </View>
                            <View>
                                <Text style={styles.settingLabel}>Good</Text>
                                <Text style={styles.settingSublabel}>Days until next review</Text>
                            </View>
                        </View>
                        <View style={styles.intervalInput}>
                            <TextInput
                                style={styles.intervalTextInput}
                                value={String(sm2.good)}
                                onChangeText={v => updateSM2('good', v)}
                                keyboardType="numeric"
                                selectTextOnFocus
                            />
                            <Text style={styles.intervalUnit}>days</Text>
                        </View>
                    </View>
                    <View style={styles.separator} />
                    {/* Easy */}
                    <View style={styles.settingRow}>
                        <View style={styles.settingLeft}>
                            <View style={[styles.settingIcon, { backgroundColor: 'rgba(45,212,191,0.12)' }]}>
                                <Ionicons name="rocket" size={18} color="#2dd4bf" />
                            </View>
                            <View>
                                <Text style={styles.settingLabel}>Easy</Text>
                                <Text style={styles.settingSublabel}>Days until next review</Text>
                            </View>
                        </View>
                        <View style={styles.intervalInput}>
                            <TextInput
                                style={styles.intervalTextInput}
                                value={String(sm2.easy)}
                                onChangeText={v => updateSM2('easy', v)}
                                keyboardType="numeric"
                                selectTextOnFocus
                            />
                            <Text style={styles.intervalUnit}>days</Text>
                        </View>
                    </View>
                </View>

                {/* Data Management */}
                <Text style={styles.sectionLabel}>DATA MANAGEMENT</Text>
                <View style={styles.dataCards}>
                    {/* Export */}
                    <TouchableOpacity style={styles.dataCard} onPress={handleExport} activeOpacity={0.8}>
                        <View style={styles.dataCardLeft}>
                            <View style={[styles.dataIcon, { backgroundColor: 'rgba(169,133,255,0.15)' }]}>
                                <Ionicons name="cloud-upload" size={20} color={colors.primary} />
                            </View>
                            <View>
                                <Text style={styles.dataTitle}>Export Backup</Text>
                                <Text style={styles.dataSubtitle}>Backup with photos (.algodeck)</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
                    </TouchableOpacity>

                    {/* Import */}
                    <TouchableOpacity style={styles.dataCard} onPress={handleImport} activeOpacity={0.8}>
                        <View style={styles.dataCardLeft}>
                            <View style={[styles.dataIcon, { backgroundColor: 'rgba(88,166,255,0.15)' }]}>
                                <Ionicons name="cloud-download" size={20} color="#58a6ff" />
                            </View>
                            <View>
                                <Text style={styles.dataTitle}>Import Backup</Text>
                                <Text style={styles.dataSubtitle}>Restore from .algodeck or .json</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
                    </TouchableOpacity>

                    {/* Export by Notebook */}
                    {notebooks.length > 0 && (
                        <TouchableOpacity style={styles.dataCard} onPress={() => setShowExportNotebookPicker(true)} activeOpacity={0.8}>
                            <View style={styles.dataCardLeft}>
                                <View style={[styles.dataIcon, { backgroundColor: 'rgba(63,185,80,0.15)' }]}>
                                    <Ionicons name="book" size={20} color="#3FB950" />
                                </View>
                                <View>
                                    <Text style={styles.dataTitle}>Export Notebook</Text>
                                    <Text style={styles.dataSubtitle}>Export a single notebook</Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
                        </TouchableOpacity>
                    )}

                    {/* Reset */}
                    <TouchableOpacity style={styles.resetCard} onPress={handleResetProgress} activeOpacity={0.8}>
                        <View style={styles.dataCardLeft}>
                            <View style={[styles.settingIcon, { backgroundColor: 'rgba(248,81,73,0.1)' }]}>
                                <Ionicons name="trash-outline" size={18} color="#F85149" />
                            </View>
                            <Text style={styles.resetText}>Reset Progress</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <View style={styles.footerLogo}>
                        <View style={styles.footerBadge}>
                            <Text style={styles.footerBadgeText}>AD</Text>
                        </View>
                        <Text style={styles.footerAppName}>AlgoDeck</Text>
                    </View>
                    <Text style={styles.footerVersion}>Version 1.0.0</Text>
                    <Text style={styles.footerMade}>Made with ❤️ for LeetCode grinders</Text>
                </View>
            </ScrollView>

            {/* Notebook Export Picker */}
            <Modal
                visible={showExportNotebookPicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowExportNotebookPicker(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowExportNotebookPicker(false)}
                >
                    <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
                        <Text style={styles.modalSheetTitle}>Export Notebook</Text>
                        {notebooks.map(nb => (
                            <TouchableOpacity
                                key={nb.id}
                                style={styles.notebookExportRow}
                                onPress={() => handleExportNotebook(nb.id)}
                            >
                                <View style={[styles.notebookExportDot, { backgroundColor: nb.color }]} />
                                <Text style={styles.notebookExportText}>{nb.name}</Text>
                                <Ionicons name="download-outline" size={18} color={colors.text.tertiary} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Native Time Picker */}
            {showTimePicker && (
                <DateTimePicker
                    value={(() => {
                        const d = new Date();
                        d.setHours(reminderHour, reminderMinute, 0, 0);
                        return d;
                    })()}
                    mode="time"
                    is24Hour={false}
                    display="spinner"
                    onChange={(event: any, date?: Date) => {
                        if (event.type === 'dismissed') {
                            setShowTimePicker(false);
                            return;
                        }
                        if (date) {
                            handleSetTime(date.getHours(), date.getMinutes());
                        }
                    }}
                />
            )}
        </View>
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
        paddingHorizontal: 16,
        paddingTop: 56,
        paddingBottom: 12,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        color: colors.text.heading,
        fontSize: 20,
        fontWeight: '700',
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 20,
    },
    // Profile
    profileCard: {
        backgroundColor: colors.bg.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.bg.cardBorder,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 28,
        ...(isDark ? { elevation: 0 } : theme.shadows.soft),
    },
    avatarCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(169,133,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: colors.bg.cardBorder,
    },
    onlineDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#3FB950',
        borderWidth: 2,
        borderColor: colors.bg.primary,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        color: colors.text.heading,
        fontSize: 18,
        fontWeight: '700',
    },
    syncRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    syncText: {
        color: colors.text.tertiary,
        fontSize: 13,
    },
    editBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(169,133,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Section
    sectionLabel: {
        color: colors.text.tertiary,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 12,
        marginLeft: 4,
    },
    // Settings card
    settingsCard: {
        backgroundColor: colors.bg.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.bg.cardBorder,
        marginBottom: 28,
        overflow: 'hidden',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settingIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingLabel: {
        color: colors.text.primary,
        fontSize: 15,
        fontWeight: '500',
    },
    settingSublabel: {
        color: colors.text.tertiary,
        fontSize: 11,
        marginTop: 1,
    },
    separator: {
        height: 1,
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
        marginHorizontal: 16,
    },
    // Data
    dataCards: {
        gap: 12,
        marginBottom: 28,
    },
    dataCard: {
        backgroundColor: colors.bg.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.bg.cardBorder,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dataCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    dataIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dataTitle: {
        color: colors.text.heading,
        fontSize: 15,
        fontWeight: '600',
    },
    dataSubtitle: {
        color: colors.text.tertiary,
        fontSize: 12,
        marginTop: 1,
    },
    resetCard: {
        backgroundColor: 'rgba(248,81,73,0.04)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(248,81,73,0.15)',
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    resetText: {
        color: '#F85149',
        fontSize: 15,
        fontWeight: '500',
    },
    // Footer
    footer: {
        alignItems: 'center',
        gap: 8,
        paddingVertical: 20,
    },
    footerLogo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    footerBadge: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
    },
    footerAppName: {
        color: colors.text.tertiary,
        fontSize: 14,
        fontWeight: '700',
    },
    footerVersion: {
        color: colors.text.tertiary,
        fontSize: 12,
    },
    footerMade: {
        color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)',
        fontSize: 10,
        marginTop: 8,
    },
    // SM2 interval inputs
    intervalInput: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    intervalTextInput: {
        width: 56,
        height: 36,
        borderRadius: 10,
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        color: colors.text.primary,
        textAlign: 'center',
        fontSize: 15,
        fontWeight: '600',
    },
    intervalUnit: {
        color: colors.text.tertiary,
        fontSize: 12,
        fontWeight: '500',
    },
    // Notebook export modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: colors.bg.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 40,
    },
    modalSheetTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text.heading,
        marginBottom: 16,
    },
    notebookExportRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    notebookExportDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    notebookExportText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: colors.text.primary,
    },
});
