import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMe } from '@/context/AuthContext';
import { joinCircle, normalizeCode } from '@/lib/db';
import { Button, ErrorText, Input, styles } from '@/components/ui';
import { space } from '@/theme';

export default function Join() {
  const { uid } = useMe();
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(params.code ? normalizeCode(params.code) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const id = await joinCircle(uid, code);
      router.dismissTo(`/circle/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: space.xl, gap: space.lg }} keyboardShouldPersistTaps="handled">
      <Text style={styles.muted}>
        Ask someone in the circle for its 6-character invite code. They'll find it on the circle's page.
      </Text>
      <Input
        label="Invite code"
        value={code}
        onChangeText={(t) => setCode(normalizeCode(t).slice(0, 6))}
        placeholder="ABC123"
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus
        style={{ fontSize: 24, letterSpacing: 6, textAlign: 'center', fontWeight: '700' }}
        onSubmitEditing={submit}
      />
      <ErrorText>{error}</ErrorText>
      <Button title="Join circle" onPress={submit} loading={busy} disabled={code.length !== 6} />
    </ScrollView>
  );
}
