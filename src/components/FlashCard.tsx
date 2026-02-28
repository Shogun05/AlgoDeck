import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    interpolate,
} from 'react-native-reanimated';
import theme from '../theme/theme';
import { useAppTheme, ThemeColors } from '../theme/useAppTheme';

interface FlashCardProps {
    front: React.ReactNode;
    back: React.ReactNode;
    isFlipped: boolean;
    onFlip: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;

export const FlashCard: React.FC<FlashCardProps> = ({ front, back, isFlipped, onFlip }) => {
    const rotation = useSharedValue(0);
    const { colors, isDarkMode } = useAppTheme();
    const styles = useMemo(() => createStyles(colors, isDarkMode), [isDarkMode]);

    React.useEffect(() => {
        rotation.value = withTiming(isFlipped ? 180 : 0, { duration: 500 });
    }, [isFlipped]);

    const frontStyle = useAnimatedStyle(() => {
        const rotateY = interpolate(rotation.value, [0, 180], [0, 180]);
        return {
            transform: [{ perspective: 1500 }, { rotateY: `${rotateY}deg` }],
            backfaceVisibility: 'hidden' as const,
            opacity: interpolate(rotation.value, [0, 89, 90, 180], [1, 1, 0, 0]),
        };
    });

    const backStyle = useAnimatedStyle(() => {
        const rotateY = interpolate(rotation.value, [0, 180], [180, 360]);
        return {
            transform: [{ perspective: 1500 }, { rotateY: `${rotateY}deg` }],
            backfaceVisibility: 'hidden' as const,
            opacity: interpolate(rotation.value, [0, 89, 90, 180], [0, 0, 1, 1]),
        };
    });

    return (
        <TouchableOpacity activeOpacity={0.95} onPress={onFlip} style={styles.wrapper}>
            <View style={styles.cardContainer}>
                <Animated.View style={[styles.card, frontStyle]}>
                    {front}
                </Animated.View>
                <Animated.View style={[styles.card, styles.cardBack, backStyle]}>
                    {back}
                </Animated.View>
            </View>
        </TouchableOpacity>
    );
};

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    wrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardContainer: {
        width: CARD_WIDTH,
        flex: 1,
    },
    card: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.bg.card,
        borderRadius: theme.borderRadius.xxl,
        borderWidth: 1,
        borderColor: colors.bg.cardBorder,
        overflow: 'hidden',
        ...theme.shadows.lg,
    },
    cardBack: {
        // Same positioning, backStyle animates it
    },
});
