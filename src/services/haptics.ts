import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HAPTICS_KEY = 'algodeck_haptics';

let hapticsEnabled = true;

export const hapticService = {
    async init() {
        const val = await AsyncStorage.getItem(HAPTICS_KEY);
        hapticsEnabled = val !== 'false'; // default true
    },

    async setEnabled(enabled: boolean) {
        hapticsEnabled = enabled;
        await AsyncStorage.setItem(HAPTICS_KEY, String(enabled));
    },

    isEnabled() {
        return hapticsEnabled;
    },

    /** Light tap — buttons, toggles, chips */
    light() {
        if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },

    /** Medium tap — tab switch, card flip, selections */
    medium() {
        if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },

    /** Heavy tap — save, delete, important actions */
    heavy() {
        if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    },

    /** Success — save confirmed, import done */
    success() {
        if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },

    /** Warning — destructive action */
    warning() {
        if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },

    /** Error — validation fail */
    error() {
        if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },

    /** Selection tick — scrolling through options */
    selection() {
        if (hapticsEnabled) Haptics.selectionAsync();
    },
};
