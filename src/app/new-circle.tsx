import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { router } from 'expo-router';
import { useMe } from '@/context/AuthContext';
import { createCircle } from '@/lib/db';
import { Button, ErrorText, Input, styles } from '@/components/ui';
import { space } from '@/theme';

export default function NewCircle() {
  const { uid } = useMe();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      setError('Give your circle a name.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const id = await createCircle(uid, name);
      router.dismissTo(`/circle/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: space.xl, gap: space.lg }} keyboardShouldPersistTaps="handled">
      <Text style={styles.muted}>
        A circle is a group that shares lists, like your family or flatmates. You'll get a code to invite
        everyone.
      </Text>
      <Input
        label="Circle name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Home, Kasturi Family"
        autoFocus
        maxLength={40}
        onSubmitEditing={submit}
      />
      <ErrorText>{error}</ErrorText>
      <Button title="Create circle" onPress={submit} loading={busy} />
    </ScrollView>
  );
}
