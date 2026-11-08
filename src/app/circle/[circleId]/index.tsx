import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useMe } from '@/context/AuthContext';
import { createList, useCircle, useLists, useProfiles } from '@/lib/db';
import { tapFeedback } from '@/lib/confirm';
import { Avatar, Button, Card, ErrorText, Input, Loading, SectionTitle, styles } from '@/components/ui';
import { colors, radius, space } from '@/theme';

export default function CircleScreen() {
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const { uid } = useMe();
  const circle = useCircle(circleId);
  const lists = useLists(circleId);
  const profiles = useProfiles(circle.data?.memberIds ?? []);
  const [newList, setNewList] = useState('');
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (circle.loading) return <Loading />;
  const c = circle.data;
  if (!c || !c.memberIds.includes(uid)) {
    return (
      <View style={[styles.center, { padding: space.xl, gap: space.md }]}>
        <Text style={styles.muted}>This circle doesn't exist any more, or you're no longer a member.</Text>
        <Button title="Back home" onPress={() => router.dismissTo('/')} />
      </View>
    );
  }

  async function addList() {
    if (!newList.trim()) return;
    setError(null);
    try {
      await createList(circleId, uid, newList);
      setNewList('');
      setAdding(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function copyCode() {
    await Clipboard.setStringAsync(c!.inviteCode);
    tapFeedback();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function shareCode() {
    Share.share({
      message: `Join our "${c!.name}" shopping circle on FamCart! Open the app, tap "Join with a code" and enter: ${c!.inviteCode}`,
    }).catch(() => {});
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: space.lg, gap: space.lg }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: c.name }} />

      <View style={{ gap: space.sm }}>
        <SectionTitle>Lists</SectionTitle>
        {lists.data.map((l) => (
          <Pressable
            key={l.id}
            onPress={() => router.push(`/circle/${circleId}/list/${l.id}`)}
            style={({ pressed }) => pressed && { opacity: 0.85 }}
          >
            <Card style={s.row}>
              <Text style={{ fontSize: 22 }}>📝</Text>
              <Text style={s.rowTitle}>{l.name}</Text>
              <Text style={{ fontSize: 24, color: colors.muted }}>›</Text>
            </Card>
          </Pressable>
        ))}
        {!lists.loading && lists.data.length === 0 ? <Text style={styles.muted}>No lists yet.</Text> : null}
        <ErrorText>{lists.error ?? error}</ErrorText>
        {adding ? (
          <View style={{ gap: space.sm }}>
            <Input
              value={newList}
              onChangeText={setNewList}
              placeholder="List name, e.g. Party, Medicines"
              autoFocus
              maxLength={40}
              onSubmitEditing={addList}
            />
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button title="Cancel" variant="secondary" onPress={() => setAdding(false)} style={{ flex: 1 }} />
              <Button title="Add list" onPress={addList} style={{ flex: 1 }} disabled={!newList.trim()} />
            </View>
          </View>
        ) : (
          <Button title="+ New list" variant="ghost" onPress={() => setAdding(true)} />
        )}
      </View>

      <View style={{ gap: space.sm }}>
        <SectionTitle>Members</SectionTitle>
        <Pressable onPress={() => router.push(`/circle/${circleId}/members`)}>
          <Card style={s.row}>
            <View style={{ flexDirection: 'row', flex: 1, flexWrap: 'wrap', gap: space.sm }}>
              {c.memberIds.map((id) => (
                <Avatar key={id} emoji={profiles.data[id]?.emoji} color={profiles.data[id]?.color} size={36} />
              ))}
            </View>
            <Text style={{ fontSize: 24, color: colors.muted }}>›</Text>
          </Card>
        </Pressable>
      </View>

      <Card style={{ gap: space.md, alignItems: 'center', backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }}>
        <Text style={[styles.label, { color: colors.primaryDark }]}>Invite your family with this code</Text>
        <Pressable onPress={copyCode} style={s.codeBox}>
          <Text style={s.code}>{c.inviteCode}</Text>
        </Pressable>
        <Text style={styles.muted}>{copied ? 'Copied!' : 'Tap the code to copy'}</Text>
        <Button title="Share invite" onPress={shareCode} style={{ alignSelf: 'stretch' }} />
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: colors.text },
  codeBox: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.xl,
  },
  code: { fontSize: 32, fontWeight: '800', letterSpacing: 8, color: colors.text },
});
