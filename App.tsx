import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';
import { getDatabase } from './src/db/database';
import theme from './src/theme/theme';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from './src/store/useThemeStore';
import { useNotebookStore } from './src/store/useNotebookStore';
import { hapticService } from './src/services/haptics';
import { sm2IntervalService } from './src/services/sm2Intervals';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    async function initDB() {
      try {
        await getDatabase();
        await hapticService.init();
        await sm2IntervalService.init();
        await useNotebookStore.getState().loadNotebooks();
        await useNotebookStore.getState().initActiveNotebook();
        setDbReady(true);
      } catch (e) {
        console.error('Failed to initialize database:', e);
      }
    }
    initDB();
  }, []);

  const bgColor = isDarkMode ? theme.colors.bg.dark : theme.colors.bg.light;
  const barStyle = isDarkMode ? 'light-content' : 'dark-content';

  if (!dbReady || !fontsLoaded) {
    return (
      <View style={[styles.loading, { backgroundColor: bgColor }]}>
        <StatusBar barStyle={barStyle} backgroundColor={bgColor} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle={barStyle} backgroundColor={bgColor} />
      <AppNavigator />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: theme.colors.bg.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
