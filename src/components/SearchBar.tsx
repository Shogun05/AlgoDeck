import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme/theme';

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
    return (
        <View style={styles.container}>
            <Ionicons name="search" size={20} color={theme.colors.primary + '99'} style={styles.icon} />
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.text.tertiary}
                returnKeyType="search"
                autoCorrect={false}
            />
            {value.length > 0 && (
                <TouchableOpacity onPress={() => onChangeText('')} style={styles.clear}>
                    <Ionicons name="close-circle" size={18} color={theme.colors.text.tertiary} />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: theme.borderRadius.lg,
        borderWidth: 0,
        paddingHorizontal: theme.spacing.lg,
        height: 48,
    },
    icon: {
        marginRight: theme.spacing.md,
    },
    input: {
        flex: 1,
        color: theme.colors.text.primary,
        fontSize: theme.typography.sizes.md,
    },
    clear: {
        marginLeft: theme.spacing.sm,
        padding: 2,
    },
});
