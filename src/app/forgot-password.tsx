import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { friendlyAuthError } from '@/context/AuthContext';
import { Button, ErrorText, Input, styles } from '@/components/ui';
import { colors, space } from '@/theme';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: space.xl, gap: space.lg }} keyboardShouldPersistTaps="handled">
      <Text style={styles.muted}>Enter your email and we'll send you a link to set a new password.</Text>
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com"
        onSubmitEditing={submit}
      />
      <ErrorText>{error}</ErrorText>
      {sent ? (
        <Text style={{ color: colors.primary }}>Sent! Check your inbox (and spam folder).</Text>
      ) : null}
      <Button title="Send reset link" onPress={submit} loading={busy} />
    </ScrollView>
  );
}
