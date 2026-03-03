/**
 * Web stub for haptics.ts — all methods are no-ops on web.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const HAPTICS_KEY = 'algodeck_haptics';
let hapticsEnabled = false;

export const hapticService = {
    async init() {
        const val = await AsyncStorage.getItem(HAPTICS_KEY);
        hapticsEnabled = val !== 'false';
    },
    async setEnabled(enabled: boolean) {
        hapticsEnabled = enabled;
        await AsyncStorage.setItem(HAPTICS_KEY, String(enabled));
    },
    isEnabled() { return hapticsEnabled; },
    light() { },
    medium() { },
    heavy() { },
    success() { },
    warning() { },
    error() { },
    selection() { },
};
