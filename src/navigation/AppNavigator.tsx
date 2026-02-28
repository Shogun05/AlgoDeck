import React, { useMemo } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme/theme';
import { hapticService } from '../services/haptics';

// Screens
import { DashboardScreen } from '../screens/DashboardScreen';
import { BrowseScreen } from '../screens/BrowseScreen';
import { AddQuestionScreen } from '../screens/AddQuestionScreen';
import { AddSolutionScreen } from '../screens/AddSolutionScreen';
import { QuestionDetailScreen } from '../screens/QuestionDetailScreen';
import { RevisionScreen } from '../screens/RevisionScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { StatsScreen } from '../screens/StatsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Custom FAB Tab Button
const FABButton = ({ onPress }: { onPress?: () => void }) => (
    <TouchableOpacity
        style={fabStyles.fabWrapper}
        onPress={onPress}
        activeOpacity={0.85}
    >
        <View style={fabStyles.fabBtn}>
            <Ionicons name="add" size={28} color="#fff" />
        </View>
    </TouchableOpacity>
);

// Static FAB styles (don't change with theme)
const fabStyles = StyleSheet.create({
    fabWrapper: {
        top: -26,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fabBtn: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 10,
    },
});

import { useThemeStore } from '../store/useThemeStore';

// Bottom Tab Navigator
function TabNavigator() {
    const isDarkMode = useThemeStore((state) => state.isDarkMode);
    const styles = useMemo(() => createStyles(isDarkMode), [isDarkMode]);

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: true,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: isDarkMode ? '#6E7681' : '#94a3b8',
                tabBarLabelStyle: styles.tabLabel,
            }}
        >
            <Tab.Screen
                name="Home"
                component={DashboardScreen}
                options={{
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="home" size={22} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Browse"
                component={BrowseScreen}
                options={{
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="grid" size={22} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Add"
                component={View} // Placeholder
                options={({ navigation }) => ({
                    tabBarButton: (props) => (
                        <FABButton
                            onPress={() => { hapticService.medium(); navigation.navigate('AddQuestion'); }}
                        />
                    ),
                })}
            />
            <Tab.Screen
                name="Stats"
                component={StatsScreen}
                options={{
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="bar-chart" size={22} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="settings" size={22} color={color} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
}

// Root Stack Navigator
export function AppNavigator() {
    const isDarkMode = useThemeStore((state) => state.isDarkMode);

    const navTheme = {
        ...DefaultTheme,
        colors: {
            ...DefaultTheme.colors,
            background: isDarkMode ? theme.colors.bg.dark : theme.colors.bg.light,
            card: isDarkMode ? theme.colors.bg.dark : theme.colors.bg.light,
            text: isDarkMode ? theme.colors.text.primary : theme.colors.text.dark,
            primary: theme.colors.primary,
        },
    };

    return (
        <NavigationContainer theme={navTheme}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Tabs" component={TabNavigator} />
                <Stack.Screen
                    name="AddQuestion"
                    component={AddQuestionScreen}
                    options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen
                    name="AddSolution"
                    component={AddSolutionScreen}
                    options={{ presentation: 'modal', animation: 'slide_from_right' }}
                />
                <Stack.Screen
                    name="QuestionDetail"
                    component={QuestionDetailScreen}
                    options={{ animation: 'slide_from_right' }}
                />
                <Stack.Screen
                    name="Revision"
                    component={RevisionScreen}
                    options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}

const createStyles = (isDark: boolean) => StyleSheet.create({
    tabBar: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 24 : 16,
        left: 16,
        right: 16,
        height: 64,
        borderRadius: 32,
        backgroundColor: isDark ? 'rgba(21, 15, 35, 0.92)' : 'rgba(255, 255, 255, 0.95)',
        borderTopWidth: 0,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        paddingBottom: 0,
        paddingTop: 6,
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.25 : 0.1,
        shadowRadius: 20,
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '500',
        marginTop: 2,
    },
});
