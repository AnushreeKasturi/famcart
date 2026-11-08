import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View, type TextInputInstance } from 'react-native';
import { Link } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '@/lib/firebase';
import { friendlyAuthError } from '@/context/AuthContext';
import { Button, ErrorText, Input, styles } from '@/components/ui';
import { colors, space } from '@/theme';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInputInstance>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      setError(friendlyAuthError(e));
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: space.xl, gap: space.lg }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', gap: space.sm, marginBottom: space.lg }}>
            <Text style={{ fontSize: 56 }}>🛒</Text>
            <Text style={styles.h1}>FamCart</Text>
            <Text style={styles.muted}>One shopping list for the whole family</Text>
          </View>

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@example.com"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <Input
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            placeholder="Your password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          <ErrorText>{error}</ErrorText>
          <Button title="Sign in" onPress={submit} loading={busy} />

          <Link href="/forgot-password" style={{ color: colors.primary, textAlign: 'center' }}>
            Forgot password?
          </Link>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
            <Text style={styles.muted}>New here?</Text>
            <Link href="/sign-up" style={{ color: colors.primary, fontWeight: '600' }}>
              Create an account
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
