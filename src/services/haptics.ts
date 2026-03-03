import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const HAPTICS_KEY = 'algodeck_haptics';

let hapticsEnabled = true;

const tryHaptic = (hapticCall: () => void) => {
    if (!hapticsEnabled || Platform.OS === 'web') return;
    try {
        hapticCall();
    } catch (e) {
        // Ignore haptics errors quietly
    }
};

export const hapticService = {
    async init() {
        if (Platform.OS === 'web') {
            hapticsEnabled = false;
            return;
        }
        try {
            const val = await AsyncStorage.getItem(HAPTICS_KEY);
            hapticsEnabled = val !== 'false'; // default true
        } catch {
            hapticsEnabled = true;
        }
    },

    async setEnabled(enabled: boolean) {
        hapticsEnabled = enabled;
        if (Platform.OS !== 'web') {
            try {
                await AsyncStorage.setItem(HAPTICS_KEY, String(enabled));
            } catch { }
        }
    },

    isEnabled() {
        return hapticsEnabled;
    },

    /** Light tap — buttons, toggles, chips */
    light() {
        tryHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    },

    /** Medium tap — tab switch, card flip, selections */
    medium() {
        tryHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    },

    /** Heavy tap — save, delete, important actions */
    heavy() {
        tryHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
    },

    /** Success — save confirmed, import done */
    success() {
        tryHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    },

    /** Warning — destructive action */
    warning() {
        tryHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
    },

    /** Error — validation fail */
    error() {
        tryHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
    },

    /** Selection tick — scrolling through options */
    selection() {
        tryHaptic(() => Haptics.selectionAsync());
    },
};
