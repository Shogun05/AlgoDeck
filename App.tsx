import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';
import { getDatabase } from './src/db/database';
import theme from './src/theme/theme';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    async function initDB() {
      try {
        await getDatabase();
        setDbReady(true);
      } catch (e) {
        console.error('Failed to initialize database:', e);
      }
    }
    initDB();
  }, []);

  if (!dbReady || !fontsLoaded) {
    return (
      <View style={styles.loading}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.bg.dark} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.bg.dark} />
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
