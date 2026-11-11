import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { palette } from '../src/ui/theme'

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.bg }}>
      <SafeAreaProvider>
        <StatusBar hidden />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: palette.bg },
            // Sin transición: entre pantallas de un juego, un deslizamiento de
            // sistema se siente a app de formularios.
            animation: 'none',
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
