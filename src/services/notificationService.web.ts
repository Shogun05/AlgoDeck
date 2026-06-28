/**
 * Web stub for notificationService.ts — no-op on web.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const REMINDER_KEY = 'algodeck_reminder';
const REMINDER_HOUR_KEY = 'algodeck_reminder_hour';
const REMINDER_MIN_KEY = 'algodeck_reminder_min';

export const notificationService = {
    async requestPermissions(): Promise<boolean> { return false; },
    async scheduleReminder(_hour: number, _minute: number): Promise<boolean> {
        await AsyncStorage.setItem(REMINDER_KEY, 'true');
        await AsyncStorage.setItem(REMINDER_HOUR_KEY, String(_hour));
        await AsyncStorage.setItem(REMINDER_MIN_KEY, String(_minute));
        return false;
    },
    async cancelReminder(): Promise<void> {
        await AsyncStorage.setItem(REMINDER_KEY, 'false');
    },
    async getReminderSettings(): Promise<{ enabled: boolean; hour: number; minute: number }> {
        const enabled = (await AsyncStorage.getItem(REMINDER_KEY)) === 'true';
        const hour = parseInt((await AsyncStorage.getItem(REMINDER_HOUR_KEY)) || '9');
        const minute = parseInt((await AsyncStorage.getItem(REMINDER_MIN_KEY)) || '0');
        return { enabled, hour, minute };
    },
    async isReminderEnabled(): Promise<boolean> {
        const val = await AsyncStorage.getItem(REMINDER_KEY);
        return val === 'true';
    },
    async getReminderTime(): Promise<{ hour: number; minute: number }> {
        const hour = await AsyncStorage.getItem(REMINDER_HOUR_KEY);
        const minute = await AsyncStorage.getItem(REMINDER_MIN_KEY);
        return {
            hour: hour ? parseInt(hour, 10) : 9,
            minute: minute ? parseInt(minute, 10) : 0,
        };
    },
};
