import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar, Platform } from 'react-native';
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
        try {
          await getDatabase();
        } catch (dbError: any) {
          // database.web.ts explicitly throws this error on the web platform
          if (dbError.message !== '[web] SQLite not used on web') {
            throw dbError;
          }
        }
        await hapticService.init();
        await sm2IntervalService.init();
        await useNotebookStore.getState().loadNotebooks();
        await useNotebookStore.getState().initActiveNotebook();
        setDbReady(true);
      } catch (e) {
        console.error('Failed to initialize database/app:', e);
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
    <View style={styles.rootContainer}>
      <View style={[styles.appContainer, { backgroundColor: bgColor }]}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar barStyle={barStyle} backgroundColor={bgColor} />
          <AppNavigator />
        </GestureHandlerRootView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: theme.colors.bg.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rootContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a', // Use dark default outer background
    alignItems: 'center',
    justifyContent: 'center',
  },
  appContainer: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 450 : undefined,
    height: '100%',
    overflow: 'hidden',
    boxShadow: Platform.OS === 'web' ? '0px 0px 30px rgba(0, 0, 0, 0.5)' : undefined,
  },
});
