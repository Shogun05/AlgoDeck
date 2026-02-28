import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const REMINDER_KEY = 'algodeck_reminder';
const REMINDER_HOUR_KEY = 'algodeck_reminder_hour';
const REMINDER_MIN_KEY = 'algodeck_reminder_min';

// Lazy-load expo-notifications to avoid crash in Expo Go (SDK 53+)
let Notifications: typeof import('expo-notifications') | null = null;
let notifReady = false;

async function getNotifications() {
    if (Notifications) return Notifications;
    try {
        Notifications = require('expo-notifications');
        if (!notifReady) {
            Notifications!.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: false,
                    shouldShowBanner: true,
                    shouldShowList: true,
                }),
            });
            notifReady = true;
        }
        return Notifications;
    } catch {
        return null;
    }
}

export const notificationService = {
    /** Request notification permissions */
    async requestPermissions(): Promise<boolean> {
        const N = await getNotifications();
        if (!N) return false;

        try {
            const { status: existing } = await N.getPermissionsAsync();
            if (existing === 'granted') return true;

            const { status } = await N.requestPermissionsAsync();
            if (status !== 'granted') return false;

            if (Platform.OS === 'android') {
                await N.setNotificationChannelAsync('reminders', {
                    name: 'Study Reminders',
                    importance: N.AndroidImportance.HIGH,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#a985ff',
                });
            }
            return true;
        } catch {
            return false;
        }
    },

    /** Schedule a daily reminder at the given hour/minute */
    async scheduleDailyReminder(hour: number, minute: number): Promise<void> {
        const N = await getNotifications();
        if (!N) throw new Error('Notifications not available in Expo Go. Use a development build.');

        // Cancel any existing reminders first
        await this.cancelReminder();

        const hasPermission = await this.requestPermissions();
        if (!hasPermission) {
            throw new Error('Notification permission not granted');
        }

        try {
            await N.scheduleNotificationAsync({
                content: {
                    title: '🧠 Time to Review!',
                    body: 'You have cards due for review. Keep your streak going!',
                    sound: 'default',
                    ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
                },
                trigger: {
                    type: N.SchedulableTriggerInputTypes.DAILY,
                    hour,
                    minute,
                },
            });
        } catch {
            throw new Error('Notifications not supported in Expo Go. Use a development build.');
        }

        // Persist settings
        await AsyncStorage.setItem(REMINDER_KEY, 'true');
        await AsyncStorage.setItem(REMINDER_HOUR_KEY, String(hour));
        await AsyncStorage.setItem(REMINDER_MIN_KEY, String(minute));
    },

    /** Cancel daily reminder */
    async cancelReminder(): Promise<void> {
        const N = await getNotifications();
        try {
            if (N) await N.cancelAllScheduledNotificationsAsync();
        } catch { /* ignore in Expo Go */ }
        await AsyncStorage.setItem(REMINDER_KEY, 'false');
    },

    /** Check if reminders are enabled */
    async isReminderEnabled(): Promise<boolean> {
        const val = await AsyncStorage.getItem(REMINDER_KEY);
        return val === 'true';
    },

    /** Get saved reminder time */
    async getReminderTime(): Promise<{ hour: number; minute: number }> {
        const hour = await AsyncStorage.getItem(REMINDER_HOUR_KEY);
        const minute = await AsyncStorage.getItem(REMINDER_MIN_KEY);
        return {
            hour: hour ? parseInt(hour, 10) : 9,
            minute: minute ? parseInt(minute, 10) : 0,
        };
    },
};
