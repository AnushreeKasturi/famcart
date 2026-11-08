import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { isFirebaseConfigured } from '@/lib/firebase';
import { Loading, styles } from '@/components/ui';
import { colors, space } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {isFirebaseConfigured ? (
        <AuthProvider>
          <RootStack />
        </AuthProvider>
      ) : (
        <MissingConfig />
      )}
    </SafeAreaProvider>
  );
}

function RootStack() {
  const { user, profile, loading } = useAuth();
  if (loading) return <Loading />;

  const signedIn = user != null;
  const ready = signedIn && profile != null;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up" options={{ title: 'Create account' }} />
        <Stack.Screen name="forgot-password" options={{ title: 'Reset password' }} />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && !ready}>
        <Stack.Screen name="onboarding" options={{ title: 'Your profile', headerBackVisible: false }} />
      </Stack.Protected>

      <Stack.Protected guard={ready}>
        <Stack.Screen name="index" options={{ title: 'FamCart' }} />
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        <Stack.Screen name="new-circle" options={{ title: 'New circle', presentation: 'modal' }} />
        <Stack.Screen name="join" options={{ title: 'Join a circle', presentation: 'modal' }} />
        <Stack.Screen name="circle/[circleId]/index" options={{ title: '' }} />
        <Stack.Screen name="circle/[circleId]/members" options={{ title: 'Members' }} />
        <Stack.Screen name="circle/[circleId]/list/[listId]" options={{ title: '' }} />
      </Stack.Protected>
    </Stack>
  );
}

function MissingConfig() {
  return (
    <View style={[styles.center, { padding: space.xl, gap: space.md }]}>
      <Text style={styles.h1}>Almost there</Text>
      <Text style={[styles.muted, { textAlign: 'center' }]}>
        Firebase isn't configured yet. Copy .env.example to .env.local, fill in your Firebase web app
        config, then restart with "npx expo start --clear".
      </Text>
    </View>
  );
}
