import React, { useMemo } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme/theme';
import { useAppTheme, ThemeColors } from '../theme/useAppTheme';

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
    value,
    onChangeText,
    placeholder = 'Search algorithms, data structures...',
}) => {
    const { colors, isDarkMode } = useAppTheme();
    const styles = useMemo(() => createStyles(colors, isDarkMode), [isDarkMode]);

    return (
        <View style={styles.container}>
            <Ionicons name="search" size={20} color={colors.primary + '99'} style={styles.icon} />
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={colors.text.tertiary}
                returnKeyType="search"
                autoCorrect={false}
            />
            {value.length > 0 && (
                <TouchableOpacity onPress={() => onChangeText('')} style={styles.clear}>
                    <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
                </TouchableOpacity>
            )}
        </View>
    );
};

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bg.input,
        borderRadius: theme.borderRadius.lg,
        borderWidth: isDark ? 0 : 1,
        borderColor: colors.bg.cardBorder,
        paddingHorizontal: theme.spacing.lg,
        height: 48,
    },
    icon: {
        marginRight: theme.spacing.md,
    },
    input: {
        flex: 1,
        color: colors.text.primary,
        fontSize: theme.typography.sizes.md,
    },
    clear: {
        marginLeft: theme.spacing.sm,
        padding: 2,
    },
});
