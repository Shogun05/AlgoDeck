import React from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Alert, Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { exportJSON, shareFile } from '../services/exportService';
import { importJSON } from '../services/importService';
import theme from '../theme/theme';

import { useThemeStore } from '../store/useThemeStore';

export const SettingsScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { isDarkMode, toggleTheme } = useThemeStore();
    const [haptics, setHaptics] = React.useState(true);

    const handleExport = async () => {
        try {
            const path = await exportJSON();
            await shareFile(path);
        } catch (e: any) {
            Alert.alert('Export Failed', e.message);
        }
    };

    const handleImport = async () => {
        const result = await importJSON();
        Alert.alert(result.success ? 'Success' : 'Import', result.message);
    };

    const handleResetProgress = () => {
        Alert.alert(
            'Reset Progress',
            'This will clear all learning progress (spacing data). Questions will remain. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: () => { } },
            ]
        );
    };

    return (
        <View style={styles.screen}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                >
                    <Ionicons name="chevron-back" size={26} color={theme.colors.text.secondary} />
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
                        <Ionicons name="person" size={28} color={theme.colors.primary} />
                        <View style={styles.onlineDot} />
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>User</Text>
                        <View style={styles.syncRow}>
                            <Ionicons name="cloud-done" size={12} color={theme.colors.primary} />
                            <Text style={styles.syncText}>Local storage</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.editBtn}>
                        <Ionicons name="pencil" size={18} color={theme.colors.primary} />
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
                            onValueChange={toggleTheme}
                            trackColor={{ false: '#374151', true: theme.colors.primary }}
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
                            onValueChange={setHaptics}
                            trackColor={{ false: '#374151', true: theme.colors.primary }}
                            thumbColor="#fff"
                        />
                    </View>
                    <View style={styles.separator} />
                    {/* Daily Reminder */}
                    <TouchableOpacity style={styles.settingRow}>
                        <View style={styles.settingLeft}>
                            <View style={[styles.settingIcon, { backgroundColor: 'rgba(251,146,60,0.15)' }]}>
                                <Ionicons name="notifications" size={18} color="#fb923c" />
                            </View>
                            <View>
                                <Text style={styles.settingLabel}>Daily Reminder</Text>
                                <Text style={styles.settingSublabel}>9:00 AM</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />
                    </TouchableOpacity>
                </View>

                {/* Data Management */}
                <Text style={styles.sectionLabel}>DATA MANAGEMENT</Text>
                <View style={styles.dataCards}>
                    {/* Export */}
                    <TouchableOpacity style={styles.dataCard} onPress={handleExport} activeOpacity={0.8}>
                        <View style={styles.dataCardLeft}>
                            <View style={[styles.dataIcon, { backgroundColor: 'rgba(169,133,255,0.15)' }]}>
                                <Ionicons name="cloud-upload" size={20} color={theme.colors.primary} />
                            </View>
                            <View>
                                <Text style={styles.dataTitle}>Export Data</Text>
                                <Text style={styles.dataSubtitle}>Backup your flashcards to JSON</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />
                    </TouchableOpacity>

                    {/* Import */}
                    <TouchableOpacity style={styles.dataCard} onPress={handleImport} activeOpacity={0.8}>
                        <View style={styles.dataCardLeft}>
                            <View style={[styles.dataIcon, { backgroundColor: 'rgba(88,166,255,0.15)' }]}>
                                <Ionicons name="cloud-download" size={20} color="#58a6ff" />
                            </View>
                            <View>
                                <Text style={styles.dataTitle}>Import Backup</Text>
                                <Text style={styles.dataSubtitle}>Restore from a previous file</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />
                    </TouchableOpacity>

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
        </View>
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
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 20,
    },
    // Profile
    profileCard: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 28,
        ...theme.shadows.soft,
    },
    avatarCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(169,133,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.06)',
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
        borderColor: theme.colors.bg.dark,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        color: '#fff',
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
        color: theme.colors.text.tertiary,
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
        color: theme.colors.text.tertiary,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 12,
        marginLeft: 4,
    },
    // Settings card
    settingsCard: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
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
        color: theme.colors.text.primary,
        fontSize: 15,
        fontWeight: '500',
    },
    settingSublabel: {
        color: theme.colors.text.tertiary,
        fontSize: 11,
        marginTop: 1,
    },
    separator: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.04)',
        marginHorizontal: 16,
    },
    // Data
    dataCards: {
        gap: 12,
        marginBottom: 28,
    },
    dataCard: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
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
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    dataSubtitle: {
        color: theme.colors.text.tertiary,
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
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
    },
    footerAppName: {
        color: theme.colors.text.tertiary,
        fontSize: 14,
        fontWeight: '700',
    },
    footerVersion: {
        color: theme.colors.text.tertiary,
        fontSize: 12,
    },
    footerMade: {
        color: 'rgba(255,255,255,0.15)',
        fontSize: 10,
        marginTop: 8,
    },
});
