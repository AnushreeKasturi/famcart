import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMe } from '@/context/AuthContext';
import {
  deleteCircle,
  leaveCircle,
  regenerateInviteCode,
  removeMember,
  renameCircle,
  useCircle,
  useProfiles,
} from '@/lib/db';
import { confirm } from '@/lib/confirm';
import { Avatar, Button, Card, ErrorText, Input, Loading, SectionTitle, styles } from '@/components/ui';
import { colors, space } from '@/theme';

export default function Members() {
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const { uid } = useMe();
  const circle = useCircle(circleId);
  const profiles = useProfiles(circle.data?.memberIds ?? []);
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (circle.loading) return <Loading />;
  const c = circle.data;
  if (!c || !c.memberIds.includes(uid)) {
    return (
      <View style={styles.center}>
        <Button title="Back home" onPress={() => router.dismissTo('/')} />
      </View>
    );
  }
  const isOwner = c.ownerId === uid;

  async function run(key: string, fn: () => Promise<unknown>) {
    setError(null);
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const memberIds = [c.ownerId, ...c.memberIds.filter((id) => id !== c.ownerId)].filter((id) =>
    c.memberIds.includes(id),
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: space.lg, gap: space.lg }} keyboardShouldPersistTaps="handled">
      <View style={{ gap: space.sm }}>
        <SectionTitle>{c.memberIds.length} members</SectionTitle>
        {memberIds.map((id) => {
          const p = profiles.data[id];
          return (
            <Card key={id} style={s.row}>
              <Avatar emoji={p?.emoji} color={p?.color} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={s.name}>
                  {p?.name ?? '…'}
                  {id === uid ? ' (you)' : ''}
                </Text>
                {id === c.ownerId ? <Text style={styles.muted}>Owner</Text> : null}
              </View>
              {isOwner && id !== uid ? (
                <Button
                  title="Remove"
                  variant="danger"
                  loading={busy === id}
                  onPress={async () => {
                    if (await confirm('Remove member?', `${p?.name ?? 'They'} will lose access to this circle's lists.`, 'Remove', true)) {
                      run(id, () => removeMember(c.id, id));
                    }
                  }}
                />
              ) : null}
            </Card>
          );
        })}
      </View>

      <ErrorText>{error}</ErrorText>

      {isOwner ? (
        <View style={{ gap: space.sm }}>
          <SectionTitle>Circle settings</SectionTitle>
          <Input
            label="Name"
            value={name ?? c.name}
            onChangeText={setName}
            maxLength={40}
          />
          {name != null && name.trim() && name.trim() !== c.name ? (
            <Button title="Save name" loading={busy === 'rename'} onPress={() => run('rename', async () => { await renameCircle(c.id, name); setName(null); })} />
          ) : null}
          <Button
            title="Get a new invite code"
            variant="secondary"
            loading={busy === 'code'}
            onPress={async () => {
              if (await confirm('New invite code?', 'The old code will stop working. Existing members stay.', 'Change code')) {
                run('code', () => regenerateInviteCode(c, uid));
              }
            }}
          />
          <Button
            title="Delete circle"
            variant="danger"
            loading={busy === 'delete'}
            onPress={async () => {
              if (await confirm('Delete circle?', `This deletes "${c.name}" and all of its lists for everyone. This can't be undone.`, 'Delete', true)) {
                run('delete', async () => {
                  await deleteCircle(c);
                  router.dismissTo('/');
                });
              }
            }}
          />
        </View>
      ) : (
        <Button
          title="Leave circle"
          variant="danger"
          loading={busy === 'leave'}
          onPress={async () => {
            if (await confirm('Leave circle?', `You'll need a new invite code to rejoin "${c.name}".`, 'Leave', true)) {
              run('leave', async () => {
                await leaveCircle(c.id, uid);
                router.dismissTo('/');
              });
            }
          }}
        />
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
});
